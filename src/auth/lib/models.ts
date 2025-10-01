// Define UUID type for consistent usage
export type UUID = string;

// Language code type for user preferences
export type LanguageCode = 'en' | 'de' | 'es' | 'fr' | 'ja' | 'zh';

// Auth model representing the authentication session
export interface AuthModel {
  access_token: string;
  refresh_token?: string;
  token_expires?: number;
  token_type?: string;
}

export interface UserRoleModel {
  id: number;
  name: string;
  __entity?: string;
}

export interface UserStatusModel {
  id: number;
  name: string;
  __entity?: string;
}

// User model representing the user profile
export interface UserModel {
  id?: number | string;
  username?: string;
  password?: string; // Optional as we don't always retrieve passwords
  email: string;
  first_name?: string;
  last_name?: string;
  fullname?: string; // May be stored directly in metadata
  email_verified?: boolean;
  occupation?: string;
  company_name?: string; // Using snake_case consistently
  companyName?: string;
  phone?: string;
  phoneNumber?: string | null;
  provider?: string;
  socialId?: string | null;
  roles?: number[]; // Array of role IDs
  role?: UserRoleModel;
  status?: UserStatusModel;
  pic?: string;
  language?: LanguageCode; // Maintain existing type
  is_admin?: boolean; // Added admin flag
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}
