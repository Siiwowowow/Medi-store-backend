import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { WishlistController } from "./wishlist.controller";
import { Role } from "../../types/enums";

const router = Router();

router.use(checkAuth(Role.CUSTOMER));

router.get("/", WishlistController.getWishlist);
router.post("/add", WishlistController.addToWishlist);
router.delete("/:id", WishlistController.removeFromWishlist);
router.delete("/clear/all", WishlistController.clearWishlist);

export const WishlistRoutes = router;