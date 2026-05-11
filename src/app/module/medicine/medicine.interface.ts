// @ts-nocheck
export interface ICreateMedicinePayload {
  name: string;
  description: string;
  price: number;
  stock: number;
  manufacturer: string;
  genericName?: string;
  dosageForm?: string;
  strength?: string;
  categoryId?: string;
  image?: string;
}

export interface IUpdateMedicinePayload extends Partial<ICreateMedicinePayload> {
  isActive?: boolean;
}

export interface IMedicineFilters {
  search?: string;
  categoryId?: string;
  manufacturer?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  stock?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
}

export interface IUpdateMedicinePayload
  extends Partial<ICreateMedicinePayload> {
  isActive?: boolean;
}
export interface IMedicineFilters {
  search?: string;
  categoryId?: string;
  manufacturer?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  stock?: number;
  page?: number;
  limit?: number;
  sortBy?: string;      // 👈 Add this
  sortOrder?: 'asc' | 'desc';  // 👈 Add this
}
