// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from "stripe";
import status from "http-status";
import { prisma } from "../../lib/prisma.js";
import { stripe } from "../../config/stripe.config.js";
import { envVars } from "../../config/env.js";
import AppError from "../../errorHelpers/AppError.js";
import { PaymentMethod, PaymentStatus } from "../../types/enums.js";



const initiatePayment = async (orderId: string, userId: string, paymentMethod: PaymentMethod = PaymentMethod.STRIPE) => {
  if (!orderId) {
    throw new AppError(status.BAD_REQUEST, "Order ID is required");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      customer: true,
    },
  });

  if (!order) {
    throw new AppError(status.NOT_FOUND, "Order not found");
  }

  // Check if order belongs to the user
  if (order.customer.userId !== userId) {
    throw new AppError(status.FORBIDDEN, "You do not have permission to pay for this order");
  }

  // Check if already paid
  const existingPayment = await prisma.payment.findUnique({
    where: { orderId },
  });

  if (existingPayment && existingPayment.status === PaymentStatus.COMPLETED) {
    throw new AppError(status.BAD_REQUEST, "This order is already paid");
  }

  const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Create or update payment record
  const payment = await prisma.payment.upsert({
    where: { orderId },
    update: {
      amount: order.totalAmount.toNumber(),
      transactionId,
      status: PaymentStatus.PENDING,
      paymentMethod: paymentMethod,
    },
    create: {
      orderId,
      customerId: order.customerId,
      amount: order.totalAmount.toNumber(),
      transactionId,
      status: PaymentStatus.PENDING,
      paymentMethod: paymentMethod,
    },
  });

  if (paymentMethod === PaymentMethod.STRIPE || !paymentMethod) {
    // Stripe has a minimum amount requirement (approx $0.50 USD). 
    // For BDT, 60-70 BDT is usually the safe minimum.
    const totalPoisha = order.items.reduce((acc: number, item: any) => acc + Math.round(item.unitPrice.toNumber() * 100) * item.quantity, 0);
    
    if (totalPoisha < 6000) { // 60 BDT minimum
      throw new AppError(status.BAD_REQUEST, "Stripe requires a minimum payment of ৳60. Please add more items or choose another payment method.");
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: order.items.map((item: any) => ({
          price_data: {
            currency: "bdt",
            product_data: {
              name: item.medicineName,
              images: item.medicineImage ? [item.medicineImage] : [],
            },
            unit_amount: Math.round(item.unitPrice.toNumber() * 100), // Stripe expects poisha
          },
          quantity: item.quantity,
        })),
        success_url: `${envVars.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
        cancel_url: `${envVars.FRONTEND_URL}/payment/cancel?orderId=${orderId}`,
        metadata: {
          orderId: order.id,
          paymentId: payment.id,
          transactionId,
        },
      });

      return {
        paymentUrl: session.url,
        sessionId: session.id,
      };
    } catch (stripeError: any) {
      console.error("Stripe Error:", stripeError);
      
      // Handle specific Stripe errors
      if (stripeError.type === 'StripeInvalidRequestError') {
        throw new AppError(status.BAD_REQUEST, stripeError.message);
      }
      
      throw new AppError(status.INTERNAL_SERVER_ERROR, "An error occurred while communicating with Stripe");
    }
  }

  if (paymentMethod === PaymentMethod.COD) {
    // For COD, we just return the success state immediately
    // The order status remains PENDING until processed by admin
    return {
      paymentUrl: `${envVars.FRONTEND_URL}/payment/success?orderId=${orderId}&paymentMethod=COD`,
      message: "Order placed successfully with Cash on Delivery",
    };
  }

  throw new AppError(status.BAD_REQUEST, "Invalid payment method.");
};

const verifyPayment = async (sessionId: string) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === "paid") {
    const orderId = session.metadata?.orderId;
    const paymentId = session.metadata?.paymentId;

    if (orderId && paymentId) {
      await prisma.$transaction(async (tx: any) => {
        const payment = await tx.payment.findUnique({ where: { id: paymentId } });
        
        if (payment && payment.status !== PaymentStatus.COMPLETED) {
          await tx.payment.update({
            where: { id: paymentId },
            data: {
              stripePaymentIntentId: session.payment_intent as string,
              status: PaymentStatus.COMPLETED,
              paymentGatewayData: session as any,
              paidAt: new Date(),
            },
          });

          await tx.order.update({
            where: { id: orderId },
            data: {
              status: "PROCESSING",
              paymentId: paymentId,
            },
          });
        }
      });
    }
    return { status: "PAID", orderId };
  }

  return { status: "PENDING" };
};

const handlerStripeWebhookEvent = async (event: any) => {
  const paymentIntentId = (event.data.object as any).payment_intent;

  if (paymentIntentId) {
    const existingPaymentProcessed = await prisma.payment.findFirst({
      where: {
        stripePaymentIntentId: paymentIntentId,
      },
    });

    if (existingPaymentProcessed && existingPaymentProcessed.status === PaymentStatus.COMPLETED) {
      console.log(`Event ${event.id} already processed. Skipping`);
      return { message: `Event ${event.id} already processed. Skipping` };
    }
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;

      const orderId = session.metadata?.orderId;
      const paymentId = session.metadata?.paymentId;

      if (!orderId || !paymentId) {
        console.error("Missing orderId or paymentId in session metadata");
        return { message: "Missing orderId or paymentId in session metadata" };
      }

      await prisma.$transaction(async (tx: any) => {
        // Update Payment record
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            stripePaymentIntentId: session.payment_intent as string,
            status: session.payment_status === "paid" ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
            paymentGatewayData: session as any,
            paidAt: session.payment_status === "paid" ? new Date() : null,
          },
        });

        // Update Order record
        if (session.payment_status === "paid") {
          await tx.order.update({
            where: { id: orderId },
            data: {
              status: "PROCESSING", // Move from PENDING to PROCESSING once paid
              paymentId: paymentId,
            },
          });
        }
      });

      console.log(`Processed checkout.session.completed for order ${orderId} and payment ${paymentId}`);
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as any;
      const paymentId = session.metadata?.paymentId;
      if (paymentId) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: PaymentStatus.FAILED, failureReason: "Checkout session expired" },
        });
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as any;
      const paymentId = intent.metadata?.paymentId;
      if (paymentId) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: intent.last_payment_error?.message || "Payment failed",
          },
        });
      }
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return { message: `Webhook Event ${event.id} processed successfully` };
};

export const PaymentService = {
  initiatePayment,
  handlerStripeWebhookEvent,
  verifyPayment,
};
