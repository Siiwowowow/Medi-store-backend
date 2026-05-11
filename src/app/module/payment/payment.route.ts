// @ts-nocheck
import { Router } from "express";
import { PaymentController } from "./payment.controller.js";
import { checkAuth } from "../../middleware/checkAuth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { PaymentValidation } from "./payment.validation.js";
import { Role } from "../../types/enums.js";

const router = Router();

// Route to initiate payment session
router.post(
  "/initiate",
  checkAuth(Role.CUSTOMER),
  validateRequest(PaymentValidation.initiatePaymentValidationSchema),
  PaymentController.initiatePayment
);

// Stripe Webhook route - needs raw body, handled in app.ts or with specific middleware
router.post(
  "/webhook",
  PaymentController.handleStripeWebhook
);

router.get(
  "/verify",
  checkAuth(Role.CUSTOMER),
  PaymentController.verifyPayment
);

export const PaymentRoutes = router;
