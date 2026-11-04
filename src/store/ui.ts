import { create } from 'zustand';

export type TradeSeg = 'invoices' | 'returns' | 'parties';
export type InventorySeg = 'products' | 'categories' | 'brands';
export type AccountsSeg = 'vouchers' | 'accounts' | 'reports';

/**
 * Tab segment state lives here so other screens can deep-link into a segment
 * (Home › "To receive" opens Sales › Customers).
 */
type UiState = {
  salesSeg: TradeSeg;
  purchaseSeg: TradeSeg;
  inventorySeg: InventorySeg;
  accountsSeg: AccountsSeg;
  inventoryCategory: string | null;
  inventorySearch: string;
  toast: string | null;
  setSalesSeg: (s: TradeSeg) => void;
  setPurchaseSeg: (s: TradeSeg) => void;
  setInventorySeg: (s: InventorySeg) => void;
  setAccountsSeg: (s: AccountsSeg) => void;
  setInventoryFilter: (f: { category?: string | null; search?: string }) => void;
  showToast: (msg: string) => void;
  hideToast: () => void;
};

export const useUi = create<UiState>((set) => ({
  salesSeg: 'invoices',
  purchaseSeg: 'invoices',
  inventorySeg: 'products',
  accountsSeg: 'vouchers',
  inventoryCategory: null,
  inventorySearch: '',
  toast: null,
  setSalesSeg: (salesSeg) => set({ salesSeg }),
  setPurchaseSeg: (purchaseSeg) => set({ purchaseSeg }),
  setInventorySeg: (inventorySeg) => set({ inventorySeg }),
  setAccountsSeg: (accountsSeg) => set({ accountsSeg }),
  setInventoryFilter: ({ category, search }) =>
    set((s) => ({
      inventoryCategory: category !== undefined ? category : s.inventoryCategory,
      inventorySearch: search !== undefined ? search : s.inventorySearch,
    })),
  showToast: (toast) => set({ toast }),
  hideToast: () => set({ toast: null }),
}));

export const toast = (msg: string) => useUi.getState().showToast(msg);
