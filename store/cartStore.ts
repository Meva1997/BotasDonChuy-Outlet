"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MockProduct } from "@/db/mockProducts";

export interface CartItem {
  id: string;
  product: MockProduct;
  size: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: MockProduct, size: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
  savings: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, size) => {
        const id = `${product.id}-${size}`;
        const sizeStock = product.sizes.filter((s) => s === size).length;
        const existing = get().items.find((item) => item.id === id);
        if (existing) {
          if (existing.quantity >= sizeStock) return;
          set({
            items: get().items.map((item) =>
              item.id === id ? { ...item, quantity: item.quantity + 1 } : item
            ),
          });
        } else {
          set({ items: [...get().items, { id, product, size, quantity: 1 }] });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        const item = get().items.find((i) => i.id === id);
        if (!item) return;
        const sizeStock = item.product.sizes.filter((s) => s === item.size).length;
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, quantity: Math.min(quantity, sizeStock) } : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      totalItems: () =>
        get().items.reduce((acc, item) => acc + item.quantity, 0),

      subtotal: () =>
        get().items.reduce(
          (acc, item) => acc + item.product.originalPrice * item.quantity,
          0
        ),

      savings: () =>
        get().items.reduce(
          (acc, item) =>
            acc +
            (item.product.originalPrice - item.product.salePrice) *
              item.quantity,
          0
        ),
    }),
    {
      name: "botas-don-chuy-cart",
    }
  )
);
