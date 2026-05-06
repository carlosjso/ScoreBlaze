type PaginatorProps = {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
};

type PageToken = number | "...";

function getPageTokens(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

const pageButtonBaseClass =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-transparent px-1 text-sm font-medium text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-default disabled:opacity-30";

export function Paginator({
  currentPage,
  totalPages,
  onChange,
  className = "",
}: PaginatorProps) {
  const normalizedTotalPages = Math.max(1, totalPages);
  const normalizedCurrentPage = Math.min(Math.max(1, currentPage), normalizedTotalPages);
  const canGoBack = normalizedCurrentPage > 1;
  const canGoForward = normalizedCurrentPage < normalizedTotalPages;

  return (
    <nav
      aria-label="Paginacion"
      className={`flex flex-wrap items-center justify-center gap-1 ${className}`.trim()}
    >
      <button
        type="button"
        onClick={() => onChange(normalizedCurrentPage - 1)}
        disabled={!canGoBack}
        aria-label="Pagina anterior"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-default disabled:opacity-30"
      >
        <span aria-hidden="true">←</span>
        <span>Anterior</span>
      </button>

      <div className="mx-1 hidden h-[18px] w-px bg-slate-200 sm:block" />

      <div className="flex flex-wrap items-center justify-center gap-1">
        {getPageTokens(normalizedCurrentPage, normalizedTotalPages).map((token, index) =>
          token === "..." ? (
            <span key={`ellipsis-${index}`} className="px-1 text-sm text-slate-400">
              ...
            </span>
          ) : (
            <button
              key={token}
              type="button"
              onClick={() => onChange(token)}
              aria-label={`Pagina ${token}`}
              aria-current={token === normalizedCurrentPage ? "page" : undefined}
              className={
                token === normalizedCurrentPage
                  ? `${pageButtonBaseClass} border-orange-200 bg-orange-50 text-orange-700 shadow-sm hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700`
                  : pageButtonBaseClass
              }
            >
              {token}
            </button>
          ),
        )}
      </div>

      <div className="mx-1 hidden h-[18px] w-px bg-slate-200 sm:block" />

      <button
        type="button"
        onClick={() => onChange(normalizedCurrentPage + 1)}
        disabled={!canGoForward}
        aria-label="Pagina siguiente"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-default disabled:opacity-30"
      >
        <span>Siguiente</span>
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}
