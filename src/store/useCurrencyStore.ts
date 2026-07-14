import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'LKR'

interface CurrencyState {
  currency: Currency
  setCurrency: (c: Currency) => void
  getSymbol: () => string
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: 'USD',
      setCurrency: (currency) => set({ currency }),
      getSymbol: () => {
        const c = get().currency;
        if (c === 'LKR') return 'Rs';
        if (c === 'USD') return '$';
        if (c === 'EUR') return '€';
        if (c === 'GBP') return '£';
        if (c === 'INR') return '₹';
        return c;
      }
    }),
    {
      name: 'BoilerplateApp-currency'
    }
  )
)
