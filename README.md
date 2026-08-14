# SIRENA

Voz clínica deliberada → eventos estructurados → capacidad efectiva de la red hospitalaria. Prototipo HaCAiThon 2026. **Datos 100% sintéticos.** No hay integración con MINSAL, UGCC real ni fichas clínicas.

Tokens, rutas y contrato de IA: [design.md](design.md). Pitch: [idea.md](idea.md).

## Stack

- Web: Next.js (App Router) + TypeScript + Tailwind v4 + Mapbox
- Mobile: Expo SDK 54 + Expo Go (carpeta `mobile/`) + NativeWind v4
- Voz: Groq Whisper (`/api/transcribe`) + DeepSeek (`/api/structure`)
- Datos: Supabase (Postgres + Realtime). SQL en `supabase/`

## Cómo correr la web

```bash
npm install
cp .env.example .env
# pega claves reales (Supabase anon, Groq, DeepSeek, Mapbox)
npm run dev
```

- Landing: http://localhost:3000
- Registro (nivel 1): `/registro`
- Consola hospital (nivel 2): `/hospital`
- Vista de red (nivel 3): `/red`

## Supabase (SQL Editor)

En este orden, **un archivo por vez**:

1. `supabase/001_up.sql`
2. `supabase/002_rls.sql`
3. `supabase/003_seed.sql`

`004_voice_structure.sql` es opcional. Si el editor muestra `Failed to fetch`, no lo necesitas: el formulario queda en `clinical_events.payload`.

Si aparece `policy already exists`, el paso 2 ya corrió: pega **solo** `003_seed.sql`. Ambos archivos ya son reejecutables.

En Database → Replication, confirma que `hospital_capacity`, `clinical_events`, `voice_records` y `discharge_pipeline` están en `supabase_realtime`.

Si necesitas borrar todo: `supabase/099_down.sql`.

## Mobile

SDK 54, la misma que abre el Expo Go de la tienda. No uses SDK 57: pide un Expo Go que aún no está en App Store / Play Store.

```bash
cd mobile
npx expo start
```

QR → **Expo Go**. Misma Wi‑Fi. Si el QR da timeout: `npx expo start --tunnel`.
`EXPO_PUBLIC_API_URL` en el teléfono debe ser `http://IP-LAN:3000`, no localhost.

El teléfono llama a Next para transcribir/estructurar. Las claves LLM no van en el binario.

## Demo de 60 s

1. Abre `/hospital`: UCI de Barros Luco con demanda y capacidad efectiva.
2. En `/registro` (o en Expo) usa **Demo UCI** y **Confirmar y publicar**.
3. La demanda de UCI sube. `/red` pinta el balance.
4. **Demo incertidumbre**: UCI posible, no suma demanda.

## Qué no hace

No diagnostica, no decide derivaciones, no escucha en continuo, no guarda audio, no calcula prioridad clínica autónoma.
