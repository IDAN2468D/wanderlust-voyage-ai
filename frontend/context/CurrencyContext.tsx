"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type CurrencyCode = "USD" | "ILS" | "EUR";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  hebrewName: string;
  flag: string;
  rateAgainstUSD: number; // e.g. 1 USD = 3.70 ILS, 1 USD = 0.92 EUR
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: "USD",
    symbol: "$",
    label: "USD $",
    hebrewName: "דולר אמריקאי",
    flag: "🇺🇸",
    rateAgainstUSD: 1.0,
  },
  ILS: {
    code: "ILS",
    symbol: "₪",
    label: "ILS ₪",
    hebrewName: "שקל חדש",
    flag: "🇮🇱",
    rateAgainstUSD: 3.70,
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    label: "EUR €",
    hebrewName: "אירו",
    flag: "🇪🇺",
    rateAgainstUSD: 0.92,
  },
};

interface CurrencyContextType {
  currency: CurrencyCode;
  currencyConfig: CurrencyConfig;
  setCurrency: (code: CurrencyCode) => void;
  convert: (amountInUsd: number | null | undefined, targetCode?: CurrencyCode) => number;
  convertToUsd: (amountInCurrentCurrency: number) => number;
  formatPrice: (amountInUsd: number | null | undefined, showCode?: boolean) => string;
  formatRaw: (amountInSelectedCurrency: number, showCode?: boolean) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = "wanderlust_preferred_currency";

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [isInitialized, setIsInitialized] = useState(false);

  // Load preferred currency from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
      if (saved && CURRENCIES[saved]) {
        setCurrencyState(saved);
      }
    } catch {
      // Ignore localStorage read errors (e.g. private mode)
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    if (!CURRENCIES[code]) return;
    setCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Ignore localStorage write errors
    }
  };

  const currencyConfig = CURRENCIES[currency] || CURRENCIES.USD;

  // Convert USD amount to target currency (defaults to currently selected)
  const convert = (amountInUsd: number | null | undefined, targetCode?: CurrencyCode): number => {
    if (amountInUsd === null || amountInUsd === undefined || isNaN(amountInUsd)) return 0;
    const target = targetCode ? CURRENCIES[targetCode] : currencyConfig;
    const rate = target ? target.rateAgainstUSD : 1.0;
    return Math.round(amountInUsd * rate);
  };

  // Convert amount from current currency back to USD (for backend API)
  const convertToUsd = (amountInCurrentCurrency: number): number => {
    if (!amountInCurrentCurrency || isNaN(amountInCurrentCurrency)) return 0;
    const rate = currencyConfig.rateAgainstUSD || 1.0;
    return Math.round(amountInCurrentCurrency / rate);
  };

  // Format a USD amount into the active currency string, e.g. ₪8,880 or €2,208
  const formatPrice = (amountInUsd: number | null | undefined, showCode = false): string => {
    if (amountInUsd === null || amountInUsd === undefined || isNaN(amountInUsd)) return "-";
    const converted = convert(amountInUsd);
    const formattedNum = converted.toLocaleString("he-IL");
    const sym = currencyConfig.symbol;
    const codeStr = showCode ? ` ${currencyConfig.code}` : "";

    // For ILS and USD, typically placed before/after cleanly
    return `${sym}${formattedNum}${codeStr}`;
  };

  // Format a number that is already in current currency
  const formatRaw = (amountInSelectedCurrency: number, showCode = false): string => {
    if (amountInSelectedCurrency === null || amountInSelectedCurrency === undefined || isNaN(amountInSelectedCurrency)) return "-";
    const formattedNum = Math.round(amountInSelectedCurrency).toLocaleString("he-IL");
    const sym = currencyConfig.symbol;
    const codeStr = showCode ? ` ${currencyConfig.code}` : "";
    return `${sym}${formattedNum}${codeStr}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencyConfig,
        setCurrency,
        convert,
        convertToUsd,
        formatPrice,
        formatRaw,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
