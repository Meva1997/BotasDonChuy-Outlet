"use client";

import dynamic from "next/dynamic";

const Cart = dynamic(() => import("./Cart"), { ssr: false });

export default function CartProvider() {
  return <Cart />;
}
