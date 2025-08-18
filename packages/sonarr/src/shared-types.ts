// Common sort direction
export type SortDirection = "asc" | "desc";

// Common sort options interface
export interface SortOptions<T> {
  field: T;
  direction: SortDirection;
}

// Generic pagination response interface
export interface PaginatedResponse<T> {
  data: T;
  total: number;
  returned: number;
  skip: number;
  limit: number | undefined;
}
