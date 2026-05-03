import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AdminService } from "./admin.service";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { IChangeUserRolePayload, IChangeUserStatusPayload } from "./admin.interface";

const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.getAllAdmins();

    sendResponse(res, {
        httpCode: status.OK,
        success: true,
        message: "Admins fetched successfully",
        data: result,
    })
})

const getAdminById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const admin = await AdminService.getAdminById(id as string);

    sendResponse(res, {
        httpCode: status.OK,
        success: true,
        message: "Admin fetched successfully",
        data: admin,
    })
})

const updateAdmin = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const payload = req.body;
    const currentUser = req.user as IRequestUser;

    const updatedAdmin = await AdminService.updateAdmin(id as string, payload, currentUser);

    sendResponse(res, {
        httpCode: status.OK,
        success: true,
        message: "Admin updated successfully",
        data: updatedAdmin,
    })
})

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUser = req.user as IRequestUser;

    const result = await AdminService.deleteAdmin(id as string, currentUser);

    sendResponse(res, {
        httpCode: status.OK,
        success: true,
        message: "Admin deleted successfully",
        data: result,
    })
})

const changeUserStatus = catchAsync(async (req: Request, res: Response) => {
    const payload: IChangeUserStatusPayload = req.body;
    const currentUser = req.user as IRequestUser;
    
    const result = await AdminService.changeUserStatus(payload, currentUser);
    
    sendResponse(res, {
        httpCode: status.OK,
        success: true,
        message: "User status updated successfully",
        data: result,
    })
});

const changeUserRole = catchAsync(async (req: Request, res: Response) => {
    const payload: IChangeUserRolePayload = req.body;
    const currentUser = req.user as IRequestUser;
    
    const result = await AdminService.changeUserRole(payload, currentUser);
    
    sendResponse(res, {
        httpCode: status.OK,
        success: true,
        message: "User role updated successfully",
        data: result,
    })
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.getAllUsers(req.query);

    sendResponse(res, {
        httpCode: status.OK,
        success: true,
        message: "Users fetched successfully",
        data: result.data,
        meta: result.meta,
    })
});

export const AdminController = {
    getAllAdmins,
    updateAdmin,
    deleteAdmin,
    getAdminById,
    changeUserStatus,
    changeUserRole,
    getAllUsers
}