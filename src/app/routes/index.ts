import { Router } from "express";
import { AuthRouters } from "../module/auth/auth.route";
import { UserRoutes } from "../module/user/user.route";
import { AdminRoutes } from "../module/admin/admin.route";
import { CategoryRoutes } from "../module/category/category.route";
import { MedicineRoutes } from "../module/medicine/medicine.route";
import { OrderRoutes } from "../module/order/order.route";
import { CartRoutes } from "../module/cart/cart.route";
import { ReviewRoutes } from "../module/review/review.route";
import { SellerRoutes } from "../module/seller/seller.route";
import { DashboardRoutes } from "../module/dashboard/dashboard.route";
import { WishlistRoutes } from "../module/wishlist/wishlist.route";
import { SearchRoutes } from "../module/search/search.route";

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

export const IndexRoutes = router;