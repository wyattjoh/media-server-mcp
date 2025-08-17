import { z } from "zod";

// Common MCP tool result interface
export interface MCPToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

// Generic pagination response interface
export interface PaginatedResponse<T> {
  data: T;
  total: number;
  returned: number;
  skip: number;
  limit: number | undefined;
}

// Common pagination schema
export const PaginationSchema = z.object({
  limit: z.number().optional().describe(
    "Maximum number of results to return",
  ),
  skip: z.number().optional().describe(
    "Number of results to skip (for pagination)",
  ),
});
