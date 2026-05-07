import { Role } from "../types/enums";

export interface IRequestUser{
    userId : string;
    role : Role;
    email : string;
    emailVerified?: boolean; // 🔥 ADD THIS
    status?: string; 
    image?: string | null;
    isDeleted: boolean;        // optional but recommended
}