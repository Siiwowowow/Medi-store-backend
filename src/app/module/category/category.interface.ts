export interface ICategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateCategoryPayload {
  name: string;
  description?: string;
  image?: string;
}

export interface IUpdateCategoryPayload {
  name?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}