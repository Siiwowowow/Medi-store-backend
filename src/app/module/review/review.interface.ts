// @ts-nocheck
export interface ICreateReviewPayload {
  medicineId: string;
  rating: number;
  comment?: string;
  orderId?: string;
}

export interface IUpdateReviewPayload {
  rating?: number;
  comment?: string;
}
