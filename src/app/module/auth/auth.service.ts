/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { IChangePasswordPayload, ILoginUserPayload, IRegisterUserPayload } from "./auth.interface";
import { tokenUtils } from "../../utils/token";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import { JwtPayload } from "jsonwebtoken";
import { envVars } from "../../config/env";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { randomBytes } from "node:crypto";
import { Role, UserStatus } from "../../../generated/prisma/enums";

const SESSION_DURATION_MS = 60 * 60 * 24 * 1000;

// Resend OTP Function
const resendVerificationOTP = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found. Please register first.");
  }

  if (user.emailVerified) {
    throw new AppError(status.BAD_REQUEST, "Email already verified. Please login.");
  }

  if (user.isDeleted || user.status === UserStatus.DELETED || user.status === UserStatus.BLOCKED) {
    throw new AppError(status.FORBIDDEN, "Your account is not active.");
  }

  await auth.api.sendVerificationEmail({
    body: { email }
  });

  return {
    success: true,
    message: "New verification code sent to your email"
  };
};

// Main Register Function
const registerUSer = async (
  payload: IRegisterUserPayload,
  imageUrl?: string
) => {
  const {
    name,
    email,
    password,
    role = "CUSTOMER",
    shopName,
    shopAddress,
    phoneNumber,
    shippingAddress,
  } = payload;

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser && existingUser.emailVerified) {
    throw new AppError(status.CONFLICT, "Email already registered and verified. Please login.");
  }

  if (existingUser && !existingUser.emailVerified) {
    await auth.api.sendVerificationEmail({
      body: { email }
    });
    
    return {
      user: existingUser,
      token: null,
      accessToken: null,
      refreshToken: null,
      message: "Email already registered but not verified. New OTP sent to your email.",
      email: email,
    };
  }

  let data: any;

  try {
    data = await auth.api.signUpEmail({
      body: { name, email, password },
    });
  } catch (error: any) {
    throw new AppError(status.BAD_REQUEST, "Registration failed. Please try again.");
  }

  if (!data?.user) {
    throw new AppError(status.BAD_REQUEST, "Registration failed");
  }

  const userRole = role === "SELLER" ? Role.SELLER : Role.CUSTOMER;

  const user = await prisma.user.upsert({
    where: { email: data.user.email },
    update: {
      name: data.user.name,
      image: imageUrl ?? null,
      role: userRole,
      status: UserStatus.PENDING_VERIFICATION,
    },
    create: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      image: imageUrl ?? null,
      role: userRole,
      status: UserStatus.PENDING_VERIFICATION,
    },
  });

  if (role === "SELLER") {
    if (!shopName) {
      throw new AppError(status.BAD_REQUEST, "Shop name is required for seller");
    }

    const existingSeller = await prisma.seller.findUnique({
      where: { userId: user.id }
    });

    if (!existingSeller) {
      await prisma.seller.create({
        data: {
          userId: user.id,
          shopName,
          shopAddress: shopAddress || null,
          phoneNumber: phoneNumber || null,
          isApproved: false,
        },
      });
    }
  } else {
    const existingCustomer = await prisma.customer.findUnique({
      where: { userId: user.id }
    });

    if (!existingCustomer) {
      await prisma.customer.create({
        data: {
          userId: user.id,
          phoneNumber: phoneNumber || null,
          shippingAddress: shippingAddress || null,
        },
      });
    }
  }

  const accessToken = tokenUtils.getAccessToken({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    status: user.status,
    isDeleted: user.isDeleted,
    emailVerified: user.emailVerified,
    needPasswordChange: user.needPasswordChange,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    status: user.status,
    isDeleted: user.isDeleted,
    emailVerified: user.emailVerified,
    needPasswordChange: user.needPasswordChange,
  });

  return {
    user: { ...data.user, role: user.role },
    token: data.token,
    accessToken,
    refreshToken,
    message: "OTP sent to email. Please verify your email.",
    email: user.email,
  };
};

// Login Function
const loginUser = async (payload: ILoginUserPayload) => {
  const { email, password } = payload;

  const data = await auth.api.signInEmail({
    body: { email, password },
  });

  if (!data.user) {
    throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
  }

  const accessToken = tokenUtils.getAccessToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
    needPasswordChange: data.user.needPasswordChange,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
    needPasswordChange: data.user.needPasswordChange,
  });

  await prisma.account.updateMany({
    where: { userId: data.user.id, providerId: "credential" },
    data: {
      accessToken: accessToken,
      refreshToken: refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: data.user,
    token: data.token,
    accessToken,
    refreshToken,
  };
};

// 👇👇👇 THIS IS THE ONLY FUNCTION THAT NEEDS TO CHANGE 👇👇👇
// Get Current User - UPDATED with Seller Support
const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      emailVerified: true,
      needPasswordChange: true,
      isDeleted: true,
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  // 👇 ADD THIS BLOCK - Fetch seller data if user is SELLER
  if (user.role === "SELLER") {
    const seller = await prisma.seller.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        shopName: true,
        shopAddress: true,
        phoneNumber: true,
        isApproved: true,
      }
    });

    return {
      ...user,
      isSellerApproved: seller?.isApproved || false,
      sellerStatus: seller?.isApproved ? "APPROVED" : "PENDING",
      shopName: seller?.shopName,
      sellerId: seller?.id,
    };
  }

  return user;
};
// 👆👆👆 END OF CHANGED FUNCTION 👆👆👆

// Refresh Token
const getNewToken = async (refreshToken: string, sessionToken: string | undefined) => {
  const verifiedRefreshToken = jwtUtils.verifyToken(refreshToken, envVars.REFRESH_TOKEN_SECRET);

  if (!verifiedRefreshToken.success) {
    throw new AppError(status.UNAUTHORIZED, "Invalid refresh token");
  }

  const data = verifiedRefreshToken.data as JwtPayload;

  if (sessionToken) {
    const isSessionTokenExists = await prisma.session.findUnique({
      where: { token: sessionToken },
    });

    if (!isSessionTokenExists) {
      throw new AppError(status.UNAUTHORIZED, "Invalid session token");
    }
  }

  const newAccessToken = tokenUtils.getAccessToken({
    userId: data.userId,
    role: data.role,
    name: data.name,
    email: data.email,
    status: data.status,
    isDeleted: data.isDeleted,
    emailVerified: data.emailVerified,
    needPasswordChange: data.needPasswordChange,
  });

  const newRefreshToken = tokenUtils.getRefreshToken({
    userId: data.userId,
    role: data.role,
    name: data.name,
    email: data.email,
    status: data.status,
    isDeleted: data.isDeleted,
    emailVerified: data.emailVerified,
    needPasswordChange: data.needPasswordChange,
  });

  let updatedSessionToken = sessionToken;

  if (sessionToken) {
    const { token } = await prisma.session.update({
      where: { token: sessionToken },
      data: {
        token: sessionToken,
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
        updatedAt: new Date(),
      },
    });
    updatedSessionToken = token;
  }

  const decodedAccessToken: any = jwtUtils.verifyToken(newAccessToken, envVars.ACCESS_TOKEN_SECRET);
  const decodedRefreshToken: any = jwtUtils.verifyToken(newRefreshToken, envVars.REFRESH_TOKEN_SECRET);

  const accessTokenExpiresAt = decodedAccessToken.success && decodedAccessToken.data?.exp 
    ? new Date(decodedAccessToken.data.exp * 1000) 
    : new Date(Date.now() + 24 * 60 * 60 * 1000);

  const refreshTokenExpiresAt = decodedRefreshToken.success && decodedRefreshToken.data?.exp 
    ? new Date(decodedRefreshToken.data.exp * 1000) 
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.account.updateMany({
    where: { userId: data.userId, providerId: "credential" },
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresAt: accessTokenExpiresAt,
      refreshTokenExpiresAt: refreshTokenExpiresAt,
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    sessionToken: updatedSessionToken,
  };
};

// Change Password
const changePassword = async (
  payload: IChangePasswordPayload,
  sessionToken: string | undefined,
  authenticatedUserId: string
) => {
  const { currentPassword, newPassword } = payload;

  let user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
  let sessionId: string | null = null;

  if (sessionToken) {
    const sessionData = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (!sessionData?.user) {
      throw new AppError(status.UNAUTHORIZED, "Invalid session token");
    }
    if (sessionData.user.id !== authenticatedUserId) {
      throw new AppError(status.UNAUTHORIZED, "Session does not match user");
    }
    if (sessionData.expiresAt < new Date()) {
      throw new AppError(status.UNAUTHORIZED, "Session token has expired");
    }

    user = sessionData.user;
    sessionId = sessionData.id;
  } else {
    const u = await prisma.user.findUnique({ where: { id: authenticatedUserId } });
    if (!u) {
      throw new AppError(status.NOT_FOUND, "User not found");
    }
    user = u;
  }

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });

  if (!account?.password) {
    throw new AppError(status.BAD_REQUEST, "Account not found");
  }

  const passwordOk = await verifyPassword({
    hash: account.password,
    password: currentPassword,
  });
  if (!passwordOk) {
    throw new AppError(status.UNAUTHORIZED, "Current password is incorrect");
  }

  try {
    const hashedPassword = await hashPassword(newPassword);

    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashedPassword },
    });

    let newSessionToken: string | null = null;

    if (sessionId) {
      newSessionToken = randomBytes(32).toString("hex");
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          token: newSessionToken,
          expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
          updatedAt: new Date(),
        },
      });
      await prisma.session.deleteMany({
        where: { userId: user.id, token: { not: newSessionToken } },
      });
    } else {
      await prisma.session.deleteMany({
        where: { userId: user.id },
      });
    }

    if (user.needPasswordChange) {
      await prisma.user.update({
        where: { id: user.id },
        data: { needPasswordChange: false },
      });
    }

    const accessToken = tokenUtils.getAccessToken({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      status: user.status,
      isDeleted: user.isDeleted,
      emailVerified: user.emailVerified,
      needPasswordChange: user.needPasswordChange,
    });

    const refreshToken = tokenUtils.getRefreshToken({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      status: user.status,
      isDeleted: user.isDeleted,
      emailVerified: user.emailVerified,
      needPasswordChange: user.needPasswordChange,
    });

    const decodedAccessToken: any = jwtUtils.verifyToken(accessToken, envVars.ACCESS_TOKEN_SECRET);
    const decodedRefreshToken: any = jwtUtils.verifyToken(refreshToken, envVars.REFRESH_TOKEN_SECRET);

    const accessTokenExpiresAt = decodedAccessToken.success && decodedAccessToken.data?.exp 
      ? new Date(decodedAccessToken.data.exp * 1000) 
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const refreshTokenExpiresAt = decodedRefreshToken.success && decodedRefreshToken.data?.exp 
      ? new Date(decodedRefreshToken.data.exp * 1000) 
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.account.update({
      where: { id: account.id },
      data: {
        accessToken: accessToken,
        refreshToken: refreshToken,
        accessTokenExpiresAt: accessTokenExpiresAt,
        refreshTokenExpiresAt: refreshTokenExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      token: newSessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  } catch (error: unknown) {
    console.error("Password update error:", error);
    throw new AppError(status.BAD_REQUEST, "Failed to change password");
  }
};

// Logout
const logoutUser = async (sessionToken: string | undefined) => {
  let serverSessionRemoved = false;
  if (sessionToken) {
    const deleted = await prisma.session.deleteMany({
      where: { token: sessionToken },
    });
    serverSessionRemoved = deleted.count > 0;
  }

  return {
    loggedOut: true,
    serverSessionRemoved,
    cookiesCleared: ["accessToken", "refreshToken", "better-auth.session_token"] as const,
  };
};

// Verify Email
const verifyEmail = async (email: string, otp: string) => {
  const result = await auth.api.verifyEmailOTP({
    body: { email, otp },
  });

  if (!result.user) {
    throw new AppError(status.BAD_REQUEST, "Invalid OTP");
  }

  await prisma.user.update({
    where: { email },
    data: {
      emailVerified: true,
      status: UserStatus.ACTIVE,
    },
  });

  return {
    success: true,
    message: "Email verified successfully",
  };
};

// Forgot Password
const forgetPassword = async (email: string) => {
  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (!isUserExist) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (!isUserExist.emailVerified) {
    throw new AppError(status.BAD_REQUEST, "Email not verified");
  }

  if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED || isUserExist.status === UserStatus.BLOCKED) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  await auth.api.requestPasswordResetEmailOTP({
    body: { email },
  });
};

// Reset Password
const resetPassword = async (email: string, otp: string, newPassword: string) => {
  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (!isUserExist) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (!isUserExist.emailVerified) {
    throw new AppError(status.BAD_REQUEST, "Email not verified");
  }

  if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  await auth.api.resetPasswordEmailOTP({
    body: {
      email,
      otp,
      password: newPassword,
    },
  });

  if (isUserExist.needPasswordChange) {
    await prisma.user.update({
      where: { id: isUserExist.id },
      data: { needPasswordChange: false },
    });
  }

  await prisma.session.deleteMany({
    where: { userId: isUserExist.id },
  });
};

// Google Login Success
const googleLoginSuccess = async (session: Record<string, any>) => {
  const googleImage = session.user.image || session.user.picture || session.user.avatar || null;

  const user = await prisma.user.upsert({
    where: { id: session.user.id },
    update: {
      name: session.user.name,
      email: session.user.email,
      image: googleImage,
    },
    create: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: googleImage,
    },
  });

  const accessToken = tokenUtils.getAccessToken({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    status: user.status,
    isDeleted: user.isDeleted,
    emailVerified: user.emailVerified,
    needPasswordChange: user.needPasswordChange,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    status: user.status,
    isDeleted: user.isDeleted,
    emailVerified: user.emailVerified,
    needPasswordChange: user.needPasswordChange,
  });

  return {
    accessToken,
    refreshToken,
  };
};

// Export all
export const AuthService = {
  registerUSer,
  loginUser,
  getMe,
  getNewToken,
  changePassword,
  logoutUser,
  verifyEmail,
  forgetPassword,
  resetPassword,
  googleLoginSuccess,
  resendVerificationOTP,
};