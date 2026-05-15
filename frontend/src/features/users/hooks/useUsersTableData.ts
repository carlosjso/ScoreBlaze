import { useQuery } from "@tanstack/react-query";

import { usersQueryKeys, usersService } from "@/features/users/Users.service";
import type { SortDir, SortKey } from "@/features/users/Users.types";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";

type UseUsersTableDataParams = {
  page: number;
  search: string;
  sortKey: SortKey;
  sortDir: SortDir;
};

export function useUsersTableData({
  page,
  search,
  sortKey,
  sortDir,
}: UseUsersTableDataParams) {
  const query = useQuery({
    queryKey: usersQueryKeys.table({
      page,
      pageSize: DEFAULT_TABLE_PAGE_SIZE,
      search,
      sortKey,
      sortDir,
    }),
    queryFn: ({ signal }) =>
      usersService.getTablePage(
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
    users: query.data?.items ?? [],
    page: query.data?.page ?? page,
    pageSize: query.data?.pageSize ?? DEFAULT_TABLE_PAGE_SIZE,
    totalItems: query.data?.totalItems ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    loading: query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
