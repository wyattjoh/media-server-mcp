// Common sort direction
export type SortDirection = "asc" | "desc";

// Common sort options interface
export interface SortOptions<T> {
  field: T;
  direction: SortDirection;
}
