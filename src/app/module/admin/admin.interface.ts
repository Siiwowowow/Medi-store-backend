// @ts-nocheck
import { Role, UserStatus } from "../../types/enums.js";

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
