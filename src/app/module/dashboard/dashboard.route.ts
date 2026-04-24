import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { DashboardController } from "./dashboard.controller";

const router = Router();

router.get("/admin", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), DashboardController.getAdminDashboard);
router.get("/seller", checkAuth(Role.SELLER), DashboardController.getSellerDashboard);

export const DashboardRoutes = router;