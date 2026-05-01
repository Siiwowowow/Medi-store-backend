// dashboard.routes.ts - Complete
//src/app/module/dashboard/dashboard.route.ts
import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { DashboardController } from "./dashboard.controller";

const router = Router();

// ==================== ADMIN ROUTES ====================
router.get(
  "/admin", 
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN), 
  DashboardController.getAdminDashboard
);

// ==================== SELLER ROUTES ====================

// Main dashboard
router.get(
  "/seller", 
  checkAuth(Role.SELLER), 
  DashboardController.getSellerDashboard
);

// Orders with pagination & filters
router.get(
  "/seller/orders", 
  checkAuth(Role.SELLER), 
  DashboardController.getSellerOrders
);

// Low stock products
router.get(
  "/seller/low-stock", 
  checkAuth(Role.SELLER), 
  DashboardController.getLowStockProducts
);

// Product performance analytics
router.get(
  "/seller/product-performance", 
  checkAuth(Role.SELLER), 
  DashboardController.getProductPerformance
);

// Category performance
router.get(
  "/seller/category-performance", 
  checkAuth(Role.SELLER), 
  DashboardController.getCategoryPerformance
);

export const DashboardRoutes = router;