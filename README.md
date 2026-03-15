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
```

## Scripts

- Desarrollo:

```bash
pnpm run dev
```

- Build de produccion:

```bash
pnpm run build
```

- Preview del build:

```bash
pnpm run preview
```

- Lint:

```bash
pnpm run lint
```

## Estructura del proyecto

```text
src/
	App.jsx
	components/
		common/
			Atoms.jsx
		views/
			ListView.jsx
			EditorView.jsx
			PreviewView.jsx
			SettingsView.jsx
	constants/
		ui.js
	utils/
		format.js
		quoteFactory.js
		pdf.js
	lib/
		supabase.js
```

## Arquitectura actual

- `src/App.jsx`: concentra la mayor parte de la logica de UI y negocio (estado, vistas y acciones).
- `src/lib/supabase.js`: capa de acceso a datos (quotes, items, clients, issuer).
- `src/constants/ui.js`, `src/utils/format.js`, `src/utils/quoteFactory.js`, `src/utils/pdf.js`: modulos auxiliares creados para apoyar una separacion progresiva del codigo.
- `src/components/common/*` y `src/components/views/*`: estructura de componentes disponible para continuar la migracion desde `App.jsx`.

## Flujo principal

1. Cargar cotizaciones, clientes y emisor desde Supabase.
2. Crear o editar una cotizacion desde el editor.
3. Guardar (crea o actualiza) y refrescar historial de clientes.
4. Generar PDF automaticamente tras guardar o desde previsualizacion.

## Notas

- La fuente Barlow se carga desde Google Fonts.
- El PDF se genera en el navegador y puede ser bloqueado por pop-up blockers.
- En este workspace, los comandos deben ejecutarse dentro de la carpeta `cotizador-tecnico/` (donde esta `package.json`).
