import { FastifyRequest } from 'fastify';

/**
 * Erweiterte Request-Typen für Fastify
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    username: string;
    isAdmin: boolean;
  };
}

/**
 * Standard API Response
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination-Parameter
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination-Response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
