export interface ICreateOrderItem {
  medicineId: string;
  quantity: number;
}

export interface ICreateOrderPayload {
  items: ICreateOrderItem[];
  shippingAddress: string;
  phoneNumber: string;
  notes?: string;
}

export interface IUpdateOrderStatusPayload {
  status: 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
}

export interface IOrderFilters {
  status?: string;
  page?: number;
  limit?: number;
}