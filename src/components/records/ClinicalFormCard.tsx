"use client";

import {
  CRITICALITY_LABEL,
  EVENT_LABEL,
  patchStructure,
  type ClinicalStructure,
  type IcuCertainty,
} from "@shared/clinical";

const fieldClass =
  "mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--wash)] px-3 py-2 text-sm outline-none disabled:opacity-80";

export function ClinicalFormCard({
  value,
  onChange,
  readOnly = false,
}: {
  value: ClinicalStructure;
  onChange?: (next: ClinicalStructure) => void;
  readOnly?: boolean;
}) {
  function patch(partial: Partial<ClinicalStructure>) {
    onChange?.(patchStructure(value, partial));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Paciente
          <input
            className={fieldClass}
            disabled={readOnly}
            value={value.patient_code_hint ?? ""}
            placeholder="Se genera al publicar"
            onChange={(event) =>
              patch({ patient_code_hint: event.target.value || null })
            }
          />
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Nombre
          <input
            className={fieldClass}
            disabled={readOnly}
            value={value.patient_name ?? ""}
            placeholder="Si se dictó"
            onChange={(event) =>
              patch({ patient_name: event.target.value || null })
            }
          />
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Sexo
          <select
            className={fieldClass}
            disabled={readOnly}
            value={value.sex ?? ""}
            onChange={(event) =>
              patch({
                sex:
                  event.target.value === "M" || event.target.value === "F"
                    ? event.target.value
                    : null,
              })
            }
          >
            <option value="">—</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Edad
          <input
            className={fieldClass}
            disabled={readOnly}
            inputMode="numeric"
            value={value.age_years ?? ""}
            placeholder="Años"
            onChange={(event) => {
              const raw = event.target.value.trim();
              patch({ age_years: raw ? Number(raw) : null });
            }}
          />
        </label>
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Riesgo vital
          <select
            className={fieldClass}
            disabled={readOnly}
            value={
              value.vital_risk === true
                ? "yes"
                : value.vital_risk === false
                  ? "no"
                  : ""
            }
            onChange={(event) =>
              patch({
                vital_risk:
                  event.target.value === "yes"
                    ? true
                    : event.target.value === "no"
                      ? false
                      : null,
              })
            }
          >
            <option value="">No mencionado</option>
            <option value="yes">Sí</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>

      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        Resumen clínico
        <textarea
          className={`${fieldClass} min-h-16 leading-6`}
          disabled={readOnly}
          value={value.clinical_summary ?? ""}
          placeholder="Motivo de ingreso, si se dictó"
          onChange={(event) =>
            patch({ clinical_summary: event.target.value || null })
          }
        />
      </label>

      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        Dictado
        <textarea
          className={`${fieldClass} min-h-24 leading-6`}
          disabled={readOnly}
          value={value.transcript}
          onChange={(event) => patch({ transcript: event.target.value })}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          UCI
          <select
            className={fieldClass}
            disabled={readOnly}
            value={value.icu.certainty}
            onChange={(event) =>
              patch({
                icu: {
                  ...value.icu,
                  certainty: event.target.value as IcuCertainty,
                },
              })
            }
          >
            <option value="not_required">No requerida</option>
            <option value="possible">Posible</option>
            <option value="conditional">Condicional</option>
            <option value="confirmed">Confirmada</option>
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--wash)] px-3 py-2 text-sm">
          <input
            type="checkbox"
            disabled={readOnly}
            checked={Boolean(value.requires_hospitalization)}
            onChange={(event) =>
              patch({ requires_hospitalization: event.target.checked })
            }
          />
          Hospitalización
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--wash)] px-3 py-2 text-sm">
          <input
            type="checkbox"
            disabled={readOnly}
            checked={Boolean(value.uti_required)}
            onChange={(event) => patch({ uti_required: event.target.checked })}
          />
          UTI
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--wash)] px-3 py-2 text-sm">
          <input
            type="checkbox"
            disabled={readOnly}
            checked={Boolean(value.basic_bed_required)}
            onChange={(event) =>
              patch({ basic_bed_required: event.target.checked })
            }
          />
          Cama básica
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--wash)] px-3 py-2 text-sm">
          <input
            type="checkbox"
            disabled={readOnly}
            checked={Boolean(value.isolation_required)}
            onChange={(event) =>
              patch({ isolation_required: event.target.checked })
            }
          />
          Aislamiento
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--wash)] px-3 py-2 text-sm">
          <input
            type="checkbox"
            disabled={readOnly}
            checked={value.discharge_ordered}
            onChange={(event) =>
              patch({ discharge_ordered: event.target.checked })
            }
          />
          Alta / libera cama
        </label>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Cama
        </p>
        {value.bed_actions.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">Sin cambio de cama</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {value.bed_actions.map((item) => (
              <li
                key={`${item.action}-${item.kind}`}
                className="rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm"
              >
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            value.criticality === "high"
              ? "bg-[var(--red-soft)] text-[var(--red)]"
              : value.criticality === "medium"
                ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                : "bg-[var(--green-soft)] text-[var(--green)]"
          }`}
        >
          Criticidad {CRITICALITY_LABEL[value.criticality]}
        </span>
        <span className="text-[11px] text-[var(--muted)]">
          {value.source === "deepseek" ? "Análisis DeepSeek" : "Reglas locales"}
          {value.icu.confidence
            ? ` · ${value.icu.confidence.toFixed(2)}`
            : ""}
        </span>
      </div>

      <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        Análisis de la IA
        <textarea
          className={`${fieldClass} min-h-16 leading-6`}
          disabled={readOnly}
          value={value.analysis ?? ""}
          placeholder={
            value.source === "regex"
              ? "Sin análisis de modelo (fallback de reglas)"
              : "Lo que entendió la IA"
          }
          onChange={(event) => patch({ analysis: event.target.value || null })}
        />
      </label>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Eventos / casos
        </p>
        <ul className="mt-2 space-y-2">
          {value.events.length === 0 ? (
            <li className="text-sm text-[var(--muted)]">Sin eventos extraídos</li>
          ) : (
            value.events.map((event) => {
              const warn = event === "POSSIBLE_ICU_REQUIREMENT";
              return (
                <li
                  key={event}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-3 py-3"
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      warn
                        ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                        : "bg-[var(--green-soft)] text-[var(--green)]"
                    }`}
                  >
                    {warn ? "!" : "✓"}
                  </span>
                  <span className="text-sm font-semibold">{EVENT_LABEL[event]}</span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
