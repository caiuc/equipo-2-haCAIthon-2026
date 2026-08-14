# Continuidad Vital

Plataforma web de **coordinación operacional** para catástrofes: reduce el tiempo entre “se interrumpió un tratamiento” y “alguien asumió una acción concreta”.

El mapa muestra camas libres. El producto es la **cola de acciones** (aprobar / rechazar + responsable).

> Datos 100% ficticios. No hay integración con registros clínicos, SENAPRED, MINSAL ni empresas eléctricas.

Tokens, mapa y contrato de voz: [design.md](design.md).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Anime.js
- Mapbox GL JS (`mapbox-gl` / `react-map-gl`)
- Captura de voz de respaldo + parser mock (Whisper + DeepSeek los conecta el equipo de voz)
- Estado en memoria (React Context)

## Cómo correrlo

```bash
npm install
cp .env.example .env.local
npm run dev
```

- Landing: [http://localhost:3000](http://localhost:3000)
- Análisis: `/analisis`
- Reporte (voz): `/reporte`

El token de Mapbox puede ir como `MAPBOX_TOKEN` o `NEXT_PUBLIC_MAPBOX_TOKEN`. Sin token, hay una vista territorial esquemática.

## Demo

1. En `/analisis`, simula la caída de agua en Centro Norte.
2. Aprueba o rechaza derivaciones: las camas del mapa y del panel cambian.
3. Aprueba el generador de E-008.

## Qué no hace

No calcula prioridad clínica, no diagnostica, no descarta pacientes y no verifica por sí solo que un reporte sea verdadero.
