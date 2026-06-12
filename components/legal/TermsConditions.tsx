import React from "react";

const SECTIONS = [
  {
    title: "1. Naturaleza del Outlet y Carácter Final de la Venta",
    body: [
      "Botas Don Chuy Outlet comercializa artículos de temporadas anteriores, modelos descontinuados, piezas de exhibición o con existencia limitada que ya no forman parte del catálogo vigente de la marca. Cada pieza es única o de disponibilidad irrepetible; una vez agotada no hay reposición posible.",
      "El precio de outlet refleja precisamente esta condición: el comprador recibe un producto con excelente relación calidad-precio a cambio de aceptar las restricciones descritas en estos términos. Al finalizar la compra, la transacción se considera definitiva e irrevocable bajo las condiciones aquí establecidas.",
    ],
  },
  {
    title: "2. Política de No Devoluciones ni Cambios — Carácter Absoluto",
    body: [
      "Todas las ventas realizadas a través de este sitio web y en nuestro establecimiento físico son FINALES. Botas Don Chuy Outlet NO acepta devoluciones, cambios de talla, cambios de modelo, cancelaciones posteriores al pago ni reembolsos por ningún motivo, incluyendo de manera enunciativa, más no limitativa:",
      "• Cambio de opinión o arrepentimiento del comprador.\n• Error en la talla o modelo seleccionado por el comprador.\n• Discrepancia subjetiva entre las expectativas del comprador y el producto recibido.\n• Uso o desgaste del producto.\n• Preferencia por otro artículo.",
      "La razón fundamental de esta política es que los productos ofrecidos son modelos descontinuados sin existencias adicionales: no existe un artículo equivalente que entregar en sustitución, ni es posible reincorporar un producto devuelto al inventario activo de producción. Esta limitación es estructural e insuperable, no una política discrecional del comerciante.",
    ],
  },
  {
    title: "3. Excepciones por Defecto de Fabricación",
    body: [
      "Únicamente se atenderá un reporte cuando el producto presente un defecto de fabricación manifiesto, entendido como una falla en materiales o costura atribuible al proceso de producción y no al uso, almacenamiento o manejo del comprador.",
      "El reporte debe realizarse dentro de los 5 (cinco) días naturales siguientes a la recepción del pedido, enviando fotografías claras del defecto al correo de contacto indicado en la sección 'Contacto'. Transcurrido dicho plazo, se entenderá que el comprador recibió el producto a su entera satisfacción.",
      "La resolución de una reclamación por defecto de fabricación queda a discreción de Botas Don Chuy Outlet y podrá consistir en una nota de crédito, descuento en compra futura o, excepcionalmente, el reemplazo por otra pieza disponible en inventario, nunca en un reembolso monetario.",
    ],
  },
  {
    title: "4. Condición del Producto y Descripción",
    body: [
      "Cada artículo cuenta con descripción, fotografías y, cuando aplica, señalización de uso o pequeños detalles estéticos propios de su condición de outlet. Las fotografías son referenciales; pueden existir variaciones menores de tono por calibración de pantalla o condiciones de iluminación.",
      "El comprador reconoce que ha revisado toda la información disponible antes de concretar su compra y acepta el artículo en las condiciones descritas.",
    ],
  },
  {
    title: "5. Compras en Tienda Física",
    body: [
      "Las mismas condiciones de venta final aplican para compras realizadas en el establecimiento físico de Botas Don Chuy. Al momento de pagar en caja, el comprador confirma haber revisado el artículo en su presencia y aceptar su estado actual.",
      "No se realizan cambios ni devoluciones en tienda física por ninguno de los motivos enlistados en la sección 2. Se recomienda verificar la talla y el estado del producto antes de realizar el pago.",
    ],
  },
  {
    title: "6. Proceso de Compra en Línea",
    body: [
      "Al hacer clic en 'Continuar a datos de envío' el comprador declara haber leído y aceptado la totalidad de estos Términos y Condiciones. La aceptación del checkbox correspondiente tiene valor de consentimiento expreso e informado.",
      "El pedido queda confirmado una vez realizado el pago exitoso. Botas Don Chuy Outlet se reserva el derecho de cancelar un pedido por causas de fuerza mayor, error de precio manifiesto o falta de existencia verificada, en cuyo caso se emitirá un reembolso íntegro al mismo método de pago.",
    ],
  },
  {
    title: "7. Envíos",
    body: [
      "Los tiempos de entrega son estimados y pueden variar según la paquetería, la zona geográfica y factores externos fuera del control de Botas Don Chuy Outlet (fenómenos naturales, paros, demoras de aduanas, etc.). Los plazos indicados son referenciales, no contractuales.",
      "El riesgo de pérdida o daño del producto se transfiere al comprador en el momento en que la paquetería registra la entrega. Ante cualquier incidencia con el envío, el comprador deberá gestionar directamente con la empresa de paquetería utilizando el número de guía proporcionado.",
      "Botas Don Chuy Outlet únicamente es responsable de entregar el paquete a la paquetería en condiciones adecuadas de embalaje.",
    ],
  },
  {
    title: "8. Precios",
    body: [
      "Todos los precios se expresan en pesos mexicanos (MXN) e incluyen el IVA cuando aplique. Los precios de outlet son especiales, no negociables y pueden cambiar sin previo aviso hasta antes de confirmar el pago.",
    ],
  },
  {
    title: "9. Limitación de Responsabilidad",
    body: [
      "En la máxima medida permitida por la legislación mexicana aplicable, Botas Don Chuy Outlet no será responsable por daños indirectos, incidentales, especiales o consecuentes derivados del uso o incapacidad de uso de los productos adquiridos más allá del valor pagado por el artículo.",
    ],
  },
  {
    title: "10. Legislación Aplicable y Jurisdicción",
    body: [
      "Estos Términos y Condiciones se rigen por las leyes de los Estados Unidos Mexicanos, en particular la Ley Federal de Protección al Consumidor (PROFECO) y el Código de Comercio. Para cualquier controversia, las partes se someten a la jurisdicción de los tribunales competentes de la Ciudad de México o del domicilio del consumidor, a elección de este último.",
    ],
  },
  {
    title: "11. Modificaciones",
    body: [
      "Botas Don Chuy Outlet se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios entran en vigor al publicarse en este sitio. Las compras realizadas antes de la modificación se rigen por los términos vigentes en el momento de la transacción.",
    ],
  },
  {
    title: "Contacto",
    body: [
      "Para dudas sobre estos términos o para reportar un defecto de fabricación, escríbenos a través de nuestros canales de contacto disponibles en el pie de página del sitio.",
    ],
  },
];

export default function TermsConditions() {
  const lastUpdated = "12 de junio de 2026";

  return (
    <div className="min-h-screen bg-stone-950 py-16 px-4">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Header */}
        <header className="space-y-4 border-b border-amber-900/40 pb-10">
          <p className="text-xs tracking-[0.3em] uppercase text-amber-400/70">
            Botas Don Chuy Outlet
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-amber-50 leading-snug">
            Términos y Condiciones
          </h1>
          <p className="text-amber-100/40 text-sm">
            Última actualización: {lastUpdated}
          </p>
          <div className="mt-6 bg-amber-400/8 border border-amber-400/20 p-5 rounded-sm">
            <p className="text-amber-100/70 text-sm leading-relaxed">
              <span className="text-amber-400 font-medium">Importante:</span>{" "}
              Al realizar una compra en este sitio o en nuestra tienda física,
              aceptas de manera expresa e irrevocable los términos aquí
              descritos. Lee con atención la sección 2 antes de continuar.
            </p>
          </div>
        </header>

        {/* Outlet badge */}
        <div className="flex items-start gap-4 border border-amber-900/40 bg-stone-900/40 p-6">
          <div className="shrink-0 w-px self-stretch bg-amber-400/40" />
          <div className="space-y-2">
            <p className="font-serif text-lg text-amber-200">
              ¿Qué es un Outlet?
            </p>
            <p className="text-sm text-amber-100/60 leading-relaxed">
              Nuestro outlet reúne piezas de temporadas pasadas y modelos que ya
              no se producen — artículos con historia, carácter propio y precios
              accesibles. Son oportunidades únicas: cada par es irrepetible
              porque ya no existe en catálogo activo. Eso también implica que no
              hay existencias de respaldo para realizar cambios o devoluciones,
              condición que aceptas al momento de la compra.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map(({ title, body }) => (
            <section key={title} className="space-y-3">
              <h2 className="font-serif text-lg text-amber-200">{title}</h2>
              {body.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-sm text-amber-100/60 leading-relaxed whitespace-pre-line"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        {/* Footer note */}
        <div className="border-t border-amber-900/30 pt-8 text-center">
          <p className="text-xs text-amber-100/30 tracking-wide">
            © {new Date().getFullYear()} Botas Don Chuy. Todos los derechos
            reservados. Outlet de modelos descontinuados — venta final.
          </p>
        </div>
      </div>
    </div>
  );
}
