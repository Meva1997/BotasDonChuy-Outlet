"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/ui/motion";

interface EmptyStateProps {
  title?: string;
  message?: string;
  // El sello es configurable desde la Fase 18: con una búsqueda activa el
  // catálogo SÍ tiene piezas, solo que ninguna empata, así que decir "Agotado"
  // mentiría sobre el inventario.
  stamp?: string;
  // Salida del estado vacío (hoy: el botón "Limpiar filtros").
  action?: React.ReactNode;
}

export default function EmptyState({
  title = "Sin productos disponibles",
  message = "No hay piezas en esta categoría por el momento.",
  stamp = "Agotado",
  action,
}: EmptyStateProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-24 gap-4"
    >
      {/* Decorative stamp */}
      <div className="border border-amber-400/20 px-6 py-2 rotate-[-4deg] mb-2">
        <span className="font-sans text-xs tracking-[0.4em] uppercase text-amber-400/30">
          {stamp}
        </span>
      </div>

      <h3 className="font-serif text-amber-50/60 text-xl">{title}</h3>
      <p className="font-sans text-amber-100/30 text-sm tracking-wide text-center max-w-xs">
        {message}
      </p>

      {action}
    </motion.div>
  );
}
