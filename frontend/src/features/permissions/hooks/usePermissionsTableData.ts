import { useQuery } from "@tanstack/react-query";

import { permissionsQueryKeys, permissionsService } from "@/features/permissions/Permissions.service";
import type { SortDir, SortKey } from "@/features/permissions/Permissions.types";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";

type UsePermissionsTableDataParams = {
  page: number;
  search: string;
  sortKey: SortKey;
  sortDir: SortDir;
};

export function usePermissionsTableData({
  page,
  search,
  sortKey,
  sortDir,
}: UsePermissionsTableDataParams) {
  const query = useQuery({
    queryKey: permissionsQueryKeys.table({
      page,
      pageSize: DEFAULT_TABLE_PAGE_SIZE,
      search,
      sortKey,
      sortDir,
    }),
    queryFn: ({ signal }) =>
      permissionsService.getTablePage(
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
    permissions: query.data?.items ?? [],
    page: query.data?.page ?? page,
    pageSize: query.data?.pageSize ?? DEFAULT_TABLE_PAGE_SIZE,
    totalItems: query.data?.totalItems ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    loading: query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
