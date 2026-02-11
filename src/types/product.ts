// Product types untuk frontend
export interface Product {
  sui_object_id: string;
  name: string;
  price_per_unit: string; // BigInt as string
  stock: string; // BigInt as string
  farmer_address: string;
  image_url: string;
  image_cid?: string;
  description: string;
  category: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// IPFS Upload Response
export interface IPFSUploadResponse {
  success: boolean;
  cid: string;
  url: string;
  size: number;
  name: string;
}

// Product Sync Request
export interface ProductSyncRequest {
  sui_object_id: string;
  name: string;
  price_per_unit: number | string;
  stock: number | string;
  farmer_address: string;
  image_url: string;
  image_cid?: string;
  description: string;
  category: string;
}

// Product List Response
export interface ProductListResponse {
  success: boolean;
  products: Product[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Categories
export const PRODUCT_CATEGORIES = [
  "Vegetables",
  "Fruits",
  "Grains",
  "Spices",
  "Tubers",
  "Others",
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];
