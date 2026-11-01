# ADR 002 — Hybrid CSS: global SCSS tokens + one plain CSS file per component

- **Status:** accepted (in place since the first commit, April 2026)
- **Recorded:** November 2026, reconstructed from the code — the original reasoning was not written down at the time.

## Context

The web app has many pages for six roles, printable documents (report cards, class lists, relevés, student cards), a light and dark theme, and per-school branding (fonts, colours chosen by the school). We wanted:

- one place for design values (colours, spacing, typography, breakpoints);
- styles that live next to the component they belong to;
- no runtime CSS-in-JS cost on the low-end Android phones many parents and teachers use;
- values that can change at runtime (school branding, dark mode).

## Decision

Two layers:

1. **Global SCSS** in `frontend/src/styles/`, compiled once from `main.scss`:
   - `settings/` — design tokens as SCSS variables (`_colors`, `_spacing`, `_typography`, `_breakpoints`, `_shadows`, `_radius`, `_z-index`), turned into **CSS custom properties** on `:root` by `_root.scss` (`--color-primary`, …);
   - `tools/` — mixins (media queries, focus ring, visually hidden);
   - `base/` — reset, typography, forms, print rules;
   - `shared/` and `utilities/` — reusable patterns and helper classes;
   - `themes/_dynamic-branding.scss` — variables overridden at runtime by `ThemeContext` (school fonts, colours, dark mode).
2. **Per-component plain CSS**: each component or page has its own `.css` file next to its `.jsx` (`Button/Button.css`, `TeacherDashboardPage/TeacherDashboardPage.css`), imported by the component. Class names follow BEM with a component prefix (`teacher-dash__eval--overdue`) to avoid collisions without CSS modules.

Vite also injects the `settings/` partials into every `.scss` file (`css.preprocessorOptions.scss.additionalData` in `vite.config.js`), so component SCSS files — when one is needed — can use the tokens directly.

## Consequences

**Good**

- Theme and branding changes are one `setProperty` on `:root`; every component reading `var(--color-primary)` follows.
- Component styles are easy to find and to delete with the component.
- Plain CSS has no runtime cost and works in print styles.

**Costs**

- Nothing enforces the use of tokens in component CSS. Many component files hard-code hex colours (for example, the teacher dashboard's coloured cards), which do not follow the school's branding or the dark theme. New code should prefer `var(--…)` tokens.
- Global class names rely on discipline (BEM prefixes) rather than tooling; a duplicated prefix silently overrides another component.
- Today there are about 200 component `.css` files and 30 `.scss` partials — the split should stay "tokens and global rules in SCSS, component rules in CSS".
