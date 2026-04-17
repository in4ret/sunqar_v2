# Project Rules

These rules apply to the whole repository.

## Components

- Each React component must live in its own folder.
- Related components may be grouped in a feature or domain subfolder such as `layout`.
- Shared components must be re-exported from the nearest domain barrel such as `src/components/layout/index.ts`.
- Do not add `index.ts` files inside individual component folders.
- Import shared components from their domain barrel such as `@/components/layout`.

Example:

- `src/components/layout/header/header.tsx`
- `src/components/layout/footer/footer.tsx`
- `src/components/layout/index.ts`

## Naming

- All project file names and folder names created or renamed during development must use `kebab-case`.
- All CSS class names, including CSS Modules class names, must use `kebab-case`.
- All CSS Modules class lookups must use bracket notation: `styles["class-name"]`, not `styles.className`.

## Styles

- Use shared breakpoint variables from `src/styles/breakpoints.scss` for responsive `@media` rules.
- Do not introduce numeric breakpoint literals such as `640px` or `960px` directly in `@media` conditions when the shared breakpoint variables apply.

## Commands

- Never run `next build` in this repository.
- Do not use `npm run build` or any other command that triggers `next build`.
- If verification is needed, use non-build checks only, such as `npm run lint`, unless the user explicitly says otherwise.

Examples:

- `header.tsx`
- `footer.module.scss`
- `src/components/layout/header`
- `.site-header`
- `.hero-card`
- `styles["hero-card"]`
