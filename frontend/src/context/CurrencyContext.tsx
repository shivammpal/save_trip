import { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';

type CurrencyType = 'USD' | 'INR';

interface CurrencyContextType {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
  formatCurrency: (amount: number, originalCurrency?: string) => string;
  convertToBase: (amount: number) => number;
  convertFromBase: (amount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  setCurrency: () => {},
  formatCurrency: (amount) => `$${amount}`,
  convertToBase: (amount) => amount,
  convertFromBase: (amount) => amount,
});

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<CurrencyType>('USD');

  const formatCurrency = (amount: number, originalCurrency = 'USD') => {
    let convertedAmount = amount;
    
    // Simple mock conversion logic
    if (originalCurrency === 'USD' && currency === 'INR') {
      convertedAmount = amount * 83;
    } else if (originalCurrency === 'INR' && currency === 'USD') {
      convertedAmount = amount / 83;
    } 
    // Ignore other original currencies for simplicity, just format them directly

    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(convertedAmount);
  };

  const convertToBase = (amount: number) => {
    return currency === 'INR' ? amount / 83 : amount;
  };

  const convertFromBase = (amount: number) => {
    return currency === 'INR' ? amount * 83 : amount;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, convertToBase, convertFromBase }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
