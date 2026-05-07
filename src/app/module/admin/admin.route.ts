import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AdminController } from "./admin.controller";
import { updateAdminZodSchema } from "./admin.validation";
import { Role } from "../../types/enums";



const router = Router();

// Both SUPER_ADMIN and ADMIN can view admins
router.get("/", checkAuth(Role.SUPER_ADMIN, Role.ADMIN), AdminController.getAllAdmins);
// User management
router.get("/all-users", checkAuth(Role.SUPER_ADMIN, Role.ADMIN), AdminController.getAllUsers);
router.patch("/change-user-status", checkAuth(Role.SUPER_ADMIN, Role.ADMIN), AdminController.changeUserStatus);
router.patch("/change-user-role", checkAuth(Role.SUPER_ADMIN), AdminController.changeUserRole);

// Dynamic routes must be at the bottom
router.get("/:id", checkAuth(Role.SUPER_ADMIN, Role.ADMIN), AdminController.getAdminById);
router.patch("/:id", checkAuth(Role.SUPER_ADMIN), validateRequest(updateAdminZodSchema), AdminController.updateAdmin);
router.delete("/:id", checkAuth(Role.SUPER_ADMIN), AdminController.deleteAdmin);

export const AdminRoutes = router;