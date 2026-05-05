import { z } from "zod";

const initiatePaymentValidationSchema = z.object({
  orderId: z.string("Order ID is required").min(1, "Order ID is required"),
});

export const PaymentValidation = {
  initiatePaymentValidationSchema,
};
