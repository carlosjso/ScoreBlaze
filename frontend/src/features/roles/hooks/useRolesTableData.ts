import { useQuery } from "@tanstack/react-query";

import { rolesQueryKeys, rolesService } from "@/features/roles/Roles.service";
import type { SortDir, SortKey } from "@/features/roles/Roles.types";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";

type UseRolesTableDataParams = {
  page: number;
  search: string;
  sortKey: SortKey;
  sortDir: SortDir;
};

export function useRolesTableData({
  page,
  search,
  sortKey,
  sortDir,
}: UseRolesTableDataParams) {
  const query = useQuery({
    queryKey: rolesQueryKeys.table({
      page,
      pageSize: DEFAULT_TABLE_PAGE_SIZE,
      search,
      sortKey,
      sortDir,
    }),
    queryFn: ({ signal }) =>
      rolesService.getTablePage(
        {
          page,
          pageSize: DEFAULT_TABLE_PAGE_SIZE,
          search,
          sortKey,
          sortDir,
        },
        signal,
      ),
  });

  return {
    roles: query.data?.items ?? [],
    page: query.data?.page ?? page,
    pageSize: query.data?.pageSize ?? DEFAULT_TABLE_PAGE_SIZE,
    totalItems: query.data?.totalItems ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    loading: query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
