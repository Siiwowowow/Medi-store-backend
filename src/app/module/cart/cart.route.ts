import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { CartController } from "./cart.controller";
import { Role } from "../../types/enums";

const router = Router();

// All cart routes require CUSTOMER role
router.use(checkAuth(Role.CUSTOMER));

router.get("/", CartController.getCart);
router.post("/add", CartController.addToCart);
router.patch("/items/:itemId", CartController.updateCartItem);
router.delete("/items/:itemId", CartController.removeFromCart);
router.delete("/clear", CartController.clearCart);

export const CartRoutes = router;