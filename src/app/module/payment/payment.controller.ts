/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import status from "http-status";
import { envVars } from "../../config/env";
import { stripe } from "../../config/stripe.config";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { PaymentService } from "./payment.service";

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.body;
  const userId = (req as any).user.id;

  const result = await PaymentService.initiatePayment(orderId, userId);

  sendResponse(res, {
    httpCode: status.OK,
    success: true,
    message: "Payment initiated successfully",
    data: result,
  });
});

const handleStripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;
  const webhookSecret = envVars.STRIPE?.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error("Missing Stripe signature or webhook secret");
    return res.status(status.BAD_REQUEST).json({ message: "Missing Stripe signature or webhook secret" });
  }

  let event;

  try {
    // Stripe requires the raw body for signature verification
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error: any) {
    console.error("Error constructing Stripe webhook event:", error);
    return res.status(status.BAD_REQUEST).json({ message: `Webhook Error: ${error.message}` });
  }

  const result = await PaymentService.handlerStripeWebhookEvent(event);

  // Stripe expects a 200 OK response to acknowledge receipt of the event
  res.status(status.OK).json(result);
});

export const PaymentController = {
  initiatePayment,
  handleStripeWebhook,
};