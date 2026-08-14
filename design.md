# Continuidad Vital — design system y contratos

Fuente de verdad visual para el equipo. La UI de mapa, landing y camas vive aquí. Whisper + DeepSeek los conecta el compañero de voz **sin cambiar estos tokens ni el shape JSON**.

## Marca

Producto de **centro de operaciones de emergencia**, no un SaaS genérico.

- Claro por defecto (alto contraste). El modo oscuro es opcional.
- Acento teal `#0f766e` (acción / camas libres).
- Ámbar `#b45309` (parcial / pendiente).
- Rojo `#b91c1c` (crítico / bloqueado / rechazado).
- Tipografía: Geist sans para UI, Geist mono para códigos (`D-014`) y métricas.

## Tokens CSS

Definidos en `src/app/globals.css`:

| Token | Claro | Uso |
| --- | --- | --- |
| `--bg` | `#f4f7fb` | Fondo de página |
| `--panel` | `#ffffff` | Tarjetas y cola |
| `--text` | `#102033` | Texto principal |
| `--muted` | `#5b6b82` | Secundario |
| `--teal` | `#0f766e` | CTA y camas libres |
| `--input` | `#f8fafc` | Campos |
| Radio | `0.75rem` (xl) | Paneles |
| Bordes | `rgba(16, 32, 51, 0.12)` | Separadores |

No introducir púrpuras, gradientes “AI glow” ni ilustraciones stock.

## División de trabajo (para no chocar en git)

| Quién | Ruta | Carpetas |
| --- | --- | --- |
| Landing / mapa | `/` y `/analisis` | `src/app/(landing)/`, `src/components/landing/`, `src/components/map/`, `src/components/dashboard/` |
| Voz / reporte | `/reporte` | `src/app/(ops)/reporte/`, `src/components/voice/`, `src/lib/intake/`, `src/app/api/transcribe/` |

Layouts separados: landing no usa `AppShell`. Análisis y reporte sí.

## Páginas

| Ruta | Rol |
| --- | --- |
| `/` | Landing |
| `/analisis` | Cola + Mapbox + camas |
| `/reporte` | Ingreso voz/formulario (Whisper + DeepSeek) |

`/mando` redirige a `/analisis`. `/intake` redirige a `/reporte`.

## Mapa

- Estilo `mapbox://styles/mapbox/light-v11`.
- Token: `MAPBOX_TOKEN` o `NEXT_PUBLIC_MAPBOX_TOKEN` (se expone al cliente en `next.config.ts`).
- Pin de establecimiento: color operacional + **número = camas libres**.
- Popup: estado, agua, acceso, grilla de camas.
- Pacientes **solo por zona agregada**. Nunca un pin individual.
- Al aprobar un traslado el mapa hace `flyTo` al centro destino.

## Camas

Estados de celda (`src/lib/engine/beds.ts`):

| Celda | Significado |
| --- | --- |
| Libre (teal) | Cupo usable ahora |
| Ocupada (slate) | Ya asignada / en uso |
| Bloqueada (rojo) | El centro no es matcheable (sin agua, acceso, cerrado) |

- **Aprobar** TRANSFER/TRANSPORT: `availableCapacity -= 1` → una cama libre pasa a ocupada.
- **Rechazar**: el caso sigue `OPEN`, la asignación queda `REJECTED`, **no** se reserva cama.

`totalCapacity` es el tamaño de la grilla. El matching sigue usando solo `availableCapacity` + agua + acceso.

## Contrato Whisper → DeepSeek → UI

La UI ya llama `applyStructuredUpdate(update)` después de un humano pulsar **Verificar**. DeepSeek debe devolver **exactamente** este objeto (ver `src/lib/intake/parser.ts`):

```json
{
  "target": "facility",
  "facilityNameHint": "Centro Norte",
  "patientCodeHint": null,
  "power_status": "BACKUP",
  "backup_hours": 4,
  "water_status": "unavailable",
  "access_status": "BLOCKED",
  "need_type": null,
  "mobility": null,
  "contact_status": null,
  "confidence": "pending_verification",
  "transcript": "Quedan cuatro horas de generador, no tenemos agua en el centro norte y el acceso está cortado"
}
```

Reglas:

1. `confidence` siempre `pending_verification` hasta el click humano.
2. No diagnosticar, no fijar prioridad clínica, no descartar pacientes.
3. Si DeepSeek falla, el formulario manual y el parser mock siguen siendo el fallback.
4. Punto de enchufe: reemplazar la transcripción en `VoiceIntake` y, si se quiere, el `parseOperationalText` por una ruta `/api/structure` que hable con `LLM_*`. **No mutar el store directo.**

## Variables de entorno (nombres)

| Nombre | Quién |
| --- | --- |
| `MAPBOX_TOKEN` / `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapa |
| `APIFY_STT_*` | STT de respaldo (Groq Whisper) |
| `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` | Compañero DeepSeek |

No commitear `.env`.

## Qué no tocar

Motor clínico, registros reales, SENAPRED/MINSAL, pins de pacientes, autenticación clínica, notificaciones masivas.
