# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v55.0.0/ before writing any code.

# Nova App context

Before changing application code, read `docs/AI-CONTEXT.md`. Before changing authentication,
WatermelonDB, entities, Pull, Push, IDs, deletion, scope, or conflicts, also read `docs/SYNC.md`.

Keep documentation synchronized with behavior. When adding a sync resource or changing an
offline-first invariant, update the relevant file under `docs/` in the same change.

## Reuse the app's N-Series

- Before creating a control, table, filter, or form layout, check the component map in
  `docs/AI-CONTEXT.md` and its implementation. Extend an existing `N*` component when the behavior
  belongs to the app-wide standard.
- App screens use `NButton` from `src/components/forms` for actions. `components/ui/` contains the
  underlying primitives; use them inside shared components such as `NButton`, not directly in new
  screens.
- Use `NText`, `NDate`, `NSelect`, `NSelectDefinition`, `NSwitch`, and `NFormPanel` for their matching
  controls. Use `NCrud`/`NCrudTable` for standard offline lists instead of building a second table.
- Add reusable controls under `src/components/forms/`; add reusable list behavior under
  `src/components/crud/`; add module-specific controls under `src/components/<module>/`. Export new
  shared components from the relevant `index.ts` and add them to the component map.
- Preserve the app's standard 32 px control height, Poppins typography, theme tokens, disabled and
  loading accessibility state, and web/native behavior. A screen may use another size only for a
  concrete interaction need and should pass the size explicitly.
