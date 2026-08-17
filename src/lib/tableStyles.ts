// Shared style constants for fleet table/list views and their forms.

export const STATUS_CLASSES: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  Maintenance: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Inactive: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
};

export const formSelectCls =
  "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300";

export const filterSelectCls =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300";

export const pageBtnCls =
  "p-1.5 rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-green-50 hover:border-green-400 hover:text-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:hover:border-slate-700";
