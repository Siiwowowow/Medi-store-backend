// backend/src/app/module/payment/payment.interface.ts

export interface ICreatePaymentIntent {
  orderId: string;
  amount: number;
  currency?: string;
}

export interface IConfirmPayment {
  paymentIntentId: string;
  orderId: string;
}

export interface IRefundPayment {
  paymentId: string;
  amount?: number;
  reason?: string;
}

export interface IPaymentResponse {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  clientSecret?: string;
  paymentIntentId?: string;
}