import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table"

export interface ColumnDef<T> {
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  pagination?: PaginationState;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = "No results found.",
  pagination,
}: DataTableProps<T>) {
  const pageBtnCls = "p-1.5 rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-green-50 hover:border-green-400 hover:text-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:hover:border-slate-700";

  let pageNums: number[] = [];
  let totalPages = 1;

  if (pagination) {
    totalPages = Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize));
    const max = 5;
    let s = Math.max(1, pagination.page - Math.floor(max / 2));
    let e = Math.min(totalPages, s + max - 1);
    if (e - s < max - 1) s = Math.max(1, e - max + 1);
    pageNums = Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }

  const startRecord = pagination ? (pagination.page - 1) * pagination.pageSize + 1 : 1;
  const endRecord = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.totalCount) : data.length;

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
            <TableRow>
              {columns.map((col, index) => (
                <TableHead key={index} className={`whitespace-nowrap font-semibold ${col.headerClassName || ''}`}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500 font-medium">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  {columns.map((col, colIndex) => (
                    <TableCell key={colIndex} className={`whitespace-nowrap ${col.cellClassName || ''}`}>
                      {col.cell ? col.cell(row) : (col.accessorKey ? String(row[col.accessorKey] || '') : null)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {!loading && pagination && pagination.totalCount > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 dark:bg-slate-900/50 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-3">
            <p className="text-xs text-gray-600 dark:text-slate-400">
              Showing <span className="font-semibold text-green-600 dark:text-green-400">{startRecord}</span> to{" "}
              <span className="font-semibold text-green-600 dark:text-green-400">{endRecord}</span> of{" "}
              <span className="font-semibold text-gray-900 dark:text-slate-100">{pagination.totalCount}</span> entries
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 dark:text-slate-400 font-medium">Rows per page:</label>
              <select 
                value={pagination.pageSize} 
                onChange={(e) => pagination.onPageSizeChange(parseInt(e.target.value))}
                className="px-2.5 py-1 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-md text-xs text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
              >
                {[10, 15, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-600 dark:text-slate-400">Page</span>
              <input type="number" value={pagination.page} min="1" max={totalPages}
                onChange={(e) => { 
                  const p = parseInt(e.target.value); 
                  if (p >= 1 && p <= totalPages) pagination.onPageChange(p); 
                }}
                className="w-14 px-2 py-1 text-center bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-800 rounded-md text-gray-900 dark:text-slate-100 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
              <span className="text-gray-600 dark:text-slate-400">of <span className="font-semibold text-gray-900 dark:text-slate-100">{totalPages}</span></span>
            </div>

            <div className="flex items-center gap-1.5">
              <button className={pageBtnCls} disabled={pagination.page === 1} onClick={() => pagination.onPageChange(1)} title="First page">⏮</button>
              <button className={`${pageBtnCls} px-3 text-xs font-medium`} disabled={pagination.page === 1} onClick={() => pagination.onPageChange(pagination.page - 1)}>◀ Prev</button>
              <div className="hidden sm:flex items-center gap-1">
                {pageNums.map((n) => (
                  <button key={n} onClick={() => pagination.onPageChange(n)}
                    className={`px-3 py-1 text-xs rounded-md transition ${n === pagination.page ? "bg-green-600 text-white font-semibold border-transparent" : "bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 text-gray-700 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-slate-800"}`}>
                    {n}
                  </button>
                ))}
              </div>
              <button className={`${pageBtnCls} px-3 text-xs font-medium`} disabled={pagination.page === totalPages} onClick={() => pagination.onPageChange(pagination.page + 1)}>Next ▶</button>
              <button className={pageBtnCls} disabled={pagination.page === totalPages} onClick={() => pagination.onPageChange(totalPages)} title="Last page">⏭</button>
            </div>
            
            <p className="hidden lg:flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 italic">
              💡 Enter page number to jump directly
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
