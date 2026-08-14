import type { ReactNode } from "react";
import {
  CRITICALITY_LABEL,
  EVENT_LABEL,
  patchStructure,
  type ClinicalStructure,
  type IcuCertainty,
} from "@shared/clinical";
import { Pressable, Text, TextInput, View } from "react-native";

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
    <View className="gap-4">
      <View className="flex-row gap-2">
        <Field label="Paciente" className="flex-1">
          <TextInput
            editable={!readOnly}
            className="mt-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink"
            value={value.patient_code_hint ?? ""}
            placeholder="Se genera al publicar"
            onChangeText={(text) => patch({ patient_code_hint: text || null })}
          />
        </Field>
        <Field label="Edad" className="w-24">
          <TextInput
            editable={!readOnly}
            keyboardType="number-pad"
            className="mt-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink"
            value={value.age_years ? String(value.age_years) : ""}
            placeholder="Años"
            onChangeText={(text) =>
              patch({ age_years: text.trim() ? Number(text) : null })
            }
          />
        </Field>
      </View>

      <Field label="Nombre">
        <TextInput
          editable={!readOnly}
          className="mt-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink"
          value={value.patient_name ?? ""}
          placeholder="Si se dictó un nombre"
          onChangeText={(text) => patch({ patient_name: text || null })}
        />
      </Field>

      <Field label="Resumen clínico">
        <TextInput
          editable={!readOnly}
          multiline
          className="mt-1 min-h-16 rounded-xl border border-line bg-paper px-3 py-2 text-sm leading-5 text-ink"
          value={value.clinical_summary ?? ""}
          placeholder="Motivo de ingreso, si se dictó"
          onChangeText={(text) => patch({ clinical_summary: text || null })}
        />
      </Field>

      <Field label="Dictado">
        <TextInput
          editable={!readOnly}
          multiline
          className="mt-1 min-h-24 rounded-xl border border-line bg-paper px-3 py-2 text-sm leading-5 text-ink"
          value={value.transcript}
          onChangeText={(text) => patch({ transcript: text })}
        />
      </Field>

      <Field label="UCI">
        <View className="mt-2 flex-row flex-wrap gap-2">
          {(
            [
              ["not_required", "No"],
              ["possible", "Posible"],
              ["conditional", "Si empeora"],
              ["confirmed", "Confirmada"],
            ] as Array<[IcuCertainty, string]>
          ).map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              active={value.icu.certainty === key}
              disabled={readOnly}
              onPress={() =>
                patch({ icu: { ...value.icu, certainty: key } })
              }
            />
          ))}
        </View>
      </Field>

      <View className="flex-row flex-wrap gap-2">
        <Chip
          label="Hospitalización"
          active={Boolean(value.requires_hospitalization)}
          disabled={readOnly}
          onPress={() =>
            patch({ requires_hospitalization: !value.requires_hospitalization })
          }
        />
        <Chip
          label="UTI"
          active={Boolean(value.uti_required)}
          disabled={readOnly}
          onPress={() => patch({ uti_required: !value.uti_required })}
        />
        <Chip
          label="Cama básica"
          active={Boolean(value.basic_bed_required)}
          disabled={readOnly}
          onPress={() =>
            patch({ basic_bed_required: !value.basic_bed_required })
          }
        />
        <Chip
          label="Aislamiento"
          active={Boolean(value.isolation_required)}
          disabled={readOnly}
          onPress={() =>
            patch({ isolation_required: !value.isolation_required })
          }
        />
        <Chip
          label="Alta / libera"
          active={value.discharge_ordered}
          disabled={readOnly}
          onPress={() => patch({ discharge_ordered: !value.discharge_ordered })}
        />
        <Chip
          label="Riesgo vital"
          active={value.vital_risk === true}
          disabled={readOnly}
          onPress={() =>
            patch({ vital_risk: value.vital_risk === true ? null : true })
          }
        />
      </View>

      <View>
        <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-muted">
          Cama
        </Text>
        {value.bed_actions.length === 0 ? (
          <Text className="mt-2 text-sm text-muted">Sin cambio de cama</Text>
        ) : (
          value.bed_actions.map((item) => (
            <Text
              key={`${item.action}-${item.kind}`}
              className="mt-2 rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink"
            >
              {item.label}
            </Text>
          ))
        )}
      </View>

      <Text
        className={`self-start rounded-full px-2 py-1 text-[11px] font-semibold ${
          value.criticality === "high"
            ? "bg-cvred/15 text-cvred"
            : value.criticality === "medium"
              ? "bg-cvamber/15 text-cvamber"
              : "bg-cvgreen/15 text-cvgreen"
        }`}
      >
        Criticidad {CRITICALITY_LABEL[value.criticality]}
      </Text>

      <Field label="Análisis de la IA">
        <TextInput
          editable={!readOnly}
          multiline
          className="mt-1 min-h-16 rounded-xl border border-line bg-paper px-3 py-2 text-sm leading-5 text-ink"
          value={value.analysis ?? ""}
          placeholder={
            value.source === "regex"
              ? "Sin análisis de modelo (fallback de reglas)"
              : "Lo que entendió la IA"
          }
          onChangeText={(text) => patch({ analysis: text || null })}
        />
      </Field>

      <View>
        <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-muted">
          Eventos / casos
        </Text>
        {value.events.length === 0 ? (
          <Text className="mt-2 text-sm text-muted">Sin eventos extraídos</Text>
        ) : (
          value.events.map((event) => (
            <Text
              key={event}
              className="mt-2 rounded-xl border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink"
            >
              {event === "POSSIBLE_ICU_REQUIREMENT" ? "! " : "✓ "}
              {EVENT_LABEL[event]}
            </Text>
          ))
        )}
      </View>
    </View>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={className}>
      <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-muted">
        {label}
      </Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`rounded-full px-3 py-1.5 ${
        active ? "bg-cvblue/15" : "bg-paper border border-line"
      }`}
    >
      <Text
        className={`text-xs font-semibold ${active ? "text-cvblue" : "text-ink"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
