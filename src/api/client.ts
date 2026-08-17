const FINANCE_ACCOUNTS_STORAGE_KEY = 'espn_chart_of_accounts';

const INITIAL_FINANCE_ACCOUNTS = [
  { id: 'acc-1010', code: '1010', name: 'Cash on Hand', type: 'asset', isActive: true },
  { id: 'acc-1020', code: '1020', name: 'Main Bank Account', type: 'asset', isActive: true },
  { id: 'acc-1100', code: '1100', name: 'Accounts Receivable', type: 'asset', isActive: true },
  { id: 'acc-1400', code: '1400', name: 'Tea Stock Inventory', type: 'asset', isActive: true },
  { id: 'acc-2010', code: '2010', name: 'Accounts Payable', type: 'liability', isActive: true },
  { id: 'acc-2020', code: '2020', name: 'EPF/ETF Payable', type: 'liability', isActive: true },
  { id: 'acc-3010', code: '3010', name: 'Capital Equity', type: 'equity', isActive: true },
  { id: 'acc-3020', code: '3020', name: 'Retained Earnings', type: 'equity', isActive: true },
  { id: 'acc-4010', code: '4010', name: 'Made Tea Sales Income', type: 'income', isActive: true },
  { id: 'acc-4020', code: '4020', name: 'Green Leaf Sales Income', type: 'income', isActive: true },
  { id: 'acc-5010', code: '5010', name: 'Labor & Wage Expense', type: 'expense', isActive: true },
  { id: 'acc-5020', code: '5020', name: 'Fertilizer & Chemical Expense', type: 'expense', isActive: true },
  { id: 'acc-5100', code: '5100', name: 'Electricity Expense', type: 'expense', isActive: true },
];

function getStoredAccounts() {
  try {
    const raw = localStorage.getItem(FINANCE_ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem(FINANCE_ACCOUNTS_STORAGE_KEY, JSON.stringify(INITIAL_FINANCE_ACCOUNTS));
    return INITIAL_FINANCE_ACCOUNTS;
  } catch {
    return INITIAL_FINANCE_ACCOUNTS;
  }
}

function setStoredAccounts(accounts: any[]) {
  try {
    localStorage.setItem(FINANCE_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {}
}

const FINANCE_EXPENSES_STORAGE_KEY = 'espn_finance_expenses_v2';

const INITIAL_FINANCE_EXPENSES: any[] = [];

function getStoredExpenses() {
  try {
    const raw = localStorage.getItem(FINANCE_EXPENSES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    localStorage.setItem(FINANCE_EXPENSES_STORAGE_KEY, JSON.stringify(INITIAL_FINANCE_EXPENSES));
    return INITIAL_FINANCE_EXPENSES;
  } catch {
    return INITIAL_FINANCE_EXPENSES;
  }
}

function setStoredExpenses(expenses: any[]) {
  try {
    localStorage.setItem(FINANCE_EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
  } catch {}
}

const FINANCE_INCOME_STORAGE_KEY = 'espn_finance_income_v2';

const INITIAL_FINANCE_INCOME: any[] = [];

function getStoredIncome() {
  try {
    const raw = localStorage.getItem(FINANCE_INCOME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    localStorage.setItem(FINANCE_INCOME_STORAGE_KEY, JSON.stringify(INITIAL_FINANCE_INCOME));
    return INITIAL_FINANCE_INCOME;
  } catch {
    return INITIAL_FINANCE_INCOME;
  }
}

function setStoredIncome(incomeList: any[]) {
  try {
    localStorage.setItem(FINANCE_INCOME_STORAGE_KEY, JSON.stringify(incomeList));
  } catch {}
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export const apiClient = {
  post: async <T = any>(url: string, data: any): Promise<ApiResponse<T>> => {
    console.log('Mock API call to:', url, data);
    return new Promise((resolve) => {
      setTimeout(() => {
        if (url === '/finance/accounts') {
          const list = getStoredAccounts();
          const newAcct = {
            id: 'acc-' + Date.now(),
            code: String(data.code || ''),
            name: String(data.name || ''),
            type: String(data.type || 'expense'),
            isActive: data.isActive !== undefined ? Boolean(data.isActive) : true
          };
          const updated = [...list, newAcct];
          setStoredAccounts(updated);
          resolve({
            success: true,
            data: newAcct as any
          });
          return;
        }

        if (url === '/finance/expenses') {
          const accounts = getStoredAccounts();
          const matchedAcct = accounts.find((a: any) => String(a.id) === String(data.expenseAccountId));
          const list = getStoredExpenses();
          const newExp = {
            id: 'exp-' + Date.now(),
            expenseDate: data.expenseDate || new Date().toISOString().slice(0, 10),
            vendor: data.vendor || '',
            category: data.category || '',
            amount: Number(data.amount) || 0,
            paymentMethod: data.paymentMethod || 'Cash',
            reference: data.reference || '',
            notes: data.notes || '',
            expenseAccountId: data.expenseAccountId,
            expenseAccountCode: matchedAcct ? matchedAcct.code : '',
            expenseAccountName: matchedAcct ? matchedAcct.name : ''
          };
          const updated = [newExp, ...list];
          setStoredExpenses(updated);
          resolve({
            success: true,
            data: newExp as any
          });
          return;
        }

        if (url === '/finance/income') {
          const accounts = getStoredAccounts();
          const matchedAcct = accounts.find((a: any) => String(a.id) === String(data.incomeAccountId));
          const list = getStoredIncome();
          const newInc = {
            id: 'inc-' + Date.now(),
            incomeDate: data.incomeDate || new Date().toISOString().slice(0, 10),
            customer: data.customer || '',
            category: data.category || '',
            amount: Number(data.amount) || 0,
            paymentMethod: data.paymentMethod || 'Cash',
            reference: data.reference || '',
            notes: data.notes || '',
            incomeAccountId: data.incomeAccountId,
            incomeAccountCode: matchedAcct ? matchedAcct.code : '',
            incomeAccountName: matchedAcct ? matchedAcct.name : ''
          };
          const updated = [newInc, ...list];
          setStoredIncome(updated);
          resolve({
            success: true,
            data: newInc as any
          });
          return;
        }

        resolve({
          success: true,
          data: {
            content: [
              {
                type: 'text',
                text: 'This is a mock response from the Krushi AI. Connect a real backend to get actual agricultural advice.'
              }
            ]
          } as any
        });
      }, 300);
    });
  },
  get: async <T = any>(url: string): Promise<ApiResponse<T>> => {
    console.log('Mock API GET call to:', url);
    return new Promise((resolve) => {
      setTimeout(() => {
        if (url === '/finance/accounts') {
          resolve({
            success: true,
            data: getStoredAccounts() as any
          });
          return;
        }

        if (url === '/finance/expenses') {
          resolve({
            success: true,
            data: getStoredExpenses() as any
          });
          return;
        }

        if (url === '/finance/income') {
          resolve({
            success: true,
            data: getStoredIncome() as any
          });
          return;
        }

        if (url.startsWith('/estate-cop/daily-weekly-report')) {
          const expenses = getStoredExpenses();
          const incomeList = getStoredIncome();

          const totalInc = incomeList.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);

          const expCategories: Record<string, number> = {};
          expenses.forEach((e: any) => {
            const cat = e.category || 'General Expense';
            expCategories[cat] = (expCategories[cat] || 0) + (Number(e.amount) || 0);
          });

          const fieldExpenses = Object.keys(expCategories).map(cat => ({
            label: cat,
            monthly: expCategories[cat],
            todate: expCategories[cat]
          }));

          const incCategories: Record<string, number> = {};
          incomeList.forEach((i: any) => {
            const cat = i.category || 'General Income';
            incCategories[cat] = (incCategories[cat] || 0) + (Number(i.amount) || 0);
          });

          const sundryIncomeList = Object.keys(incCategories).map(cat => ({
            label: cat,
            monthly: incCategories[cat],
            todate: incCategories[cat]
          }));

          resolve({
            success: true,
            data: {
              code: 'EST-COP',
              crop: { monthly: 0, todate: 0 },
              leafIncome: { monthly: totalInc, todate: totalInc },
              sundryIncome: { monthly: 0, todate: 0 },
              fieldExpenses: fieldExpenses,
              sundryExpensesList: [],
              sundryIncomeList: sundryIncomeList,
              capitalExpenses: []
            } as any
          });
          return;
        }

        resolve({
          success: true,
          data: [] as any
        });
      }, 300);
    });
  },
  put: async <T = any>(url: string, data: any): Promise<ApiResponse<T>> => {
    console.log('Mock API PUT call to:', url, data);
    return new Promise((resolve) => {
      setTimeout(() => {
        if (url.startsWith('/finance/accounts/')) {
          const id = url.split('/').pop();
          const list = getStoredAccounts();
          const updated = list.map((a: any) => a.id === id ? { ...a, ...data } : a);
          setStoredAccounts(updated);
          resolve({
            success: true,
            data: data as any
          });
          return;
        }

        resolve({
          success: true,
          data: data as any
        });
      }, 300);
    });
  },
  delete: async <T = any>(url: string): Promise<ApiResponse<T>> => {
    console.log('Mock API DELETE call to:', url);
    return new Promise((resolve) => {
      setTimeout(() => {
        if (url.startsWith('/finance/accounts/')) {
          const id = url.split('/').pop();
          const list = getStoredAccounts();
          const updated = list.filter((a: any) => a.id !== id);
          setStoredAccounts(updated);
          resolve({
            success: true,
            data: null as any
          });
          return;
        }

        resolve({
          success: true,
          data: null as any
        });
      }, 300);
    });
  }
};

