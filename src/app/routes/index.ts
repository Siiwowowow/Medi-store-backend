
import { Router } from "express";
import { AuthRouters } from "../module/auth/auth.route.js";
import { UserRoutes } from "../module/user/user.route.js";
import { AdminRoutes } from "../module/admin/admin.route.js";
import { CategoryRoutes } from "../module/category/category.route.js";
import { MedicineRoutes } from "../module/medicine/medicine.route.js";
import { OrderRoutes } from "../module/order/order.route.js";
import { CartRoutes } from "../module/cart/cart.route.js";
import { ReviewRoutes } from "../module/review/review.route.js";
import { SellerRoutes } from "../module/seller/seller.route.js";
import { DashboardRoutes } from "../module/dashboard/dashboard.route.js";
import { WishlistRoutes } from "../module/wishlist/wishlist.route.js";
import { SearchRoutes } from "../module/search/search.route.js";
import { PaymentRoutes } from "../module/payment/payment.route.js";

const router = Router();

router.use("/auth", AuthRouters);
router.use("/users", UserRoutes);
router.use("/admin", AdminRoutes);
router.use("/categories", CategoryRoutes);
router.use("/medicines", MedicineRoutes);
router.use("/orders", OrderRoutes);
router.use("/cart", CartRoutes);
router.use("/reviews", ReviewRoutes);
router.use("/seller", SellerRoutes);
router.use("/dashboard", DashboardRoutes);
router.use("/wishlist", WishlistRoutes);
router.use("/search", SearchRoutes);
router.use("/payment", PaymentRoutes);

export const IndexRoutes = router;
