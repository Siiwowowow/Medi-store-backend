import { Role } from "../../generated/prisma/enums";
import { envVars } from "../config/env";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

export const seedSuperAdmin = async () => {
  try {
    // ✅ CHECK IN ADMIN TABLE (BEST SOURCE OF TRUTH)
    const exists = await prisma.admin.findFirst({
      where: {
        email: envVars.SUPER_ADMIN_EMAIL,
      },
    });

    if (exists) {
      console.log("Super admin already exists. Skipping...");
      return;
    }

    // 1️⃣ CREATE USER
    const superAdminUser = await auth.api.signUpEmail({
      body: {
        email: envVars.SUPER_ADMIN_EMAIL,
        password: envVars.SUPER_ADMIN_PASSWORD,
        name: "Super Admin",
        role: Role.SUPER_ADMIN,
        needPasswordChange: false,
        rememberMe: false,
      },
    });

    if (!superAdminUser?.user?.id) {
      throw new Error("Failed to create super admin user");
    }

    // 2️⃣ CREATE ADMIN + USER UPDATE (ATOMIC)
    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: superAdminUser.user.id,
        },
        data: {
          emailVerified: true,
        },
      });

      const admin = await tx.admin.create({
        data: {
          name: "Super Admin",
          email: envVars.SUPER_ADMIN_EMAIL,
          userId: superAdminUser.user.id,
         
        },
      });

      return admin;
    });

    console.log("🔥 Super Admin Created Successfully:", result);
  } catch (error) {
    console.error("❌ Error seeding super admin:", error);
  }
};