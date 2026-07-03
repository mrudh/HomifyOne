import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useApp } from './AppContext';
import api from '../services/api';

const BasketContext = createContext(null);

function getReward() {
  try {
    const stored = localStorage.getItem('questionnaireReward');
    if (!stored) return null;
    const reward = JSON.parse(stored);
    if (reward.expiresAt && new Date(reward.expiresAt) < new Date()) return null;
    return reward;
  } catch {
    return null;
  }
}

function promoKey(plotId) {
  return `promoCode_${plotId}`;
}

export function BasketProvider({ children }) {
  const { selectedPlot } = useApp();

  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('basket') || '[]'); }
    catch { return []; }
  });

  const [allowance, setAllowance] = useState(0);
  const [reward, setReward] = useState(() => getReward());
  const [promo, setPromo]   = useState(null);
  const [orderSnapshot, setOrderSnapshot] = useState(null);
  const [orderChecked, setOrderChecked]   = useState(false);
  const plotId = selectedPlot?._id;

  useEffect(() => {
    setAllowance(Number(selectedPlot?.extrasAllowance) || 0);
  }, [selectedPlot]);

  useEffect(() => {
    localStorage.setItem('basket', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (!plotId) return;
    const stored = localStorage.getItem(promoKey(plotId));
    if (stored) {
      try { setPromo(JSON.parse(stored)); }
      catch { localStorage.removeItem(promoKey(plotId)); }
    }
  }, [plotId]);


  useEffect(() => {
    api.get('/selections/order')
      .then(r => setOrderSnapshot(r.data.order))
      .catch(() => setOrderSnapshot(null))
      .finally(() => setOrderChecked(true));
  }, [plotId]);


  const liveSubtotal = items.reduce((sum, i) => sum + Number(i.price), 0);

  const credit = reward?.credit > 0 ? Number(reward.credit) : 0;

  const afterCredit = Math.max(liveSubtotal - credit, 0);
  let liveDiscountAmount = 0;
  if (promo && afterCredit > 0) {
    liveDiscountAmount = promo.type === 'percent'
      ? Math.round(afterCredit * (promo.discount / 100))
      : promo.discount;
    if (promo.maxDiscount) liveDiscountAmount = Math.min(liveDiscountAmount, promo.maxDiscount);
    liveDiscountAmount = Math.min(liveDiscountAmount, afterCredit);
  }
  const liveFinalTotal = Math.max(afterCredit - liveDiscountAmount, 0);

  const hasSubmittedOrder = !!orderSnapshot;
  const subtotal = hasSubmittedOrder
    ? orderSnapshot.pricing.subtotal
    : liveSubtotal;
  const discountAmount = hasSubmittedOrder
    ? orderSnapshot.pricing.discountAmount
    : liveDiscountAmount;
  const finalTotal = hasSubmittedOrder
    ? orderSnapshot.pricing.finalTotal
    : liveFinalTotal;
  const effectiveAllowance = hasSubmittedOrder
    ? orderSnapshot.pricing.allowance
    : allowance;

  const remaining = effectiveAllowance - finalTotal;
  const overBudget = remaining < 0;
  const usedPct =
    effectiveAllowance > 0
      ? Math.min((finalTotal / effectiveAllowance) * 100, 100)
      : 0;

  const applyPromo = useCallback((promoData) => {
    setPromo(promoData);
    if (plotId) localStorage.setItem(promoKey(plotId), JSON.stringify(promoData));
  }, [plotId]);

  const removePromo = useCallback(() => {
    setPromo(null);
    if (plotId) localStorage.removeItem(promoKey(plotId));
  }, [plotId]);

  const refreshReward = useCallback(() => setReward(getReward()), []);

  const redeemReward = useCallback(() => {
    localStorage.removeItem('questionnaireReward');
    setReward(null);
    removePromo();
  }, [removePromo]);

  const addItem = useCallback((product) => {
    setItems(prev =>
      prev.find(p => p.name === product.name) ? prev : [...prev, product]
    );
  }, []);

  const removeItem = useCallback((productName) => {
    setItems(prev => prev.filter(p => p.name !== productName));
  }, []);

  const refreshOrderSnapshot = useCallback(() => {
    api.get('/selections/order')
      .then(r => setOrderSnapshot(r.data.order))
      .catch(() => setOrderSnapshot(null));
  }, []);

  const clearBasket = useCallback(() => {
    setItems([]);
    removePromo();
  }, [removePromo]);

  const isInBasket = useCallback((productName) =>
    items.some(p => p.name === productName), [items]
  );

  console.log('BASKET DEBUG', { subtotal, credit, afterCredit, discountAmount, finalTotal, promo, allowance });
  return (
    <BasketContext.Provider value={{
      items, allowance: effectiveAllowance, setAllowance,
      subtotal, remaining, overBudget, usedPct,
      reward, credit, refreshReward, redeemReward,
      promo, applyPromo, removePromo,
      discountAmount, finalTotal, afterCredit,
      addItem, removeItem, clearBasket, isInBasket,
      hasSubmittedOrder, orderChecked, refreshOrderSnapshot,
    }}>
      {children}
    </BasketContext.Provider>
  );
}

export const useBasket = () => useContext(BasketContext);