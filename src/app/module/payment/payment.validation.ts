import { z } from "zod";

const initiatePaymentValidationSchema = z.object({
  orderId: z.string({ required_error: "Order ID is required" }).min(1, "Order ID is required"),
  paymentMethod: z.enum(["STRIPE", "COD"]).optional(),
});

export const PaymentValidation = {
  initiatePaymentValidationSchema,
};
