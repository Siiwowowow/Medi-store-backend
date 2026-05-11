// @ts-nocheck
import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth.js";
import { SellerController } from "./seller.controller.js";
import { Role } from "../../types/enums.js";

const router = Router();

// ==================== SELLER ROUTES (Self) ====================
router.get("/profile", checkAuth(Role.SELLER), SellerController.getSellerProfile);

// ==================== ADMIN ROUTES ====================
router.get("/all", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), SellerController.getAllSellers);  // 👈 NEW - All sellers together
router.get("/pending", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), SellerController.getPendingSellers);
router.get("/approved", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), SellerController.getApprovedSellers);
router.patch("/:id/approve", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), SellerController.approveSeller);
router.delete("/:id/reject", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), SellerController.rejectSeller);

export const SellerRoutes = router;
