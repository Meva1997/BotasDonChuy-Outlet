import LegalLayout from "@/components/legal/LegalLayout";
import { LEGAL_ENTITY } from "@/components/legal/entity";

const SECTIONS = [
  {
    slug: "responsable",
    title: "1. Identidad y Domicilio del Responsable",
    body: [
      `El responsable del tratamiento de tus datos personales es ${LEGAL_ENTITY.legalName}, RFC ${LEGAL_ENTITY.taxId}, con domicilio en ${LEGAL_ENTITY.address}, que opera bajo el nombre comercial «${LEGAL_ENTITY.tradeName}» (en adelante «el Responsable»).`,
      `Para cualquier asunto relacionado con tus datos personales, incluido el ejercicio de tus derechos ARCO, el canal oficial es ${LEGAL_ENTITY.email}.`,
      "Este aviso aplica a los datos recabados a través de este sitio web, del correo de contacto y de cualquier canal de comunicación asociado.",
    ],
  },
  {
    slug: "datos-recabados",
    title: "2. Datos Personales que Recabamos",
    body: [
      "Para procesar y entregar tu pedido recabamos directamente de ti:",
      "• Nombre completo del destinatario.\n• Dirección de entrega: calle, número, colonia, ciudad, estado, código postal y referencias del domicilio.\n• Teléfono de contacto, que se comparte con la paquetería.\n• Correo electrónico, para enviarte la confirmación del pedido, el código de seguimiento y el número de guía.",
      "Además, el sistema genera y conserva automáticamente:",
      "• El detalle de tu pedido —artículos, tallas, cantidades e importes cobrados— asociado a tu nombre y dirección.\n• Tu dirección IP, cuando aplicas un cupón de descuento y en los controles antiabuso que limitan el número de solicitudes por usuario. Se guarda como dato de auditoría; no se usa para perfilarte ni para publicidad.\n• Una versión normalizada de tu correo electrónico (en minúsculas y sin variantes de formato), que es el mecanismo con el que se hace cumplir el límite de «un cupón por cliente».\n• Un código único de seguimiento asociado a tu pedido.",
      "No recabamos ni almacenamos datos de tarjeta bancaria. Los pagos se procesan íntegramente en Stripe: los datos de tu tarjeta viajan directamente a ese procesador y nosotros únicamente conservamos el identificador de la transacción y su estado.",
      "No recabamos datos personales sensibles.",
    ],
  },
  {
    slug: "finalidades",
    title: "3. Finalidades del Tratamiento",
    body: [
      "Finalidades primarias, necesarias para la relación de compraventa:",
      "• Procesar, confirmar y facturar tu pedido.\n• Coordinar el envío con la empresa de paquetería y generar la guía.\n• Comunicarte el número de guía y las actualizaciones del estado de tu envío.\n• Atender aclaraciones, incidencias y reportes relacionados con tu pedido.\n• Aplicar y verificar los cupones de descuento conforme a sus reglas, incluido el límite de un uso por cliente.\n• Cumplir con las obligaciones fiscales, contables y de conservación de registros que impone la ley.",
      "No tratamos tus datos con finalidades secundarias. En particular, no los utilizamos para publicidad, mercadotecnia, prospección comercial, elaboración de perfiles ni boletines informativos. No enviamos correos promocionales. Si esto llegara a cambiar, se te solicitaría tu consentimiento por separado y podrías negarlo sin que ello afectara tu compra ni el servicio que recibes.",
    ],
  },
  {
    slug: "consentimiento",
    title: "4. Fundamento y Consentimiento",
    body: [
      "Al marcar la casilla de aceptación durante el proceso de compra otorgas tu consentimiento expreso al tratamiento descrito en este aviso.",
      "El tratamiento de los datos estrictamente necesarios para cumplir con la compraventa y con las obligaciones fiscales derivadas de ella no requiere consentimiento adicional, conforme al artículo 10 de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, y subsiste mientras esas obligaciones sigan vigentes.",
    ],
  },
  {
    slug: "transferencias",
    title: "5. Transferencias y Encargados",
    body: [
      "Para poder entregarte tu pedido compartimos los datos estrictamente necesarios con los siguientes terceros, que actúan como encargados y solo pueden usarlos para la finalidad contratada:",
      "• Empresa de paquetería, contratada a través de Skydropx (México): nombre, dirección completa, teléfono y correo electrónico, para generar la guía y realizar la entrega.\n• Stripe (Estados Unidos): correo electrónico e importe de la operación, para procesar el cobro y, en su caso, el reembolso.\n• Resend (Estados Unidos): correo electrónico y contenido del mensaje, para enviarte la confirmación del pedido, el código de seguimiento y los correos de recuperación de contraseña del panel de administración.\n• Proveedores de infraestructura (Vercel y el proveedor de alojamiento del servidor y la base de datos), que almacenan y procesan la información por cuenta del Responsable.",
      "Transferencias internacionales: Stripe, Resend y parte de la infraestructura de alojamiento operan servidores fuera de México, principalmente en Estados Unidos. Al aceptar este aviso consientes esa transferencia, que se realiza únicamente para las finalidades primarias descritas en la sección 3 y al amparo del artículo 37 fracción V de la LFPDPPP, que la permite cuando es necesaria para el cumplimiento de un contrato celebrado en interés del titular.",
      "No vendemos, rentamos ni cedemos tus datos personales a terceros con fines comerciales. Solo los revelaremos a una autoridad cuando medie un requerimiento fundado y motivado.",
    ],
  },
  {
    slug: "conservacion",
    title: "6. Conservación de los Datos",
    body: [
      "Conservamos el registro de tu pedido —incluidos tu nombre, dirección, teléfono, correo electrónico y el detalle de lo comprado— mientras subsistan las obligaciones legales derivadas de la operación.",
      "En particular, la legislación fiscal y mercantil mexicana obliga a conservar la documentación de las operaciones por un plazo de 5 (cinco) años (artículo 30 del Código Fiscal de la Federación y artículo 46 del Código de Comercio). Los registros de venta sustentan además la contabilidad, los reportes internos del negocio y la atención de aclaraciones posteriores.",
      "Esto significa que tus datos de pedido NO se eliminan al recibir tu compra: permanecen en nuestros registros durante ese periodo. Preferimos decirlo con claridad a prometer un borrado que no ocurriría. Transcurridos los plazos de conservación aplicables, los datos se eliminan o se anonimizan de manera que dejen de identificarte, conservándose únicamente cifras agregadas sin posibilidad de identificación individual.",
      "Si solicitas la cancelación de tus datos antes de que venzan esos plazos, procederemos a bloquearlos —quedarán fuera del uso ordinario y disponibles solo para atender un requerimiento de autoridad— y los suprimiremos al concluir el periodo de conservación. Ver la sección 9.",
    ],
  },
  {
    slug: "codigo-seguimiento",
    title: "7. El Código de Seguimiento de tu Pedido",
    body: [
      "Cada pedido genera un código único que te enviamos por correo electrónico y que da acceso a una página con el estado de tu envío, los artículos comprados y los importes pagados. Esa página no muestra tu dirección completa ni tus datos de contacto, pero cualquier persona que tenga el código puede consultarla: el código ES la credencial de acceso.",
      "Trátalo como tratarías una contraseña. Si lo compartes por mensajería para que alguien más siga el envío, ten presente que esa persona verá el contenido y el importe del pedido.",
      `Si crees que tu código quedó expuesto, escríbenos a ${LEGAL_ENTITY.email} y lo invalidamos.`,
    ],
  },
  {
    slug: "seguridad",
    title: "8. Seguridad de los Datos",
    body: [
      "Adoptamos medidas técnicas y organizativas razonables para proteger tus datos personales contra acceso no autorizado, pérdida, alteración o divulgación: cifrado en tránsito (HTTPS) en todo el sitio, acceso al panel de administración restringido por credenciales y controles antiabuso que limitan el número de solicitudes por usuario. Los datos de tarjeta nunca pasan por nuestros servidores.",
      "Ningún sistema de transmisión o almacenamiento en Internet es cien por ciento seguro. En caso de una vulneración de seguridad que afecte de forma significativa tus derechos patrimoniales o morales, te lo informaremos sin demora, conforme al artículo 20 de la LFPDPPP.",
    ],
  },
  {
    slug: "derechos-arco",
    title: "9. Derechos ARCO",
    body: [
      "De conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, tienes derecho a:",
      "• Acceder a los datos personales que tenemos sobre ti y conocer las condiciones de su tratamiento.\n• Rectificar los datos que resulten inexactos o incompletos.\n• Cancelar el tratamiento cuando los datos dejen de ser necesarios para la finalidad informada.\n• Oponerte al tratamiento para finalidades distintas de las autorizadas.",
      `Para ejercer cualquiera de estos derechos, envía tu solicitud a ${LEGAL_ENTITY.email} indicando: tu nombre completo, un medio para comunicarte la respuesta, el código de seguimiento del pedido al que se refiere, una descripción clara del derecho que deseas ejercer y —si se trata de una rectificación— el dato correcto y la documentación que lo sustente. Podemos pedirte que acredites tu identidad antes de responder.`,
      "Responderemos en un plazo máximo de 20 (veinte) días hábiles contados desde la recepción de la solicitud y, de resultar procedente, la haremos efectiva dentro de los 15 (quince) días hábiles siguientes, conforme al artículo 32 de la LFPDPPP. El ejercicio de estos derechos es gratuito.",
      "La cancelación y la oposición pueden no proceder respecto de los datos que estamos obligados a conservar (ver la sección 6). En ese caso te explicaremos el motivo y el plazo al término del cual sí procederán.",
      "Si consideras que tu derecho a la protección de datos ha sido vulnerado, puedes acudir a la autoridad garante competente en materia de protección de datos personales.",
    ],
  },
  {
    slug: "revocacion",
    title: "10. Revocación del Consentimiento y Limitación de Uso",
    body: [
      `Puedes revocar en cualquier momento el consentimiento que nos otorgaste, escribiendo a ${LEGAL_ENTITY.email}. Ten en cuenta dos límites:`,
      "• La revocación no aplica a los datos necesarios para completar un pedido en curso, ni a los que debemos conservar por disposición fiscal o mercantil.\n• Revocar el consentimiento sobre los datos de envío antes de la entrega implica que el pedido no puede entregarse; en ese supuesto se estará a lo previsto en los Términos y Condiciones.",
      "Como no realizamos tratamientos con finalidades secundarias ni enviamos comunicaciones promocionales, no existe una lista de exclusión publicitaria a la que debas inscribirte. Si aun así deseas dejar constancia de tu negativa, escríbenos y la registraremos.",
    ],
  },
  {
    slug: "almacenamiento-local",
    title: "11. Cookies y Almacenamiento Local",
    body: [
      "Este sitio no utiliza cookies de rastreo, de publicidad comportamental ni de terceros.",
      "Sí utiliza el almacenamiento local de tu navegador (localStorage) para dos fines estrictamente funcionales: conservar el contenido de tu carrito entre visitas, y mantener iniciada la sesión del panel de administración, que solo usa el personal de la tienda.",
      "Esa información vive en tu propio dispositivo, no se envía a servidores de terceros y puedes borrarla en cualquier momento desde la configuración de tu navegador. Hacerlo vaciará tu carrito.",
    ],
  },
  {
    slug: "menores",
    title: "12. Menores de Edad",
    body: [
      "Este sitio está dirigido a personas mayores de 18 años. No recabamos conscientemente datos personales de menores de edad. Si detectamos que hemos recibido datos de un menor sin el consentimiento de quien ejerce la patria potestad o la tutela, los eliminaremos.",
    ],
  },
  {
    slug: "cambios",
    title: "13. Cambios a este Aviso",
    body: [
      "El Responsable puede actualizar este Aviso de Privacidad en cualquier momento. La versión vigente estará siempre disponible en esta página, con la fecha de última actualización indicada en el encabezado.",
      "Cuando el cambio sea sustancial —una nueva finalidad o una transferencia no prevista— te lo haremos saber al correo asociado a tu último pedido antes de aplicarlo.",
    ],
  },
  {
    slug: "legislacion",
    title: "14. Legislación Aplicable",
    body: [
      "Este Aviso se rige por la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, su Reglamento, los Lineamientos del Aviso de Privacidad y demás disposiciones aplicables en los Estados Unidos Mexicanos.",
    ],
  },
  {
    slug: "contacto",
    title: "Contacto",
    body: [
      `Para dudas sobre este Aviso, para ejercer tus derechos ARCO o para revocar tu consentimiento: ${LEGAL_ENTITY.email}.`,
      `Domicilio del Responsable: ${LEGAL_ENTITY.address}.`,
      "Aunque también estamos en Instagram, las solicitudes sobre datos personales deben hacerse por correo electrónico: es el medio en el que queda constancia de la solicitud y de su fecha, que es lo que activa los plazos de respuesta de la sección 9.",
    ],
  },
];

export default function PrivacyPolicy() {
  const lastUpdated = "18 de agosto de 2026";

  return (
    <LegalLayout
      eyebrow={LEGAL_ENTITY.tradeName}
      title="Aviso de Privacidad"
      lastUpdated={lastUpdated}
      highlight={{
        label: "En corto:",
        text: (
          <>
            Solo pedimos los datos necesarios para entregarte tu pedido. No los
            vendemos, no los usamos para publicidad y no te vamos a mandar
            correos promocionales. Sí conservamos el registro de tu compra los
            años que la ley fiscal nos obliga — la sección 6 explica cuánto y
            por qué.
          </>
        ),
      }}
      callout={{
        heading: "Tu código de seguimiento es una credencial",
        text: "El código que te llega por correo abre la página donde se ve el estado de tu pedido, lo que compraste y cuánto pagaste. No pide contraseña: quien tenga el código, entra. Compártelo solo con quien deba verlo, y avísanos si crees que quedó expuesto.",
      }}
      sections={SECTIONS}
      footerNote={`© ${new Date().getFullYear()} ${LEGAL_ENTITY.tradeName}. Todos los derechos reservados.`}
    />
  );
}
