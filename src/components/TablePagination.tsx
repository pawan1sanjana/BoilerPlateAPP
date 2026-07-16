import { pageBtnCls } from "@/lib/tableStyles";

interface TablePaginationProps {
  page: number;
  setPage: (updater: number | ((p: number) => number)) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalItems: number;
  pageSizeOptions?: number[];
}

export function TablePagination({
  page,
  setPage,
  pageSize,
  setPageSize,
  totalItems,
  pageSizeOptions = [10, 25, 50, 100],
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
  const start = (page - 1) * Math.max(1, pageSize);

  const pageNums = (() => {
    const max = 5;
    let s = Math.max(1, page - Math.floor(max / 2));
    let e = Math.min(totalPages, s + max - 1);
    if (e - s < max - 1) s = Math.max(1, e - max + 1);
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  })();

  if (totalItems === 0) return null;

  return (
    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 dark:bg-slate-900/50 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-3">
        <p className="text-xs text-gray-600 dark:text-slate-400">
          Showing <span className="font-semibold text-green-600 dark:text-green-400">{totalItems > 0 ? start + 1 : 0}</span> to{" "}
          <span className="font-semibold text-green-600 dark:text-green-400">{Math.min(start + pageSize, totalItems)}</span> of{" "}
          <span className="font-semibold text-gray-900 dark:text-slate-100">{totalItems}</span> entries
        </p>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 dark:text-slate-400 font-medium">Rows per page:</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value));
              setPage(1);
            }}
            className="px-2.5 py-1 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-md text-xs text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-600 dark:text-slate-400">Page</span>
          <input
            type="number"
            value={page}
            min="1"
            max={totalPages}
            onChange={(e) => {
              const p = parseInt(e.target.value);
              if (p >= 1 && p <= totalPages) setPage(p);
            }}
            className="w-14 px-2 py-1 text-center bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-md text-gray-900 dark:text-slate-100 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <span className="text-gray-600 dark:text-slate-400">of <span className="font-semibold text-gray-900 dark:text-slate-100">{totalPages}</span></span>
        </div>

        <div className="flex items-center gap-1.5">
          <button className={pageBtnCls} disabled={page === 1} onClick={() => setPage(1)} title="First page">⏮</button>
          <button className={`${pageBtnCls} px-3 text-xs font-medium`} disabled={page === 1} onClick={() => setPage(page - 1)}>◀ Prev</button>
          <div className="hidden sm:flex items-center gap-1">
            {pageNums.map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`px-3 py-1 text-xs rounded-md transition ${
                  n === page
                    ? "bg-green-600 text-white font-semibold border-transparent"
                    : "bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 text-gray-700 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-slate-800"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <button className={`${pageBtnCls} px-3 text-xs font-medium`} disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next ▶</button>
          <button className={pageBtnCls} disabled={page === totalPages} onClick={() => setPage(totalPages)} title="Last page">⏭</button>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 italic">
          💡 Enter page number to jump directly
        </p>
      </div>
    </div>
  );
}
