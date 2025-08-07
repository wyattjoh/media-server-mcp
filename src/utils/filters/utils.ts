import type { SortOptions } from "../../types/filters.ts";

// Generic filter function for title matching (case-insensitive partial match)
export function filterByTitle<T extends { title: string }>(
  items: T[],
  title: string | undefined,
): T[] {
  if (!title) return items;
  const lowerTitle = title.toLowerCase();
  return items.filter((item) => item.title.toLowerCase().includes(lowerTitle));
}

// Generic filter function for genre matching
export function filterByGenres<T extends { genres?: string[] }>(
  items: T[],
  genres: string[] | undefined,
  matchAll = false,
): T[] {
  if (!genres || genres.length === 0) return items;

  return items.filter((item) => {
    if (!item.genres || item.genres.length === 0) return false;

    if (matchAll) {
      // All specified genres must be present
      return genres.every((genre) => item.genres!.includes(genre));
    } else {
      // At least one genre must match
      return genres.some((genre) => item.genres!.includes(genre));
    }
  });
}

// Generic filter function for year range
export function filterByYearRange<T extends { year: number }>(
  items: T[],
  yearFrom: number | undefined,
  yearTo: number | undefined,
): T[] {
  return items.filter((item) => {
    if (yearFrom !== undefined && item.year < yearFrom) return false;
    if (yearTo !== undefined && item.year > yearTo) return false;
    return true;
  });
}

// Generic filter function for tags
export function filterByTags<T extends { tags?: number[] }>(
  items: T[],
  tags: number[] | undefined,
  matchAll = false,
): T[] {
  if (!tags || tags.length === 0) return items;

  return items.filter((item) => {
    if (!item.tags || item.tags.length === 0) return false;

    if (matchAll) {
      // All specified tags must be present
      return tags.every((tag) => item.tags!.includes(tag));
    } else {
      // At least one tag must match
      return tags.some((tag) => item.tags!.includes(tag));
    }
  });
}

// Generic sort function
export function sortResults<T, K extends keyof T>(
  items: T[],
  sortOptions: SortOptions<K> | undefined,
): T[] {
  if (!sortOptions) return items;

  const { field, direction } = sortOptions;
  const multiplier = direction === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];

    // Handle undefined/null values
    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;

    // Compare based on type
    if (typeof aValue === "string" && typeof bValue === "string") {
      return aValue.localeCompare(bValue) * multiplier;
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * multiplier;
    }

    // For other types, convert to string and compare
    return String(aValue).localeCompare(String(bValue)) * multiplier;
  });
}
