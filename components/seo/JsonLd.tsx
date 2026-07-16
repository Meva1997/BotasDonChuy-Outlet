// Inyecta un bloque de datos estructurados (schema.org) en el HTML.
//
// Va como <script type="application/ld+json"> dentro del body: Next lo deja pasar
// tal cual en el HTML del servidor, que es lo único que el crawler necesita (no es
// JS ejecutable, no hidrata, no cuesta nada en cliente).
//
// El payload lo arma el servidor desde nuestra propia API — nunca es input del
// usuario — pero `</script>` dentro de una cadena cerraría la etiqueta antes de
// tiempo y rompería el parseo, así que se escapa igual.
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
