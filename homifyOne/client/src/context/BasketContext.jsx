import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const BasketContext = createContext(null);

export function BasketProvider({ children }) {
  const [items,     setItems]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('basket') || '[]'); }
    catch { return []; }
  });
  const [allowance, setAllowance] = useState(0); // set when plot loads

  useEffect(() => {
    localStorage.setItem('basket', JSON.stringify(items));
  }, [items]);

  const subtotal    = items.reduce((sum, i) => sum + Number(i.price), 0);
  const remaining   = allowance - subtotal;
  const overBudget  = remaining < 0;
  const usedPct     = allowance > 0 ? Math.min((subtotal / allowance) * 100, 100) : 0;

  const addItem = useCallback((product) => {
    setItems(prev =>
      prev.find(p => p.name === product.name) ? prev : [...prev, product]
    );
  }, []);

  const removeItem = useCallback((productName) => {
    setItems(prev => prev.filter(p => p.name !== productName));
  }, []);

  const clearBasket = useCallback(() => setItems([]), []);

  const isInBasket = useCallback((productName) =>
    items.some(p => p.name === productName), [items]
  );

  return (
    <BasketContext.Provider value={{
      items, allowance, setAllowance,
      subtotal, remaining, overBudget, usedPct,
      addItem, removeItem, clearBasket, isInBasket,
    }}>
      {children}
    </BasketContext.Provider>
  );
}

export const useBasket = () => useContext(BasketContext);