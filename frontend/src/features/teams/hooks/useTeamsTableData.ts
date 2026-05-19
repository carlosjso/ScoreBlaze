import { useQuery } from "@tanstack/react-query";

import { teamsQueryKeys, teamsService } from "@/features/teams/Teams.service";
import type { SortDir, SortKey } from "@/features/teams/Teams.types";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";

type UseTeamsTableDataParams = {
  page: number;
  search: string;
  sortKey: SortKey;
  sortDir: SortDir;
};

export function useTeamsTableData({
  page,
  search,
  sortKey,
  sortDir,
}: UseTeamsTableDataParams) {
  const query = useQuery({
    queryKey: teamsQueryKeys.table({
      page,
      pageSize: DEFAULT_TABLE_PAGE_SIZE,
      search,
      sortKey,
      sortDir,
    }),
    queryFn: ({ signal }) =>
      teamsService.getTablePage(
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
    teams: query.data?.items ?? [],
    page: query.data?.page ?? page,
    pageSize: query.data?.pageSize ?? DEFAULT_TABLE_PAGE_SIZE,
    totalItems: query.data?.totalItems ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    loading: query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
