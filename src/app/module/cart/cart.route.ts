import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { CartController } from "./cart.controller";

const router = Router();

// All cart routes require CUSTOMER role
router.use(checkAuth(Role.CUSTOMER));

router.get("/", CartController.getCart);
router.post("/add", CartController.addToCart);
router.patch("/items/:itemId", CartController.updateCartItem);
router.delete("/items/:itemId", CartController.removeFromCart);
router.delete("/clear", CartController.clearCart);

export const CartRoutes = router;