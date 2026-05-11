// @ts-nocheck
import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth.js";
import { WishlistController } from "./wishlist.controller.js";
import { Role } from "../../types/enums.js";

const router = Router();

router.use(checkAuth(Role.CUSTOMER));

router.get("/", WishlistController.getWishlist);
router.post("/add", WishlistController.addToWishlist);
router.delete("/:id", WishlistController.removeFromWishlist);
router.delete("/clear/all", WishlistController.clearWishlist);

export const WishlistRoutes = router;
