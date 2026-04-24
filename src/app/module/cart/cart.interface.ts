export interface IAddToCartPayload {
  medicineId: string;
  quantity: number;
}

export interface IUpdateCartPayload {
  quantity: number;
}

export interface ICartItemResponse {
  id: string;
  medicineId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;  // 👈 Allow null
  stock: number;
  subtotal: number;
}