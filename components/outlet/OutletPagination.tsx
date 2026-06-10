"use client";

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
    <div className="flex items-center justify-center gap-1 mt-4">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-9 h-9 font-sans text-sm border transition-colors duration-200 ${
            page === currentPage
              ? "border-amber-400/60 text-amber-400 bg-amber-400/10"
              : "border-amber-400/20 text-amber-100/40 hover:border-amber-400/40 hover:text-amber-100/70"
          }`}
        >
          {page}
        </button>
      ))}
    </div>
  );
}
