import React from "react";

const SECTIONS = [
  {
    title: "1. Cobertura de Envíos",
    body: [
      "Botas Don Chuy Outlet realiza envíos únicamente al interior de la República Mexicana. No se realizan envíos internacionales, a apartados postales ni a zonas de difícil acceso no cubiertas por las paqueterías con las que operamos.",
      "Si tu municipio o localidad no aparece como destino disponible al ingresar tu dirección en el proceso de compra, lamentablemente no podemos procesar tu pedido. Te recomendamos contactarnos para explorar alternativas.",
    ],
  },
  {
    title: "2. Tiempos de Entrega Estimados",
    body: [
      "Los tiempos de entrega son referenciales y pueden variar según la zona geográfica, la paquetería asignada y factores externos fuera de nuestro control:",
      "• Zona Metropolitana (CDMX, Monterrey, Guadalajara): 2 a 4 días hábiles.\n• Ciudades principales (Puebla, Querétaro, León, Tijuana, etc.): 3 a 5 días hábiles.\n• Ciudades intermedias y municipios: 4 a 7 días hábiles.\n• Zonas rurales o de acceso limitado: 7 a 12 días hábiles.",
      "Los tiempos se cuentan a partir de la confirmación de pago, no desde la fecha del pedido. Periodos de alta demanda (Buen Fin, Navidad, Día de las Madres) pueden extender los plazos hasta un 50% adicional. Los plazos indicados son estimados, no compromisos contractuales.",
    ],
  },
  {
    title: "3. Costos de Envío",
    body: [
      "El costo de envío se calcula automáticamente en el proceso de pago en función del peso del paquete, las dimensiones y la zona de destino. El monto exacto se muestra antes de confirmar la compra.",
      "Botas Don Chuy Outlet se reserva el derecho de modificar las tarifas de envío en cualquier momento. El costo vigente al momento de confirmar tu pago es el que aplica a tu pedido.",
    ],
  },
  {
    title: "4. Preparación y Despacho del Pedido",
    body: [
      "Una vez confirmado el pago, el pedido entra a proceso de preparación. El tiempo de empaque y despacho es de 1 a 2 días hábiles.",
      "Recibirás un correo electrónico con el número de guía y la paquetería asignada en cuanto tu pedido sea entregado al servicio de mensajería. Si no recibes este correo en 48 horas hábiles tras tu pago, revisa la carpeta de spam o contáctanos.",
    ],
  },
  {
    title: "5. Rastreo del Pedido",
    body: [
      "Con el número de guía proporcionado podrás rastrear tu pedido directamente en el sitio web de la paquetería asignada. Botas Don Chuy Outlet no tiene acceso en tiempo real al estatus de entrega más allá de la información pública disponible en dichas plataformas.",
      "Si el rastreo muestra que tu pedido lleva más de 5 días sin movimiento, te recomendamos contactar primero a la paquetería y posteriormente a nosotros si el problema persiste.",
    ],
  },
  {
    title: "6. Responsabilidad en la Entrega",
    body: [
      "El riesgo de pérdida o daño del producto se transfiere al comprador en el momento en que la paquetería registra la recolección del paquete en nuestras instalaciones.",
      "Botas Don Chuy Outlet es responsable de entregar el paquete a la paquetería debidamente embalado y en las condiciones acordadas. Cualquier incidencia ocurrida durante el trayecto — robo, extravío, daño en tránsito — deberá ser gestionada directamente por el comprador con la empresa de mensajería utilizando el número de guía proporcionado.",
      "Si el paquete llega con daños visibles en el embalaje exterior, fotografíalo antes de abrirlo y reporta el incidente inmediatamente a la paquetería al momento de la entrega.",
    ],
  },
  {
    title: "7. Dirección de Entrega y Responsabilidad del Comprador",
    body: [
      "El comprador es responsable de proporcionar una dirección de entrega completa, correcta y accesible. Esto incluye calle, número exterior e interior (si aplica), colonia, municipio, estado y código postal.",
      "Botas Don Chuy Outlet no se hace responsable por retrasos o no entregas derivados de una dirección incorrecta, incompleta o ilegible proporcionada por el comprador. Los costos de reenvío por dirección errónea corren a cargo del comprador.",
      "Asegúrate de que haya alguien disponible para recibir el paquete en el domicilio indicado. Si la paquetería realiza dos intentos de entrega fallidos, el paquete puede ser devuelto a nuestras instalaciones. El reenvío generará un costo adicional.",
    ],
  },
  {
    title: "8. Paquetes No Entregados o Devueltos",
    body: [
      "Si un paquete es devuelto a nuestras instalaciones por causa imputable al comprador (dirección incorrecta, ausencia reiterada, rechazo de paquete, etc.), el comprador deberá cubrir los gastos de un segundo envío para recibir su pedido.",
      "En ningún caso procederá un reembolso por paquetes devueltos debido a causas imputables al comprador, de conformidad con la política de venta final establecida en los Términos y Condiciones.",
    ],
  },
  {
    title: "9. Restricciones y Causas de Fuerza Mayor",
    body: [
      "Los tiempos de entrega pueden verse afectados por situaciones fuera del control de Botas Don Chuy Outlet y de las paqueterías, tales como: fenómenos meteorológicos, paros de transporte, contingencias sanitarias, días festivos oficiales, o cualquier otra causa de fuerza mayor.",
      "En estos casos, haremos nuestro mejor esfuerzo por informarte del retraso, pero no podemos garantizar plazos exactos ni asumir responsabilidad por demoras causadas por dichos eventos.",
    ],
  },
  {
    title: "10. Embalaje",
    body: [
      "Todos los pedidos se empacan con materiales que garantizan la protección del producto durante el tránsito. Dado que comercializamos calzado artesanal de piel, ponemos especial cuidado en que el embalaje sea adecuado para conservar la forma y condición del producto.",
      "Por razones de sustentabilidad y costos, reutilizamos materiales de embalaje en la medida de lo posible. La presentación exterior del empaque no forma parte del producto adquirido.",
    ],
  },
  {
    title: "Contacto para Dudas de Envío",
    body: [
      "Si tienes alguna pregunta sobre el estatus de tu pedido o necesitas aclarar información sobre tu envío, puedes contactarnos a través de nuestros canales disponibles en el pie de página del sitio. Atendemos de lunes a viernes en horario hábil.",
    ],
  },
];

export default function ShippingInfo() {
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
            Política de Envíos
          </h1>
          <p className="text-amber-100/40 text-sm">
            Última actualización: {lastUpdated}
          </p>
          <div className="mt-6 bg-amber-400/8 border border-amber-400/20 p-5 rounded-sm">
            <p className="text-amber-100/70 text-sm leading-relaxed">
              <span className="text-amber-400 font-medium">Importante:</span>{" "}
              Realizamos envíos únicamente al interior de la República Mexicana.
              Al confirmar tu compra aceptas los tiempos, condiciones y
              responsabilidades descritas en esta política.
            </p>
          </div>
        </header>

        {/* Coverage highlight */}
        <div className="flex items-start gap-4 border border-amber-900/40 bg-stone-900/40 p-6">
          <div className="shrink-0 w-px self-stretch bg-amber-400/40" />
          <div className="space-y-2">
            <p className="font-serif text-lg text-amber-200">
              Solo enviamos dentro de México
            </p>
            <p className="text-sm text-amber-100/60 leading-relaxed">
              Por el momento nuestros envíos cubren todo el territorio nacional
              mexicano a través de paqueterías establecidas. No realizamos
              envíos a otros países ni a zonas no cubiertas por nuestros
              servicios de mensajería. Seguimos trabajando para ampliar nuestra
              cobertura.
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
            reservados. Envíos al interior de la República Mexicana.
          </p>
        </div>
      </div>
    </div>
  );
}
