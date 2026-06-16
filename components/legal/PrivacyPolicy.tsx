import LegalLayout from "@/components/legal/LegalLayout";

const SECTIONS = [
  {
    title: "1. Responsable del Tratamiento de Datos",
    body: [
      "Botas Don Chuy Outlet (en adelante «el Responsable») es el encargado del tratamiento de los datos personales que recopile a través de este sitio web y de cualquier otro canal de comunicación asociado.",
    ],
  },
  {
    title: "2. Datos que Recopilamos",
    body: [
      "Recopilamos exclusivamente los datos estrictamente necesarios para procesar y entregar tu pedido:",
      "• Nombre completo del destinatario.\n• Dirección de entrega (calle, número, colonia, ciudad, estado y código postal).\n• Número de teléfono de contacto para la paquetería.\n• Correo electrónico para el envío de confirmación de pedido y número de guía.",
      "No recopilamos datos bancarios ni de tarjeta directamente; el procesamiento de pagos es manejado por el proveedor de pagos correspondiente bajo sus propias políticas de seguridad.",
    ],
  },
  {
    title: "3. Finalidad del Tratamiento",
    body: [
      "Los datos personales proporcionados se utilizan única y exclusivamente para:",
      "• Procesar y confirmar tu pedido.\n• Coordinar el envío con la empresa de paquetería.\n• Comunicarte el número de guía y actualizaciones relevantes del estado de tu envío.\n• Atender aclaraciones relacionadas con tu pedido en caso de incidencia.",
      "Bajo ninguna circunstancia se utilizarán tus datos para fines publicitarios, de mercadotecnia o de elaboración de perfiles sin tu consentimiento expreso adicional.",
    ],
  },
  {
    title: "4. Conservación de los Datos",
    body: [
      "Los datos personales se conservan durante el tiempo necesario para completar la entrega de tu pedido y un período adicional breve destinado a resolver posibles aclaraciones o reportes, generalmente no mayor a 30 (treinta) días naturales contados a partir de la fecha de entrega confirmada por la paquetería.",
      "Transcurrido dicho período, los datos son eliminados de nuestros registros activos. Únicamente se conservan datos de manera anonimizada o agrupada (sin posibilidad de identificación individual) con fines estadísticos internos.",
      "Los tiempos de entrega pueden variar por factores externos (zona geográfica, disponibilidad de la paquetería, contingencias logísticas), por lo que el período de conservación podría extenderse proporcionalmente hasta la resolución del envío.",
    ],
  },
  {
    title: "5. Transferencia de Datos a Terceros",
    body: [
      "Los datos de envío (nombre, dirección y teléfono) son compartidos con la empresa de paquetería contratada para gestionar la entrega. Dicha empresa actúa como encargada del tratamiento y está obligada a utilizarlos exclusivamente para tal fin.",
      "No vendemos, rentamos ni cedemos tus datos personales a terceros con fines comerciales.",
    ],
  },
  {
    title: "6. Seguridad de los Datos",
    body: [
      "Adoptamos medidas técnicas y organizativas razonables para proteger tus datos personales contra acceso no autorizado, pérdida, alteración o divulgación. Sin embargo, ningún sistema de transmisión o almacenamiento en Internet es cien por ciento seguro.",
    ],
  },
  {
    title: "7. Derechos ARCO",
    body: [
      "De conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), tienes derecho a:",
      "• Acceder a tus datos personales en nuestro poder.\n• Rectificar datos inexactos o incompletos.\n• Cancelar el tratamiento de tus datos cuando no sean necesarios para la finalidad informada.\n• Oponerte al tratamiento de tus datos para finalidades distintas a las autorizadas.",
      "Para ejercer cualquiera de estos derechos, escríbenos a los canales de contacto disponibles en el pie de página, indicando tu nombre, número de pedido y el derecho que deseas ejercer. Daremos respuesta en un plazo máximo de 20 (veinte) días hábiles.",
    ],
  },
  {
    title: "8. Uso de Cookies",
    body: [
      "Este sitio puede utilizar cookies técnicas estrictamente necesarias para el funcionamiento del carrito de compra y la sesión de navegación. No se utilizan cookies de rastreo ni de publicidad comportamental de terceros.",
    ],
  },
  {
    title: "9. Cambios a esta Política",
    body: [
      "Botas Don Chuy Outlet puede actualizar esta Política de Privacidad en cualquier momento. La versión vigente estará siempre disponible en esta página con la fecha de última actualización indicada en el encabezado.",
    ],
  },
  {
    title: "10. Legislación Aplicable",
    body: [
      "Esta Política se rige por la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y demás disposiciones aplicables en los Estados Unidos Mexicanos.",
    ],
  },
];

export default function PrivacyPolicy() {
  const lastUpdated = "12 de junio de 2026";

  return (
    <LegalLayout
      eyebrow="Botas Don Chuy Outlet"
      title="Política de Privacidad"
      lastUpdated={lastUpdated}
      highlight={{
        label: "Compromiso:",
        text: (
          <>
            Solo recopilamos los datos necesarios para entregar tu pedido. No
            los vendemos ni los usamos para publicidad. Se eliminan poco
            después de que recibes tu compra.
          </>
        ),
      }}
      sections={SECTIONS}
      footerNote={`© ${new Date().getFullYear()} Botas Don Chuy. Todos los derechos reservados.`}
    />
  );
}
