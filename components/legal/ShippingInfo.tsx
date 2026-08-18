import LegalLayout from "@/components/legal/LegalLayout";
import { LEGAL_ENTITY } from "@/components/legal/entity";

const SECTIONS = [
  {
    slug: "cobertura",
    title: "1. Cobertura de Envíos",
    body: [
      `${LEGAL_ENTITY.tradeName} realiza envíos únicamente al interior de la República Mexicana. No realizamos envíos internacionales, a apartados postales ni a zonas de difícil acceso no cubiertas por las paqueterías con las que operamos.`,
      "Todos los pedidos salen de nuestra tienda física en Celaya, Guanajuato.",
      "Si tu municipio o localidad no aparece como destino disponible al ingresar tu dirección en el proceso de compra, lamentablemente no podemos procesar tu pedido. Te recomendamos contactarnos para explorar alternativas.",
    ],
  },
  {
    slug: "tiempos",
    title: "2. Tiempos de Entrega Estimados",
    body: [
      "Los tiempos de entrega son referenciales y pueden variar según la zona geográfica, la paquetería asignada y factores externos fuera de nuestro control:",
      "• Zona metropolitana (CDMX, Monterrey, Guadalajara): 2 a 4 días hábiles.\n• Ciudades principales (Puebla, Querétaro, León, Tijuana, etc.): 3 a 5 días hábiles.\n• Ciudades intermedias y municipios: 4 a 7 días hábiles.\n• Zonas rurales o de acceso limitado: 7 a 12 días hábiles.",
      "Los tiempos se cuentan a partir de la confirmación del pago, no desde la fecha en que se creó el pedido. Los periodos de alta demanda (Buen Fin, Navidad, Día de las Madres) pueden extender los plazos hasta un 50% adicional. Los plazos indicados son estimados, no compromisos contractuales.",
    ],
  },
  {
    slug: "costos",
    title: "3. Costo de Envío",
    body: [
      "El costo de envío se calcula automáticamente durante el proceso de compra, cotizando en vivo con las paqueterías con las que operamos. Depende de tres factores: el peso y las dimensiones de lo que compras, la zona de destino y —esto es lo que suele sorprender— el número de cajas en que debe viajar tu pedido.",
      "Se cobra una guía por caja. Los artículos se acomodan automáticamente en el menor número de cajas posible, pero un pedido voluminoso (varios pares de botas, o botas y sombreros juntos) puede requerir más de un paquete, y en ese caso el costo se multiplica en consecuencia. Cuando tu pedido necesita más de una caja, el número de paquetes se indica en pantalla junto a las opciones de envío y en el resumen, antes de que pagues.",
      "Cuando el sistema de cotización en vivo no está disponible, o cuando un artículo no tiene registradas sus dimensiones, aplicamos una tarifa fija por tipo de producto y por caja. En cualquiera de los dos casos, el monto exacto se muestra antes de confirmar la compra y es el que se cobra: nunca se ajusta después.",
      "El costo vigente al momento de confirmar tu pago es el que aplica a tu pedido. Si dejas el proceso a medias y lo retomas más tarde, la cotización puede haber expirado y el sistema te pedirá elegir de nuevo el servicio de envío.",
    ],
  },
  {
    slug: "despacho",
    title: "4. Preparación y Despacho del Pedido",
    body: [
      "Una vez confirmado el pago, el pedido entra a proceso de preparación. El tiempo de empaque y despacho es de 1 a 2 días hábiles.",
      "Según la paquetería y el servicio elegido, el paquete puede ser recolectado en nuestras instalaciones o depositado por nosotros en una sucursal del transportista. La diferencia es puramente operativa: no afecta el tiempo de entrega estimado ni el costo que pagaste.",
      "Recibirás un correo electrónico con el número de guía y la paquetería asignada en cuanto tu pedido sea entregado al servicio de mensajería. Si no lo recibes dentro de las 48 horas hábiles siguientes a tu pago, revisa la carpeta de spam o escríbenos.",
    ],
  },
  {
    slug: "rastreo",
    title: "5. Rastreo del Pedido",
    body: [
      "Tienes dos formas de seguir tu pedido:",
      "• En este sitio. Al confirmarse tu pago te enviamos por correo un código de seguimiento. Ingrésalo en «Seguimiento de pedido», en el pie de página, y verás el estado de tu pedido, los artículos comprados y el estado del envío, que se actualiza automáticamente conforme la paquetería reporta el movimiento del paquete.\n• En el sitio de la paquetería. Con el número de guía que te enviamos por correo puedes consultar el detalle del rastreo directamente en la plataforma del transportista, que siempre tendrá la información más granular sobre la ruta.",
      "El código de seguimiento es la credencial de acceso a tu pedido: quien lo tenga puede consultarlo. Compártelo solo con quien deba verlo. Los detalles están en el Aviso de Privacidad.",
      "Si el rastreo lleva más de 5 días naturales sin movimiento, contacta primero a la paquetería —es quien tiene la información de la ruta— y después a nosotros si el problema persiste.",
    ],
  },
  {
    slug: "riesgo",
    title: "6. Transferencia del Riesgo y Responsabilidad en la Entrega",
    body: [
      "El riesgo de pérdida o daño del producto se transfiere al comprador en el momento en que la empresa de paquetería toma posesión del paquete, ya sea porque lo recolecta en nuestras instalaciones o porque nosotros lo depositamos en una de sus sucursales. Esta es la misma regla que establece la sección 10 de los Términos y Condiciones: ambos documentos dicen exactamente lo mismo.",
      `${LEGAL_ENTITY.tradeName} es responsable de entregar el paquete a la paquetería debidamente embalado y en las condiciones acordadas. Cualquier incidencia ocurrida durante el trayecto —robo, extravío o daño en tránsito— se gestiona con la empresa de mensajería mediante el número de guía.`,
      "Eso no te deja solo. Si el paquete se extravía o llega dañado, avísanos también a nosotros dentro de los plazos de la sección 9: tenemos la relación comercial con el transportista y podemos abrir y dar seguimiento a la reclamación. La resolución y el pago de la indemnización dependen de la paquetería y de las coberturas contratadas con ella.",
    ],
  },
  {
    slug: "direccion",
    title: "7. Dirección de Entrega y Responsabilidad del Comprador",
    body: [
      "El comprador es responsable de proporcionar una dirección de entrega completa, correcta y accesible. Esto incluye calle, número exterior e interior (si aplica), colonia, municipio, estado, código postal y las referencias que ayuden a localizar el domicilio.",
      "No nos hacemos responsables por retrasos o entregas fallidas derivados de una dirección incorrecta, incompleta o ilegible proporcionada por el comprador. Los costos de reenvío por dirección errónea corren a cargo del comprador.",
      "Asegúrate de que haya alguien disponible para recibir el paquete en el domicilio indicado. Si la paquetería realiza dos intentos de entrega fallidos, el paquete puede ser devuelto a nuestras instalaciones. El reenvío generará un costo adicional.",
    ],
  },
  {
    slug: "devueltos",
    title: "8. Paquetes No Entregados o Devueltos",
    body: [
      "Si un paquete es devuelto a nuestras instalaciones por causa imputable al comprador —dirección incorrecta, ausencia reiterada, rechazo del paquete—, el comprador deberá cubrir el costo de un segundo envío para recibir su pedido.",
      "En ningún caso procede un reembolso por paquetes devueltos debido a causas imputables al comprador, de conformidad con la política de venta final establecida en los Términos y Condiciones.",
      "Si el comprador prefiere no cubrir el reenvío, su pedido queda disponible para recolección sin costo en nuestro establecimiento físico en Celaya, Guanajuato. Nos pondremos en contacto para acordarlo.",
    ],
  },
  {
    slug: "incidencias",
    title: "9. Daño, Extravío y Producto Incorrecto: Plazos para Reportar",
    body: [
      "Los plazos importan porque las paqueterías cierran sus ventanas de reclamación con rapidez. Reporta según el caso:",
      "• Paquete con daño visible en el embalaje: fotografíalo ANTES de abrirlo, hazlo constar con el repartidor en el momento de la entrega y avísanos dentro de las 48 horas siguientes.\n• Producto incorrecto o pedido incompleto: repórtalo dentro de los 5 días naturales siguientes a la recepción. El costo de la corrección corre por nuestra cuenta.\n• Paquete marcado como entregado que no recibiste: avísanos dentro de los 5 días naturales siguientes a la fecha que indique el rastreo, para poder abrir la investigación con la paquetería mientras la incidencia siga siendo reclamable.\n• Defecto de fabricación: no está sujeto a estos plazos. Se rige por la sección 4 de los Términos y Condiciones.",
      `En todos los casos, escríbenos a ${LEGAL_ENTITY.email} con tu código de seguimiento y las fotografías correspondientes.`,
    ],
  },
  {
    slug: "fuerza-mayor",
    title: "10. Restricciones y Causas de Fuerza Mayor",
    body: [
      "Los tiempos de entrega pueden verse afectados por situaciones fuera de nuestro control y del de las paqueterías: fenómenos meteorológicos, paros de transporte, contingencias sanitarias, días festivos oficiales o cualquier otra causa de fuerza mayor.",
      "En estos casos haremos nuestro mejor esfuerzo por informarte del retraso, pero no podemos garantizar plazos exactos ni asumir responsabilidad por demoras causadas por dichos eventos.",
    ],
  },
  {
    slug: "embalaje",
    title: "11. Embalaje",
    body: [
      "Todos los pedidos se empacan con materiales que garantizan la protección del producto durante el tránsito. Dado que comercializamos calzado artesanal de piel, ponemos especial cuidado en que el embalaje conserve la forma y la condición del producto.",
      "Por razones de sustentabilidad y costo reutilizamos materiales de embalaje en la medida de lo posible, y la caja puede no ser el empaque original de fábrica. La presentación exterior del empaque no forma parte del producto adquirido.",
    ],
  },
  {
    slug: "contacto",
    title: "Contacto para Dudas de Envío",
    body: [
      `Si tienes preguntas sobre el estatus de tu pedido o necesitas reportar una incidencia, escríbenos a ${LEGAL_ENTITY.email} indicando tu código de seguimiento. También puedes contactarnos por Instagram, cuyo enlace está en el pie de página. Atendemos de lunes a viernes en horario hábil.`,
    ],
  },
];

export default function ShippingInfo() {
  const lastUpdated = "18 de agosto de 2026";

  return (
    <LegalLayout
      eyebrow={LEGAL_ENTITY.tradeName}
      title="Política de Envíos"
      lastUpdated={lastUpdated}
      highlight={{
        label: "Importante:",
        text: (
          <>
            Enviamos únicamente al interior de la República Mexicana, y el costo
            se cobra por caja: un pedido voluminoso puede requerir más de un
            paquete. El número de cajas y el monto exacto se te muestran antes
            de pagar — la sección 3 lo explica.
          </>
        ),
      }}
      callout={{
        heading: "Solo enviamos dentro de México",
        text: "Nuestros envíos cubren todo el territorio nacional mexicano a través de paqueterías establecidas, saliendo desde Celaya, Guanajuato. No realizamos envíos a otros países ni a zonas no cubiertas por nuestros servicios de mensajería. Seguimos trabajando para ampliar nuestra cobertura.",
      }}
      sections={SECTIONS}
      footerNote={`© ${new Date().getFullYear()} ${LEGAL_ENTITY.tradeName}. Todos los derechos reservados. Envíos al interior de la República Mexicana.`}
    />
  );
}
