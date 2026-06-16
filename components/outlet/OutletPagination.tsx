"use client";

import { motion } from "framer-motion";

interface OutletPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function OutletPagination({
  currentPage,
  totalPages,
  onPageChange,
}: OutletPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-14">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
        const isActive = page === currentPage;
        return (
          <motion.button
            key={page}
            onClick={() => onPageChange(page)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.94 }}
            className={`relative w-9 h-9 font-sans text-sm border transition-colors duration-200 ${
              isActive
                ? "border-amber-400/70 text-amber-400 bg-amber-400/10"
                : "border-amber-400/20 text-amber-100/40 hover:border-amber-400/40 hover:text-amber-100/70"
            }`}
          >
            {page}
            {isActive && (
              <motion.span
                layoutId="outlet-pagination-active"
                className="absolute inset-0 border border-amber-400/70 -z-10"
                transition={{ duration: 0.3 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
