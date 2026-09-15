# Tema — conocimientos básicos

> Guía de referencia del sistema de temas de esta app. Explica dónde vive cada
> pieza, cómo se aplica un tema, qué tokens existen y cómo agregar uno nuevo.
> Estado: **vigente** · Última actualización: 2026-09-15.

---

## 1. Mapa de archivos

| Pieza | Archivo | Responsabilidad |
|---|---|---|
| Tokens por tema | `app/theme/theme-tokens.ts` | La fuente de verdad: base compartida + mapas por tema (light/dark/aura/cruip-light/cruip-dark). Exporta `themes`, `ThemeId`, `lightTokens`, etc. |
| Cookie y clases | `app/lib/theme.ts` | Preferencia en cookie (SSR-safe), `parseTheme`, `themeClass`, `applyTheme`. |
| CSS estático por tema | `app/root.tsx` (`tokensToCss()`) | Emite un bloque de variables por clase (`:root`, `.dark`, `.aura`, `.cruip-light`, `.cruip-dark`) + fallback de `prefers-color-scheme`. |
| Tailwind v4 | `app/app.css` | Sección 2: paleta build-time. Sección 2.5: registro `@theme inline` de los tokens UI con `var()` autorreferencial. Sección 3: tokens MCP. Sección 6: paleta de la prosa (`--tw-prose-*`). |
| Selector | `app/routes/settings.tsx` | Las opciones del selector de Tema (`OPCIONES`). |

## 2. Cómo fluye un tema

1. La preferencia vive en la cookie `theme` (no en localStorage — con SSR el
   servidor debe pintar la clase correcta en el `<html>` antes de hidratar).
2. `root.tsx` lee la cookie, pone la clase (`themeClass`) y emite los bloques
   de tokens estáticos: la clase seleccionada gana por especificidad CSS.
3. Sin clase explícita (`system`), manda `prefers-color-scheme`.
4. Al cambiar en Ajustes: `applyTheme()` escribe la cookie, cambia las clases
   y revalida; el SSR responde ya con el tema nuevo.
5. Un valor de cookie inválido cae a `system` sin romper nada.

## 3. Los dos niveles de tokens

**A. Semánticos MCP** (sección 3 de `app.css` + `theme-tokens.ts`) — los que
usa el esqueleto de la app: `--color-background-primary/secondary/…`,
`--color-text-primary/secondary/tertiary`, `--color-border-*`, `--color-ring-*`.
Cambian con el tema.

**B. Tokens UI canónicos** (sección 2.5 + mapas `ui*Tokens`) — los que consumen
los componentes nuevos (Sidebar, cards, chat, popovers):

- `--color-primary`, `--color-primary-hover`, `--color-primary-subtle`, `--color-primary-text` — acento del tema
- `--color-canvas` (fondo general), `--color-surface` (cards/paneles), `--color-surface-subtle`, `--color-sidebar`
- `--color-border`, `--color-border-subtle` — divisores y bordes
- `--color-text-main`, `--color-text-muted`, `--color-text-caption` — jerarquía de texto
- `--color-badge-bg`, `--color-badge-text` — píldoras
- `--color-success-bg/text`, `--color-danger-bg/text` — estados
- `--shadow-xs/sm/md/lg/hairline` — sombras por tema

**Todos los temas definen el set completo**: un componente nunca debe quedar
sin variable. Agregar un token nuevo exige valor en los 5 temas.

## 4. Cómo consumirlos en componentes

```tsx
// ✅ correcto — siempre variables del tema
<div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-main)]">

// ❌ prohibido — color fijo o escala cruda
<div className="bg-white text-slate-900 dark:bg-slate-800">
```

Reglas:
- Cero colores hardcodeados en componentes; toda variación claro/oscuro sale
  del tema activo.
- Los tokens UI no pisan a los MCP: si un nombre colisiona (ej. `text-primary`
  vs `--color-text-primary`), se namespaced (`--color-sidebar-title` fue el
  caso histórico; hoy `--color-text-main` cumple ese rol).

## 5. Temas registrados

- **light** — neutro con acento azul (`#5c98f9`), superficies blancas.
- **dark** — neutro oscuro (`#22252a`), acento índigo claro `#818cf8`.
- **aura** — púrpura/negro (`#15141b`), acento `#a277ff`, mono-first.
- **cruip-light** — estética Cruip: slate + índigo `#6366f1`, canvas `#f8fafc`, surface blanco.
- **cruip-dark** — slate 900/800, acento `#6366f1`, primary-subtle `rgba(99,102,241,.15)`.
- **system** — no es tema: delega en `prefers-color-scheme` (usa tokens de dark).

## 6. Receta: agregar un tema nuevo

1. **`app/theme/theme-tokens.ts`** — define `nuevoColorTokens` (mapa MCP) y
   `uiNuevoTokens` (los 19 UI + sombras); exporta `nuevoTokens = { …baseTokens, …nuevoColorTokens, …uiNuevoTokens }`.
2. **Registra** en `ThemeId` y en el mapa `themes: { nuevo: { variant, tokens } }`.
3. **`app/lib/theme.ts`** — agrega el id a `ThemeId`, a `parseTheme` y a la
   lista de `classList.remove` de `applyTheme`.
4. **`app/root.tsx`** — agrega `block(".nuevo", themes.nuevo.tokens)` y añade
   `:not(.nuevo)` al fallback de `prefers-color-scheme`.
5. **`app/routes/settings.tsx`** — opción nueva en `OPCIONES`.

## 7. Trampas conocidas

- **El fallback `:not()`**: si agregas un tema y no lo excluyes del selector
  `:root:not(.light):not(.dark):not(.aura):not(.cruip-light):not(.cruip-dark)`,
  el modo oscuro del sistema pisa sus tokens cuando el usuario lo elige.
- **Sombras**: estuvieron registradas con `initial` y no emitían nada. Hoy son
  `var(--shadow-*)` en `app.css` y necesitan valor en **todos** los temas
  (incluido `--shadow-xs`).
- **Hidratación**: nada que dependa de `localStorage` o de la hora local puede
  pintarse en el primer render SSR (ver el timestamp de `UserMessageItem`).
- **Prosa markdown**: la paleta de `@tailwindcss/typography` se gobierna con
  `--tw-prose-*` en `app.css`, mapeados a tokens — no con clases de color.
- **Arbitrary values con opacidad**: `bg-[var(--color-primary-subtle)]/30` es
  válido en Tailwind v4 (resuelve con `color-mix`).

## 8. Componentes que consumen tokens (mapa rápido)

- `app/components/Sidebar/*` — Sidebar atomic (demo) y `NavigationPanel` (sidebar real)
- `app/components/ModelSelector/*` — popover de modelo
- `app/components/Conversation/*` — feed de mensajes
- `app/components/ChatInput*.tsx`, `app/components/ui/card.tsx` — caja de chat y cards
- `app/components/Layout/*` — canvas como fondo general
