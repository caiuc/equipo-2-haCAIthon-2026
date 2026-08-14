# SQL Continuidad Vital

Pega **un archivo por vez** en el SQL Editor.

1. `001_up.sql` — tablas
2. `002_rls.sql` — policies (ya se puede repetir)
3. `003_seed.sql` — datos (ya se puede repetir)

Si el error fue `policy "hospitals_select_demo" already exists`, el 002 ya corrió. **Pega solo `003_seed.sql` ahora.**

Rollback: `099_down.sql`.
