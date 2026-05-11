// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface QueryParams {
  searchTerm?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  fields?: string;
  include?: string;
  [key: string]: any;
}

export interface QueryConfig {
  searchableFields?: string[];
  filterableFields?: string[];
}

export interface QueryResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ModelDelegate<T> {
  findMany: (args: any) => Promise<T[]>;
  count: (args: any) => Promise<number>;
}
