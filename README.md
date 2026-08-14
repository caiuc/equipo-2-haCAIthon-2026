# Continuidad Vital

Plataforma web de **coordinación operacional** para catástrofes: reduce el tiempo entre “se interrumpió un tratamiento” y “alguien asumió una acción concreta”.

El mapa y la voz son apoyo. El producto es la **cola de acciones** (responsable + estado).

> Datos 100% ficticios. No hay integración con registros clínicos, SENAPRED, MINSAL ni empresas eléctricas.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Anime.js
- Mapbox GL JS (`mapbox-gl` / `react-map-gl`)
- Captura de voz (Web Speech API como canal tipo Whisper Flow) + parser mock
- Estado en memoria (React Context)

## Cómo correrlo

```bash
npm install
cp .env.example .env.local   # opcional: NEXT_PUBLIC_MAPBOX_TOKEN
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Ingreso multicanal: `/intake`.

Sin token de Mapbox, el visor territorial esquemático sigue mostrando centros, zonas agregadas e incidentes.

La captura de voz usa Whisper (vía `/api/transcribe`) si hay `APIFY_STT_API_KEY` en `.env`. Si no, cae a Web Speech API o a frases de demo. El parser que estructura el texto es mock y exige confirmación humana.

## Demo de 4 minutos

1. Un centro de diálisis pierde agua y queda parcialmente operativo (botón de simulación o reporte de voz).
2. El parser estructura el texto; un humano confirma.
3. El motor detecta pacientes próximos a quedar sin alternativa.
4. Encuentra cupos en centros operativos.
5. El coordinador aprueba traslados.
6. Asigna un generador a un caso electrodependiente.
7. El tablero muestra responsables y casos todavía pendientes.

## Qué no hace

No calcula prioridad clínica, no diagnostica, no descarta pacientes y no verifica por sí solo que un reporte sea verdadero.
