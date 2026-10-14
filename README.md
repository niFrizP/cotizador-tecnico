# Cotizador Tecnico

Aplicacion web para crear, editar, duplicar, previsualizar y exportar cotizaciones en PDF, con persistencia en Supabase.

## Stack

- React 19 + Vite 8
- Supabase (`@supabase/supabase-js`)
- ESLint 9

## Requisitos

- Node.js 20+
- pnpm 9+
- Proyecto Supabase configurado con las tablas/vistas/rpc que usa `src/lib/supabase.js`

## Instalacion

1. Instala dependencias:

```bash
pnpm install
```

2. Crea un archivo `.env` en la raiz del proyecto (`cotizador-tecnico/`) con:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
# Opcional: URL a la que vuelven los correos de recuperacion / acceso
VITE_AUTH_REDIRECT_URL=https://tu-dominio.cl
```

3. Ejecuta las migraciones de `supabase/migrations/` en Supabase → SQL Editor, en orden.
   - `20261014_fase0_save_quote.sql`: guardado transaccional de cotizaciones (`save_quote`).
     Si aun no se ejecuta, la app sigue funcionando con el guardado anterior (no transaccional)
     y muestra un aviso en la consola.

## Scripts

- Desarrollo: `pnpm run dev`
- Build de produccion: `pnpm run build`
- Preview del build: `pnpm run preview`
- Lint: `pnpm run lint`

## Estructura del proyecto

```text
src/
  App.jsx                    estado global, sesion y navegacion entre pantallas
  main.jsx                   punto de entrada (importa index.css)
  index.css                  estilos globales, hover y tamanos tactiles
  components/
    common/Atoms.jsx         Sec, F2, TR, Btn, IB
    views/
      ListView.jsx           listado de cotizaciones
      EditorView.jsx         crear / editar cotizacion
      PreviewView.jsx        vista previa del documento
      SettingsView.jsx       datos del emisor
      ClientsView.jsx        clientes
      AdminView.jsx          usuarios (solo admin)
      LoginView.jsx          inicio de sesion
      ResetPasswordView.jsx  nueva contrasena tras el correo de recuperacion
  constants/ui.js            colores, etiquetas y estilos base
  hooks/useResponsiveLayout.js
  lib/supabase.js            acceso a datos
  utils/
    format.js                fechas (hora local), montos, escapeHtml, safeUrl
    pdf.js                   genera el PDF (HTML escapado + impresion)
    quoteFactory.js          cotizacion / item vacios
    drafts.js                borradores locales por usuario
    image.js                 reduce el logo antes de guardarlo
supabase/migrations/         SQL a ejecutar en Supabase
```

## Flujo principal

1. Cargar cotizaciones, clientes y emisor desde Supabase.
2. Crear o editar una cotizacion desde el editor.
3. Guardar: `save_quote` guarda cotizacion + items en una transaccion y asigna el numero (solo al crear).
4. Generar PDF tras guardar o desde la vista previa.

## Notas

- La fuente Barlow se carga desde Google Fonts en `index.html`.
- El PDF se genera en el navegador y puede ser bloqueado por pop-up blockers (la app avisa).
- Todo texto que entra al PDF se escapa (`escapeHtml`) y los enlaces solo aceptan `http(s)` (`safeUrl`).
