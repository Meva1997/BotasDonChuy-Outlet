# Botas Don Chuy — Outlet

Tienda en línea para Botas Don Chuy, especializada en calzado y accesorios de estilo vaquero. Esta es la aplicación frontend del outlet.

## Stack

- **Next.js** con App Router
- **React 19**, **TypeScript**
- **Tailwind CSS v4**
- **pnpm** como gestor de paquetes

## Comandos

```bash
pnpm dev        # Servidor de desarrollo (localhost:3000)
pnpm build      # Build de producción
pnpm lint       # ESLint
```

## Estructura

```
app/              # Next.js App Router
  layout.tsx      # Layout raíz: fuentes, clases base, metadata
  page.tsx        # Página principal
components/
  home/           # Secciones de la página (NavHeader, Hero, Footer)
  ui/             # Primitivos reutilizables (CategoryCard)
```

## Rutas planeadas

`/outlet`, `/botas`, `/sombreros`, `/ropa`, `/admin`, `/carrito`, `/nosotros`, `/devoluciones`, `/envios`
