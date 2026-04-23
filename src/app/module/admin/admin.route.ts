import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AdminController } from "./admin.controller";
import { updateAdminZodSchema } from "./admin.validation";

const router = Router();

// Both SUPER_ADMIN and ADMIN can view admins
router.get("/", checkAuth(Role.SUPER_ADMIN, Role.ADMIN), AdminController.getAllAdmins);
router.get("/:id", checkAuth(Role.SUPER_ADMIN, Role.ADMIN), AdminController.getAdminById);

// Only SUPER_ADMIN can modify admins
router.patch("/:id", checkAuth(Role.SUPER_ADMIN), validateRequest(updateAdminZodSchema), AdminController.updateAdmin);
router.delete("/:id", checkAuth(Role.SUPER_ADMIN), AdminController.deleteAdmin);

// User management
router.patch("/change-user-status", checkAuth(Role.SUPER_ADMIN, Role.ADMIN), AdminController.changeUserStatus);
router.patch("/change-user-role", checkAuth(Role.SUPER_ADMIN), AdminController.changeUserRole);

export const AdminRoutes = router;