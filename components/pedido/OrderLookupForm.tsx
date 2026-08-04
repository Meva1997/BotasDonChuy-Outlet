"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { fadeUp } from "@/lib/ui/motion";
import { TextField } from "@/components/ui/FormControls";
import { extractPublicOrderToken } from "@/lib/domain/publicOrderToken";

/**
 * Entrada a la página de seguimiento cuando no hay token en la URL (`/pedido`).
 *
 * El `publicToken` es un UUID opaco que nadie teclea de memoria, así que aquí NO
 * hay "buscar por número de pedido y correo": lo que se pide es el **código de
 * seguimiento** que el correo imprime a la vista, en su propia caja copiable (ver
 * `trackingPageSection` en `../backend/src/services/email/templates/orderConfirmation.ts`).
 * Antes se pedía el enlace, pero ése solo existía dentro del `href` del botón: para
 * obtenerlo había que saber hacer "copiar dirección del enlace" en el cliente de
 * correo. Tampoco se recuerda nada en el navegador — la credencial vive en el correo
 * (y en la URL), no en `localStorage`.
 *
 * La validación local es a propósito mínima y solo opina sobre la FORMA de lo
 * pegado: `extractPublicOrderToken` acepta el código pelón **y** la URL completa, y
 * tiene que seguir aceptando las dos — los correos ya enviados llevan solo el enlace,
 * y quien lo pegue desde uno viejo debe seguir entrando. Si el pedido existe o no lo
 * dice el 404 del backend, con su propia copia — el front nunca inventa un "pedido no
 * encontrado". Lo que esta comprobación evita es gastar una de las 30 consultas por
 * minuto en algo que no es ni un token.
 */
export default function OrderLookupForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = extractPublicOrderToken(value);
    if (!token) {
      setError(
        "Ese código no parece completo. Cópialo entero desde el correo de confirmación."
      );
      return;
    }
    setError(undefined);
    router.push(`/pedido/${token}`);
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      transition={{ duration: 0.5 }}
      className="max-w-md mx-auto px-6 py-16 sm:py-24 space-y-8"
    >
      <header className="text-center space-y-3">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-amber-600/30 bg-stone-900/60 text-amber-500">
          <Search width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <h1 className="font-serif text-3xl text-amber-50">
          Seguimiento de pedido
        </h1>
        <p className="text-sm text-amber-100/50 leading-relaxed">
          Pega aquí el código de seguimiento que te enviamos por correo al
          confirmar tu compra y te mostramos en qué va tu pedido.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <TextField
          id="order-code"
          label="Código de tu pedido"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
          value={value}
          error={error}
          onChange={(e) => {
            setValue(e.target.value);
            // El aviso deja de ser cierto en cuanto se corrige lo pegado.
            if (error) setError(undefined);
          }}
        />

        <button
          type="submit"
          className="btn-shimmer w-full text-xs tracking-[0.25em] uppercase rounded-md bg-linear-to-r from-amber-400 to-amber-600 text-stone-950 py-3.5 font-medium hover:brightness-110 transition-all shadow-[0_8px_24px_-8px_rgba(217,119,6,0.6)] cursor-pointer"
        >
          Ver mi pedido
        </button>
      </form>

      <div className="border-t border-amber-900/30 pt-6 space-y-3 text-center">
        <p className="text-xs text-amber-100/40 leading-relaxed">
          ¿No encuentras el correo? Revisa la carpeta de spam o correo no
          deseado: el asunto empieza con &ldquo;Confirmación de tu pedido&rdquo;.
        </p>
        <Link
          href="/outlet"
          className="inline-block text-xs tracking-[0.2em] uppercase text-amber-400/80 hover:text-amber-400 transition-colors"
        >
          Volver a la tienda
        </Link>
      </div>
    </motion.div>
  );
}
