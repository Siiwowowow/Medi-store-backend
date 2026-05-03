/* eslint-disable @typescript-eslint/no-explicit-any */
//src>app>module>admin>admin service
import statusCode from "http-status";  // 👈 rename to statusCode
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/queryBuilder";
import { IUpdateAdminPayload, IChangeUserRolePayload, IChangeUserStatusPayload } from "./admin.interface";
import AppError from "../../errorHelpers/AppError";
import { Role, UserStatus } from "../../../generated/prisma/enums";

const getAllAdmins = async () => {
    const admins = await prisma.admin.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    role: true,
                    status: true,
                    createdAt: true,
                }
            },
        }
    })
    return admins;
}

const getAdminById = async (id: string) => {
    const admin = await prisma.admin.findUnique({
        where: { id },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    role: true,
                    status: true,
                    createdAt: true,
                }
            },
        }
    })
    
    if (!admin) {
        throw new AppError(statusCode.NOT_FOUND, "Admin not found");
    }
    
    return admin;
}

const updateAdmin = async (id: string, payload: IUpdateAdminPayload, currentUser: IRequestUser) => {
    // ✅ Only SUPER_ADMIN can update admin users
    if (currentUser.role !== Role.SUPER_ADMIN) {
        throw new AppError(statusCode.FORBIDDEN, "Only SUPER_ADMIN can update admin users");
    }

    const isAdminExist = await prisma.admin.findUnique({
        where: { id },
        include: { user: true }
    })

    if (!isAdminExist) {
        throw new AppError(statusCode.NOT_FOUND, "Admin not found");
    }

    // ✅ Cannot update yourself
    if (isAdminExist.userId === currentUser.userId) {
        throw new AppError(statusCode.BAD_REQUEST, "You cannot update yourself");
    }

    const { admin } = payload;

    // Update admin profile
    const updatedAdmin = await prisma.admin.update({
        where: { id },
        data: {
            phoneNumber: admin?.contactNumber,
        },
        include: {
            user: true,
        }
    })

    // Update user name if provided
    if (admin?.name) {
        await prisma.user.update({
            where: { id: isAdminExist.userId },
            data: { name: admin.name, image: admin?.profilePhoto }
        })
    }

    return updatedAdmin;
}

// Soft delete admin user
const deleteAdmin = async (id: string, currentUser: IRequestUser) => {
    // ✅ Only SUPER_ADMIN can delete admin users
    if (currentUser.role !== Role.SUPER_ADMIN) {
        throw new AppError(statusCode.FORBIDDEN, "Only SUPER_ADMIN can delete admin users");
    }

    const isAdminExist = await prisma.admin.findUnique({
        where: { id },
        include: { user: true }
    })

    if (!isAdminExist) {
        throw new AppError(statusCode.NOT_FOUND, "Admin not found");
    }

    // ✅ Cannot delete yourself
    if (isAdminExist.userId === currentUser.userId) {
        throw new AppError(statusCode.BAD_REQUEST, "You cannot delete yourself");
    }

    const result = await prisma.$transaction(async (tx) => {
        // Update user - soft delete
        await tx.user.update({
            where: { id: isAdminExist.userId },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                status: UserStatus.DELETED
            },
        })

        // Delete sessions
        await tx.session.deleteMany({
            where: { userId: isAdminExist.userId }
        })

        // Delete accounts
        await tx.account.deleteMany({
            where: { userId: isAdminExist.userId }
        })

        // Get updated admin info
        const admin = await tx.admin.findUnique({
            where: { id },
            include: { user: true }
        })

        return admin;
    })

    return result;
}

const changeUserStatus = async (payload: IChangeUserStatusPayload, currentUser: IRequestUser) => {
    // ✅ Only SUPER_ADMIN and ADMIN can change user status
    if (currentUser.role !== Role.SUPER_ADMIN && currentUser.role !== Role.ADMIN) {
        throw new AppError(statusCode.FORBIDDEN, "You don't have permission to change user status");
    }
    
    const { userId, status } = payload;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });
    
    if (!user) {
        throw new AppError(statusCode.NOT_FOUND, "User not found");
    }
    
    // Prevent self-status change
    if (user.id === currentUser.userId) {
        throw new AppError(statusCode.BAD_REQUEST, "You cannot change your own status");
    }
    
    // ✅ ADMIN cannot change SUPER_ADMIN status
    if (currentUser.role === Role.ADMIN && user.role === Role.SUPER_ADMIN) {
        throw new AppError(statusCode.FORBIDDEN, "Admin cannot change SUPER_ADMIN status");
    }
    
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { status }
    });
    
    return updatedUser;
}

const changeUserRole = async (payload: IChangeUserRolePayload, currentUser: IRequestUser) => {
    // ✅ Only SUPER_ADMIN can change user roles
    if (currentUser.role !== Role.SUPER_ADMIN) {
        throw new AppError(statusCode.FORBIDDEN, "Only SUPER_ADMIN can change user roles");
    }
    
    const { userId, role } = payload;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });
    
    if (!user) {
        throw new AppError(statusCode.NOT_FOUND, "User not found");
    }
    
    // Prevent self-role change
    if (user.id === currentUser.userId) {
        throw new AppError(statusCode.BAD_REQUEST, "You cannot change your own role");
    }
    
    // Update user role
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role }
    });
    
    return updatedUser;
}

const getAllUsers = async (query: Record<string, unknown>) => {
    const userQuery = new QueryBuilder(prisma.user as any, query as any, {
        searchableFields: ['name', 'email'],
        filterableFields: ['role', 'status'],
    })
    .search()
    .filter()
    .sort()
    .paginate()
    .fields();
    
    const result = await userQuery.execute();
    return result;
}

export const AdminService = {
    getAllAdmins,
    getAdminById,
    updateAdmin,
    deleteAdmin,
    changeUserRole,
    changeUserStatus,
    getAllUsers
}