# Continuidad Vital — design system y contratos

SSOT de ingeniería. El pitch vive en `idea.md`. El diseño visual de referencia es `SIRENA - DISEÑO WEB, MOVIL.html` (marca: Continuidad Vital).

## Marca y tokens

Producto de **red hospitalaria / UGCC**, no centro de catástrofe.

| Token | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#F1F4F8` | Fondo |
| `--paper` | `#FFFFFF` | Paneles |
| `--ink` | `#0F1B2D` | Texto |
| `--muted` | `#5A6A7D` | Secundario |
| `--line` | `#E3E8EF` | Bordes |
| `--blue` | `#1D4ED8` | CTA / red |
| `--green` | `#0E9F6E` | Capacidad / confirmar |
| `--amber` | `#B4690E` | Incertidumbre |
| `--red` | `#C24632` | Déficit |

Tipografía: **IBM Plex Sans** (UI) y **IBM Plex Mono** (códigos `PAC-29384`, métricas).

Definidos en `src/app/globals.css`.

## Tres niveles

| Ruta | Nivel | Quién |
| --- | --- | --- |
| `/` | Landing | Pitch |
| `/registro` | 1 Profesional | Micrófono deliberado, transcripción, confirmar |
| `/hospital` | 2 Hospital | Capacidad efectiva UCI/UTI/básica y demanda |
| `/red` | 3 UGCC | Mapa RM, balance, derivación informativa |

Redirects: `/reporte` `/urgencias` `/intake` → `/registro`. `/analisis` `/mando` → `/hospital`.

Mobile Expo (`mobile/`): solo nivel 1 (wearable analog).

## Pipeline de voz

1. Audio deliberado → `POST /api/transcribe` (Groq Whisper, `APIFY_STT_*`).
2. Texto → `POST /api/structure` (DeepSeek, `LLM_*`). Si falla, `shared/clinicalParser.ts`.
3. Humano pulsa **Confirmar y publicar**.
4. Inserta `voice_records` + `clinical_events` y actualiza `demand_waiting`.
5. Web y mobile se enteran por Supabase Realtime.

`confidence` sale siempre `pending_verification` hasta el click humano.

UCI **possible** o **conditional** no suma demanda.

Contrato DeepSeek: ver `ClinicalStructure` en `shared/clinical.ts`.

## Capacidad efectiva

`effective_available = physical_beds - out_of_service - unstaffed - occupied`

Balance = efectiva − demanda. La derivación en `/red` es propuesta informativa.

## Base de datos

SQL para el editor de Supabase (en este orden):

1. `supabase/001_up.sql`
2. `supabase/002_rls.sql`
3. `supabase/003_seed.sql`

Rollback: `supabase/099_down.sql`. Tipos: `shared/database.types.ts`.

Demo sin login. RLS anon SELECT/INSERT/UPDATE. No poner `service_role` en el cliente.

## Variables

| Nombre | Uso |
| --- | --- |
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | Proyecto |
| `SUPABASE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `MAPBOX_TOKEN` / `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapa `/red` |
| `APIFY_STT_*` | Groq Whisper |
| `LLM_*` | DeepSeek |
| `EXPO_PUBLIC_API_URL` | Base de Next para el teléfono |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Cliente mobile |

No commitear `.env`.
