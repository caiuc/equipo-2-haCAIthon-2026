# SQL SIRENA

Pega **un archivo por vez** en el SQL Editor.

1. `001_up.sql` — tablas
2. `002_rls.sql` — policies (ya se puede repetir)
3. `003_seed.sql` — datos (ya se puede repetir)

`004_voice_structure.sql` es opcional. Si el SQL Editor falla con `Failed to fetch`, no lo pegues: la ficha usa `clinical_events.payload`.

Si el error fue `policy "hospitals_select_demo" already exists`, el 002 ya corrió. **Pega solo `003_seed.sql` ahora.**

Rollback: `099_down.sql`.
