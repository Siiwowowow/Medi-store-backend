// @ts-nocheck
import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth.js";
import { CartController } from "./cart.controller.js";
import { Role } from "../../types/enums.js";

const router = Router();

// All cart routes require CUSTOMER role
router.use(checkAuth(Role.CUSTOMER));

router.get("/", CartController.getCart);
router.post("/add", CartController.addToCart);
router.patch("/items/:itemId", CartController.updateCartItem);
router.delete("/items/:itemId", CartController.removeFromCart);
router.delete("/clear", CartController.clearCart);

export const CartRoutes = router;
