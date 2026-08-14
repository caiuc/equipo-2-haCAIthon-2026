1. Contexto y Propósito del SistemaContinuidad Vital es una plataforma web para la coordinación y gestión operativa de catástrofes entre empresas, servicios de salud y coordinadores sanitarios. Su meta central es minimizar el tiempo entre la interrupción de un servicio crítico (ej. diálisis, pacientes electrodependientes) y la asignación efectiva de una acción de rescate o derivación.Importante: La aplicación funciona íntegramente con datos de Mockup locales y simulaciones determinísticas para propósitos de hackathon/MVP. No requiere conexión con sistemas clínicos reales ni APIs gubernamentales externas.2. Stack Tecnológico MandatorioCapa / MóduloTecnologíaRol en la AplicaciónFramework BaseNext.js (App Router) + TypeScriptArquitectura modular de componentes, renderizado híbrido y rutas API locales.Diseño y LayoutTailwind CSSEstilos utilitarios, layout responsive del Centro de Mando, dark/light mode y tipografía.AnimacionesAnime.jsMicrointeracciones, transiciones de estados en la cola de acciones, alertas pulsantes y métricas en vivo.CartografíaMapbox GL JS (mapbox-gl / react-map-gl)Visualización geoespacial de centros operativos, zonas aisladas, incidentes y rutas bloqueadas.Speech-to-TextWhisper FlowCaptura de reportes de voz en terreno (cuidadores/operadores) y transcripción rápida a texto.Capa de DatosMock Data Layer (In-Memory / React Context)Estado reactivo con datos simulados predefinidos para la demo de 4 minutos.3. Modelo de Datos y Tipos TypeScript (/types)TypeScriptexport type NeedType = "DIALYSIS" | "ELECTRIC_SUPPORT";
export type MobilityStatus = "INDEPENDENT" | "REQUIRES_TRANSPORT";
export type ContactStatus = "PENDING" | "CONTACTED" | "UNREACHABLE";
export type CaseStatus = "OPEN" | "ASSIGNED" | "RESOLVED";

export interface PatientNeed {
  id: string;
  anonymousCode: string;
  needType: NeedType;
  clinicalPriority: "DEFINED_BY_PROVIDER";
  nextRequiredAttention: string; // ISO Date String
  backupHoursRemaining: number | null;
  currentZone: string;
  coordinates: [number, number]; // [lng, lat]
  mobility: MobilityStatus;
  contactStatus: ContactStatus;
  caseStatus: CaseStatus;
}

export type OperationalStatus = "OPEN" | "PARTIAL" | "CLOSED";
export type ElectricityStatus = "GRID" | "BACKUP" | "NONE";
export type AccessStatus = "ACCESSIBLE" | "RESTRICTED" | "BLOCKED";

export interface FacilityStatus {
  facilityId: string;
  name: string;
  operationalStatus: OperationalStatus;
  availableCapacity: number;
  electricity: ElectricityStatus;
  backupHours: number | null;
  waterAvailable: boolean;
  accessStatus: AccessStatus;
  coordinates: [number, number]; // [lng, lat]
  updatedAt: string;
  verificationStatus: "PENDING" | "VERIFIED";
}

export type ActionType = "CONTACT" | "TRANSPORT" | "GENERATOR" | "TRANSFER";
export type AssignmentStatus = "PROPOSED" | "APPROVED" | "IN_PROGRESS" | "COMPLETED";

export interface Assignment {
  id: string;
  patientNeedId: string;
  facilityId: string | null;
  actionType: ActionType;
  responsibleTeam: string;
  status: AssignmentStatus;
  createdAt: string;
}

export interface IncidentMarker {
  id: string;
  type: "ROAD_BLOCKED" | "POWER_OUTAGE" | "FLOOD_ZONE";
  coordinates: [number, number];
  description: string;
}
4. Módulos Funcionales a ConstruirMódulo 1: Ingreso Multicanal con Whisper FlowGrabador de Audio UI: Botón de captura por voz estilizado con Tailwind CSS.Integración Whisper Flow: Transcripción de audio a texto libre (ej. "Quedan 4 horas de batería, no tenemos agua en el centro norte y el acceso está cortado").Parser Estructurador (Mock): Extrae variables clave (power_status, backup_hours, water_status, etc.) y prellena el formulario de verificación antes del envío.Módulo 2: Motor de Continuidad Operacional (Lógica Determinística)Cálculo de Riesgo Operacional de Interrupción en TypeScript:Evalúa backupHoursRemaining <= 4 o nextRequiredAttention < now + 8h.Si el centro de origen pasa a CLOSED o PARTIAL, genera una OperationalAlert.Matching Operacional: Sugiere instalaciones (FacilityStatus) con availableCapacity > 0, waterAvailable === true y accessStatus === "ACCESSIBLE".Módulo 3: Centro de Mando (Dashboard & Cola de Acciones)Barra de Indicadores: Casos abiertos, cupos operativos, generadores disponibles y alertas críticas.Cola de Acciones: Tabla interactiva de gestión donde el coordinador puede:Ver el caso (ej. Paciente D-014).Revisar la acción propuesta (ej. Derivación a Clínica B).Botón "Aprobar Acción" (actualiza el estado de la asignación y reubica la fila con una animación fluida).Módulo 4: Visualizador Territorial con Mapbox GLInstalaciones de Salud: Marcadores interactivos según estado (OPEN = Verde, PARTIAL = Amarillo, CLOSED = Rojo).Incidentes: Capas de polígonos/puntos para rutas bloqueadas y cortes de energía.Zonas de Pacientes: Visualización por clúster o zonas agregadas (resguardando privacidad).Módulo 5: Capa de Animación (Anime.js)Pulso de Alerta: Efecto visual en tiempo real en casos con menos de 2 horas de autonomía.Transiciones de Cola: Transición suave cuando un caso pasa de OPEN a ASSIGNED tras la aprobación del coordinador.Counters: Incremento animado en los números de las tarjetas de métricas al cargar o mutar el estado.5. Estructura de Carpetas SugeridaPlaintext/src
├── app/
│   ├── layout.tsx            # Shell principal con Tailwind
│   ├── page.tsx              # Centro de Coordinación / Dashboard
│   └── intake/               # Formulario de ingreso (Whisper Flow STT)
├── components/
│   ├── dashboard/
│   │   ├── ActionQueue.tsx   # Cola de prioridades y aprobaciones
│   │   ├── MetricsHeader.tsx # Indicadores clave
│   │   └── AlertItem.tsx     # Alerta con animación Anime.js
│   ├── map/
│   │   └── MapboxViewer.tsx  # Componente mapa de Mapbox GL JS
│   ├── voice/
│   │   └── VoiceIntake.tsx   # Grabador Whisper Flow + formulario
│   └── ui/                   # Botones, modales y badges con Tailwind
├── lib/
│   ├── engine/
│   │   └── continuity.ts     # Lógica de alertas y matching determinístico
│   ├── animations/
│   │   └── transitions.ts    # Helpers de Anime.js
│   └── mock/
│       ├── data.ts           # Pacientes, centros e incidentes de prueba
│       └── mockStore.tsx     # React Context / Hook de estado simulado
└── types/
    └── index.ts              # Interfaces TypeScript compartidas
6. Guía de Ejecución para el AgenteInicialización: Crear componentes limpios tipados estrictamente en TypeScript.Estado en Memoria: Implementar un proveedor de contexto (MockDataProvider) que permita disparar eventos simulados (ej. "Simular caída de agua en Centro Norte").Mapbox Setup: Configurar el mapa con token de entorno (NEXT_PUBLIC_MAPBOX_TOKEN) y cargar marcadores basados en las coordenadas del archivo mock.Validación de Estilos: Asegurar layout responsivo, alto contraste para emergencias y microinteracciones no bloqueantes.