//src>app>module>order>order.route.ts
import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { OrderController } from "./order.controller";

const router = Router();

// ==================== CUSTOMER ROUTES ====================
router.post("/", checkAuth(Role.CUSTOMER), OrderController.createOrder);
router.get("/my-orders", checkAuth(Role.CUSTOMER), OrderController.getMyOrders);
router.get("/:id", checkAuth(Role.CUSTOMER, Role.SELLER, Role.ADMIN, Role.SUPER_ADMIN), OrderController.getOrderDetails);
router.patch("/:id/cancel", checkAuth(Role.CUSTOMER), OrderController.cancelOrder);

// ==================== SELLER ROUTES ====================
router.get("/seller/orders", checkAuth(Role.SELLER), OrderController.getSellerOrders);
router.get("/seller/stats", checkAuth(Role.SELLER), OrderController.getOrderStats);
router.patch("/seller/:id/status", checkAuth(Role.SELLER), OrderController.updateOrderStatus);

// ==================== ADMIN ROUTES ====================
router.get("/admin/all-orders", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), OrderController.getAllOrders);
router.patch("/admin/:id/status", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), OrderController.adminUpdateOrderStatus);

export const OrderRoutes = router;