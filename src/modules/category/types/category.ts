export interface CategoryReference {
  id: string;
  name: string;
  slug?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  parentId: string | null;
  parent?: CategoryReference | null;
  order: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CategoryListMeta {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface CategoryListResponse {
  data: Category[];
  meta?: CategoryListMeta;
}

export interface CategoryListQuery {
  page?: number;
  limit?: number;
  search?: string | null;
  isActive?: boolean | null;
}

export interface CategoryPayload {
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  parentId?: string | null;
  order?: number | null;
}
