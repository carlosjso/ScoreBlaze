import { z, type ZodTypeAny } from "zod";

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export function buildPaginatedResponseSchema<TSchema extends ZodTypeAny>(itemSchema: TSchema) {
  return z
    .object({
      items: z.array(itemSchema),
      page: z.coerce.number().int().min(1),
      page_size: z.coerce.number().int().min(1),
      total_items: z.coerce.number().int().min(0),
      total_pages: z.coerce.number().int().min(1),
    })
    .transform(
      (value): PaginatedResponse<z.infer<TSchema>> => ({
        items: value.items,
        page: value.page,
        pageSize: value.page_size,
        totalItems: value.total_items,
        totalPages: value.total_pages,
      }),
    );
}
