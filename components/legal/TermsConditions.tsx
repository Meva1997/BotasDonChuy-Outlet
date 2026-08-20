import LegalLayout from "@/components/legal/LegalLayout";
import { LEGAL_ENTITY, legalVersionLabel } from "@/components/legal/entity";

const SECTIONS = [
  {
    slug: "proveedor",
    title: "1. Identificación del Proveedor y Aceptación",
    body: [
      `Este sitio es operado por ${LEGAL_ENTITY.legalName}, RFC ${LEGAL_ENTITY.taxId}, con domicilio en ${LEGAL_ENTITY.address}, que comercializa bajo el nombre comercial «${LEGAL_ENTITY.tradeName}» (en adelante «el Proveedor»). Correo de contacto: ${LEGAL_ENTITY.email}.`,
      "Estos Términos y Condiciones rigen toda compra realizada a través de este sitio web y en el establecimiento físico del Proveedor. Al marcar la casilla de aceptación durante el proceso de compra en línea, o al pagar en caja en la tienda física, el comprador manifiesta haber leído, entendido y aceptado la totalidad de este documento.",
      "La Política de Privacidad y la Política de Envíos, disponibles en el pie de página, forman parte integral de estos Términos y se aceptan en el mismo acto.",
    ],
  },
  {
    slug: "naturaleza-outlet",
    title: "2. Naturaleza del Outlet y Carácter Final de la Venta",
    body: [
      "El Proveedor comercializa artículos de temporadas anteriores, modelos descontinuados, piezas de exhibición o con existencia limitada que ya no forman parte del catálogo vigente de la marca. Cada pieza es única o de disponibilidad irrepetible; una vez agotada no hay reposición posible.",
      "El precio de outlet refleja precisamente esta condición: el comprador recibe un producto con excelente relación calidad-precio a cambio de aceptar las restricciones descritas en estos términos. Al finalizar la compra, la transacción se considera definitiva bajo las condiciones aquí establecidas.",
    ],
  },
  {
    slug: "venta-final",
    title: "3. Política de No Devoluciones ni Cambios",
    body: [
      "Todas las ventas realizadas a través de este sitio web y en el establecimiento físico son FINALES. El Proveedor no acepta devoluciones, cambios de talla, cambios de modelo, cambios por otro artículo ni cancelaciones posteriores al pago por los siguientes motivos, de manera enunciativa más no limitativa:",
      "• Cambio de opinión o arrepentimiento del comprador.\n• Error del comprador al elegir la talla, el modelo o la cantidad.\n• Discrepancia subjetiva entre las expectativas del comprador y el producto recibido.\n• Uso, lavado, ajuste o desgaste del producto tras su recepción.\n• Preferencia posterior por otro artículo del catálogo.",
      "La razón de esta política es estructural, no discrecional: los productos ofrecidos son modelos descontinuados sin existencias adicionales. No existe un artículo equivalente que entregar en sustitución, ni es posible reincorporar una pieza devuelta a una línea de producción que ya cerró. Lo mismo aplica a los artículos que no manejan talla (hebillas, accesorios y piezas sueltas): la unidad vendida es igualmente irrepetible.",
      "Esta política NO limita ni sustituye los derechos que la Ley Federal de Protección al Consumidor reconoce al comprador en los supuestos descritos en la sección 4. Ninguna cláusula de este documento debe interpretarse como una renuncia a esos derechos.",
    ],
  },
  {
    slug: "excepciones",
    title: "4. Excepciones: Producto Incorrecto, Daño en Tránsito y Defecto de Fabricación",
    body: [
      "La venta final no aplica en los siguientes supuestos, en los que el comprador conserva íntegros sus derechos de ley:",
      "a) Producto incorrecto o pedido incompleto. Si recibes un artículo distinto al que compraste, o el pedido llega incompleto, repórtalo dentro de los 5 (cinco) días naturales siguientes a la recepción. El costo de la corrección corre por cuenta del Proveedor.",
      "b) Daño ocurrido en tránsito. Si el paquete llega con daño visible en el embalaje, fotografíalo ANTES de abrirlo, hazlo constar con el repartidor en el momento de la entrega y repórtalo al Proveedor dentro de las 48 horas siguientes. Este plazo es corto porque las paqueterías cierran sus propias ventanas de reclamación con rapidez: pasado ese tiempo la incidencia deja de ser reclamable ante el transportista.",
      "c) Defecto de fabricación. Se entiende como una falla en materiales, costura, pegado o herrajes atribuible al proceso de producción, y no al uso, almacenamiento o manejo del comprador. Se atiende dentro del plazo de garantía que la ley reconoce, sin que le sean aplicables los plazos de los incisos anteriores. Repórtalo enviando fotografías claras del defecto al correo indicado en la sección «Contacto».",
      "Conforme al artículo 92 de la Ley Federal de Protección al Consumidor, ante un defecto de fabricación acreditado corresponde AL COMPRADOR elegir entre la reposición del producto, la bonificación o la devolución del precio pagado. Dado el carácter irrepetible del inventario, el Proveedor propondrá en primer término la reposición por otra pieza disponible o una nota de crédito, pero no puede imponer esa vía si el comprador opta por otra de las que la ley le reconoce.",
    ],
  },
  {
    slug: "condicion-producto",
    title: "5. Condición del Producto, Fotografías y Precios de Referencia",
    body: [
      "Cada artículo cuenta con descripción, fotografías y, cuando aplica, señalización de uso o de pequeños detalles estéticos propios de su condición de outlet. Pueden existir variaciones menores de tono entre lo que se ve en pantalla y la pieza física, por calibración del monitor y por las condiciones de iluminación de la toma.",
      "Las fotografías son de la pieza real que se vende y de su estado actual: no se publican imágenes de catálogo del fabricante, renders ni fotos de una unidad distinta. Sobre esa fotografía real puede aplicarse edición digital —incluida edición asistida por inteligencia artificial— limitada al entorno de la toma: fondo, iluminación, sombras, encuadre y corrección de color.",
      "Esa edición no altera el producto. No se corrigen, disimulan ni eliminan desgastes, marcas, rayones, decoloraciones ni ningún otro detalle propio de la condición de outlet de la pieza, y tampoco se modifican su forma, su color real, sus materiales, sus herrajes ni sus proporciones. Si un artículo presenta un detalle estético relevante, se muestra en la fotografía y se indica en la descripción.",
      "El precio tachado que acompaña a cada pieza corresponde al precio de lista al que ese mismo artículo se ofreció con anterioridad, y el «ahorro» que se muestra en el carrito es la diferencia exacta entre ese precio anterior y el precio de outlet. No se trata de un precio de referencia estimado ni de una comparación con el de otro comercio.",
      "Por razones de sustentabilidad y costo, el embalaje puede no ser la caja original de fábrica y puede incluir materiales reutilizados. La presentación exterior del empaque no forma parte del producto adquirido.",
      "El comprador reconoce haber revisado toda la información disponible antes de concretar su compra y acepta el artículo en las condiciones descritas.",
    ],
  },
  {
    slug: "precios-facturacion",
    title: "6. Precios, Impuestos y Facturación",
    body: [
      "Todos los precios se expresan en pesos mexicanos (MXN) e incluyen el IVA cuando aplique. Los precios de outlet son especiales, no negociables, y pueden cambiar sin previo aviso hasta antes de confirmar el pago. El precio aplicable a un pedido es el vigente en el momento en que el pago se confirma.",
      `Si requieres factura (CFDI), solicítala a ${LEGAL_ENTITY.email} dentro del mes calendario en que realizaste la compra, indicando tu código de seguimiento de pedido y tus datos fiscales: RFC, razón social, régimen fiscal, código postal y uso del CFDI. Una vez cerrado el mes, la facturación queda sujeta a las restricciones que impone el SAT.`,
    ],
  },
  {
    slug: "cupones",
    title: "7. Cupones y Promociones",
    body: [
      "Los cupones de descuento se aplican en el resumen de compra, antes de capturar la dirección de envío, y quedan sujetos a las siguientes reglas, todas verificadas automáticamente por el sistema:",
      "• Vigencia. Cada cupón tiene fecha de inicio y de término; uno vencido o aún no vigente es rechazado.\n• Monto mínimo de compra. Si el subtotal de mercancía queda por debajo del mínimo, el cupón deja de aplicar.\n• Número total de canjes. Un cupón puede agotarse aunque siga vigente.\n• Un uso por cliente. El límite se verifica por dirección de correo electrónico, normalizada para que las variantes de formato del mismo correo cuenten como uno solo.\n• Los cupones no son acumulables entre sí, no aplican sobre el costo de envío y no son canjeables por efectivo.",
      "El descuento se calcula siempre sobre la mercancía y su importe exacto se muestra en pantalla antes de pagar. Un cupón aceptado en el resumen puede volver a validarse al confirmarse el correo del comprador, que es el único momento en que el límite de un uso por cliente puede comprobarse. Si en ese punto resulta rechazado, el pedido no podrá pagarse con ese cupón; el comprador puede retirarlo y continuar su compra al precio sin descuento. En ningún caso se cobra un importe distinto al mostrado en pantalla al momento de pagar.",
      "El Proveedor puede cancelar o suspender un cupón en cualquier momento. La cancelación no afecta a los pedidos ya pagados con él.",
    ],
  },
  {
    slug: "proceso-compra",
    title: "8. Proceso de Compra en Línea y Métodos de Pago",
    body: [
      "La compra se realiza en cuatro pasos: resumen y aceptación de términos, dirección de envío, elección del servicio de paquetería y pago. Al marcar la casilla «He leído y acepto los términos y condiciones y la política de privacidad» el comprador otorga su consentimiento expreso e informado; sin esa aceptación el proceso no avanza y el pedido no llega a crearse. La aceptación queda registrada con el pedido en los términos de la sección 15.",
      "Los pagos con tarjeta se procesan a través de Stripe. El Proveedor no recibe, no almacena y no tiene acceso a los datos completos de la tarjeta: viajan directamente al procesador bajo sus propios estándares de seguridad.",
      "El pedido queda confirmado cuando el pago se acredita. Un pedido creado pero no pagado se cancela automáticamente transcurrido un periodo breve y las piezas vuelven al catálogo: un carrito abandonado a medio pagar no reserva mercancía, tal como advierte el aviso «Estos artículos no se reservan».",
      "Si por un fallo de red o un doble clic se envía dos veces la misma solicitud de pago, el sistema la reconoce como repetida y no genera un segundo cargo.",
    ],
  },
  {
    slug: "cancelaciones-proveedor",
    title: "9. Cancelaciones y Reembolsos por Parte del Proveedor",
    body: [
      "Además de los supuestos de la sección 4, el Proveedor puede cancelar un pedido y emitir el reembolso correspondiente en los siguientes casos:",
      "• Falta de existencia verificada tras el pago, cuando dos compradores concurren sobre la última pieza.\n• Error de precio manifiesto.\n• Pago rechazado, revertido o no acreditado por el procesador después de la confirmación.\n• Imposibilidad de envío a la dirección proporcionada.\n• Causas de fuerza mayor.",
      "En estos casos el reembolso es íntegro —incluido el costo de envío cobrado— y se emite al mismo método de pago utilizado en la compra. El tiempo en que el importe se refleja en el estado de cuenta depende del banco emisor y del procesador de pagos, no del Proveedor. Un reembolso parcial procede únicamente cuando parte del pedido sí pudo entregarse.",
    ],
  },
  {
    slug: "envios",
    title: "10. Envíos y Transferencia del Riesgo",
    body: [
      "Los envíos se realizan únicamente al interior de la República Mexicana. Las condiciones completas —cobertura, tiempos estimados, costo por caja, direcciones incorrectas y paquetes devueltos— están en la Política de Envíos, que forma parte integral de estos Términos.",
      "Los tiempos de entrega son estimados y pueden variar según la paquetería, la zona geográfica y factores externos fuera del control del Proveedor (fenómenos naturales, paros, contingencias logísticas). Los plazos indicados son referenciales, no contractuales.",
      "El riesgo de pérdida o daño del producto se transfiere al comprador en el momento en que la empresa de paquetería toma posesión del paquete, ya sea porque lo recolecta en las instalaciones del Proveedor o porque el Proveedor lo deposita en una sucursal del transportista. A partir de ese momento, cualquier incidencia en tránsito —extravío, robo o daño— se gestiona con la paquetería mediante el número de guía, sin perjuicio de lo previsto en el inciso b) de la sección 4.",
      "La responsabilidad del Proveedor se limita a entregar el paquete a la paquetería debidamente embalado y en las condiciones acordadas.",
    ],
  },
  {
    slug: "seguimiento",
    title: "11. Seguimiento del Pedido",
    body: [
      "Al confirmarse el pago, el comprador recibe por correo electrónico un código de seguimiento con el que puede consultar el estado de su pedido en este mismo sitio, desde el enlace «Seguimiento de pedido» del pie de página. Una vez generada la guía, el estado del envío se actualiza automáticamente conforme la paquetería reporta el movimiento del paquete.",
      "Ese código es la credencial de acceso al pedido: quien lo tenga puede consultar los artículos, los importes y el estado del envío. No lo publiques ni lo compartas con quien no deba verlo. El Proveedor no responde por consultas realizadas por terceros a quienes el propio comprador haya facilitado el código o el enlace.",
    ],
  },
  {
    slug: "tienda-fisica",
    title: "12. Compras en Tienda Física",
    body: [
      "Las mismas condiciones de venta final aplican a las compras realizadas en el establecimiento físico del Proveedor. Al momento de pagar en caja, el comprador confirma haber revisado el artículo en su presencia y aceptar su estado actual.",
      "No se realizan cambios ni devoluciones en tienda física por ninguno de los motivos enlistados en la sección 3. Se recomienda verificar la talla y el estado del producto antes de realizar el pago. Las excepciones de la sección 4 aplican por igual a estas compras.",
    ],
  },
  {
    slug: "mayoria-edad",
    title: "13. Mayoría de Edad y Capacidad",
    body: [
      "Este sitio está dirigido a personas mayores de 18 años con capacidad legal para contratar. Al realizar una compra, el comprador manifiesta cumplir con este requisito. El Proveedor no dirige su publicidad a menores de edad ni recopila conscientemente sus datos personales.",
    ],
  },
  {
    slug: "uso-sitio",
    title: "14. Uso del Sitio y Propiedad Intelectual",
    body: [
      "Todo el contenido de este sitio —textos, fotografías de producto, identidad gráfica, marca y diseño— es propiedad del Proveedor o se utiliza bajo licencia, y está protegido por la legislación mexicana de propiedad industrial y de derechos de autor. Se autoriza su consulta y su compartición con fines personales y no comerciales.",
      "Queda prohibido, sin autorización previa por escrito: reproducir o publicar las fotografías de producto con fines comerciales; extraer el catálogo de forma automatizada mediante scraping, bots o consultas masivas a la interfaz del sitio; presentar los artículos como stock propio de otro comercio; e intentar acceder a las áreas de administración o a información no destinada al público.",
      "El Proveedor puede restringir el acceso al sitio y cancelar pedidos ante un uso que encuadre en cualquiera de estos supuestos.",
    ],
  },
  {
    slug: "constancia",
    title: "15. Constancia de la Operación",
    body: [
      "Cada pedido queda registrado con su fecha y hora, los artículos comprados, los descuentos aplicados y los importes cobrados. Ese registro, junto con el correo de confirmación que se envía al comprador y el código de seguimiento asociado, constituye la constancia de la operación.",
      "El registro incluye además la constancia de aceptación: la fecha y hora en que se creó el pedido, la versión de estos Términos y del Aviso de Privacidad que estaban publicados en ese momento, y la dirección IP desde la que se compró. El Aviso de Privacidad detalla el tratamiento de ese dato.",
      "Las compras realizadas antes de una modificación de estos Términos se rigen por la versión vigente en el momento de la transacción. La fecha de última actualización que aparece en el encabezado de este documento permite identificar qué versión estaba en vigor, y la versión concreta que se aplicó a cada pedido queda guardada con él, de modo que no depende de la memoria de ninguna de las partes.",
    ],
  },
  {
    slug: "responsabilidad",
    title: "16. Limitación de Responsabilidad",
    body: [
      "En la máxima medida permitida por la legislación mexicana aplicable, la responsabilidad del Proveedor frente al comprador por cualquier reclamación derivada de una compra se limita al importe efectivamente pagado por el artículo de que se trate. El Proveedor no responde por daños indirectos, incidentales, especiales o consecuentes.",
      "Esta limitación no aplica en los supuestos en que la ley no admite pacto en contrario, en particular la responsabilidad por productos defectuosos y los derechos reconocidos en la sección 4.",
    ],
  },
  {
    slug: "datos-personales",
    title: "17. Datos Personales",
    body: [
      "El tratamiento de los datos personales que el comprador proporciona para procesar su pedido se rige por la Política de Privacidad de este sitio, disponible en el pie de página, que forma parte integral de estos Términos y se acepta en el mismo acto. Ahí se detalla qué datos se recaban, con quién se comparten, cuánto tiempo se conservan y cómo ejercer los derechos ARCO.",
    ],
  },
  {
    slug: "legislacion",
    title: "18. Legislación Aplicable y Jurisdicción",
    body: [
      "Estos Términos y Condiciones se rigen por las leyes de los Estados Unidos Mexicanos, en particular la Ley Federal de Protección al Consumidor, la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y el Código de Comercio.",
      `La Procuraduría Federal del Consumidor (PROFECO) es competente en la vía administrativa para conocer de las controversias que surjan con motivo de estas operaciones. Para la vía judicial, las partes se someten a los tribunales competentes de ${LEGAL_ENTITY.jurisdiction} —domicilio del Proveedor— o a los del domicilio del comprador, a elección de este último.`,
    ],
  },
  {
    slug: "modificaciones",
    title: "19. Modificaciones",
    body: [
      "El Proveedor se reserva el derecho de modificar estos Términos en cualquier momento. Los cambios entran en vigor al publicarse en este sitio, con la fecha de última actualización correspondiente. Las compras realizadas antes de la modificación se rigen por los términos vigentes en el momento de la transacción.",
    ],
  },
  {
    slug: "contacto",
    title: "Contacto",
    body: [
      `Para dudas sobre estos Términos, para solicitar factura o para reportar un producto incorrecto, un daño en tránsito o un defecto de fabricación, escríbenos a ${LEGAL_ENTITY.email}. Indica siempre tu código de seguimiento de pedido: es lo que nos permite localizar la operación.`,
      "También puedes escribirnos por Instagram, cuyo enlace está en el pie de página. Para reportes formales y para el ejercicio de derechos sobre datos personales, el correo electrónico es el canal oficial, porque es donde queda constancia de la solicitud y de su fecha.",
    ],
  },
];

export default function TermsConditions() {
  return (
    <LegalLayout
      eyebrow={LEGAL_ENTITY.tradeName}
      title="Términos y Condiciones"
      lastUpdated={legalVersionLabel()}
      highlight={{
        label: "Importante:",
        text: (
          <>
            Al realizar una compra en este sitio o en nuestra tienda física,
            aceptas de manera expresa los términos aquí descritos. Lee la
            sección 3 —venta final— y la sección 4, que describe los casos en
            los que sí respondemos: producto incorrecto, daño en tránsito y
            defecto de fabricación.
          </>
        ),
      }}
      callout={{
        heading: "¿Qué es un Outlet?",
        text: "Nuestro outlet reúne piezas de temporadas pasadas y modelos que ya no se producen — artículos con historia, carácter propio y precios accesibles. Son oportunidades únicas: cada par es irrepetible porque ya no existe en catálogo activo. Eso implica que no hay existencias de respaldo para cambios de talla o de modelo, condición que aceptas al comprar. No implica, en cambio, que te quedes sin respaldo si lo que llega está mal: si recibes un artículo distinto, dañado en el envío o con un defecto de fábrica, respondemos — así lo detalla la sección 4.",
      }}
      sections={SECTIONS}
      footerNote={`© ${new Date().getFullYear()} ${LEGAL_ENTITY.tradeName}. Todos los derechos reservados. Outlet de modelos descontinuados — venta final, con las excepciones de la sección 4.`}
    />
  );
}
