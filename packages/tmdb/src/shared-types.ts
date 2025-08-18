// Generic pagination response interface
export interface PaginatedResponse<T> {
  data: T;
  total: number;
  returned: number;
  skip: number;
  limit: number | undefined;
}
