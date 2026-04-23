import { Role, UserStatus } from "../../../generated/prisma/enums"; // 👈 Capital U

export interface IUpdateAdminPayload {
    admin?: {
        name?: string;
        profilePhoto?: string;
        contactNumber?: string;
    }
}

export interface IChangeUserStatusPayload {
    userId: string;
    status: UserStatus; // 👈 Capital U
}

export interface IChangeUserRolePayload {
    userId: string;
    role: Role;
}