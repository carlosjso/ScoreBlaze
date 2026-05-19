import { useQuery } from "@tanstack/react-query";

import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import type { SortDir, SortKey } from "@/features/leagues/Leagues.types";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";

type UseLeaguesTableDataParams = {
  page: number;
  search: string;
  sortKey: SortKey;
  sortDir: SortDir;
};

export function useLeaguesTableData({
  page,
  search,
  sortKey,
  sortDir,
}: UseLeaguesTableDataParams) {
  const leaguesQuery = useQuery({
    queryKey: leaguesQueryKeys.table({
      page,
      pageSize: DEFAULT_TABLE_PAGE_SIZE,
      search,
      sortKey,
      sortDir,
    }),
    queryFn: ({ signal }) =>
      leaguesService.getTablePage(
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
    leagues: leaguesQuery.data?.items ?? [],
    page: leaguesQuery.data?.page ?? page,
    pageSize: leaguesQuery.data?.pageSize ?? DEFAULT_TABLE_PAGE_SIZE,
    totalItems: leaguesQuery.data?.totalItems ?? 0,
    totalPages: leaguesQuery.data?.totalPages ?? 1,
    loading: leaguesQuery.isPending,
    error: leaguesQuery.error instanceof Error ? leaguesQuery.error.message : null,
  };
}
