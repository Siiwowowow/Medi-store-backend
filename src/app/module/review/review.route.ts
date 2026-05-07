import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { ReviewController } from "./review.controller";
import { Role } from "../../types/enums";

const router = Router();

// ==================== PUBLIC ROUTES ====================
router.get("/medicine/:medicineId", ReviewController.getMedicineReviews);

// ==================== CUSTOMER ROUTES ====================
router.post("/", checkAuth(Role.CUSTOMER), ReviewController.createReview);
router.patch("/:id", checkAuth(Role.CUSTOMER), ReviewController.updateReview);
router.delete("/:id", checkAuth(Role.CUSTOMER), ReviewController.deleteReview);

// ==================== ADMIN ROUTES ====================
router.delete("/admin/:id", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), ReviewController.deleteReviewAsAdmin);

export const ReviewRoutes = router;