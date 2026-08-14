export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BedKind = "uci" | "uti" | "basica";
export type VoiceStatus = "pending" | "validated" | "edited" | "discarded";
export type EventConfirmation = "proposed" | "confirmed" | "rejected";
export type IcuCertainty =
  | "confirmed"
  | "possible"
  | "not_required"
  | "conditional";
export type EventKind =
  | "REQUIRES_HOSPITALIZATION"
  | "POSSIBLE_ICU_REQUIREMENT"
  | "ICU_CONFIRMED"
  | "UTI_REQUIRED"
  | "BASIC_BED_REQUIRED"
  | "ISOLATION_REQUIRED"
  | "DISCHARGE_ORDERED"
  | "PATIENT_DISCHARGED"
  | "BED_CLEANING"
  | "BED_AVAILABLE"
  | "TRANSFER_SUGGESTED";

export interface Database {
  public: {
    Tables: {
      hospitals: {
        Row: {
          id: string;
          name: string;
          commune: string;
          complexity_level: string;
          lat: number;
          lng: number;
          isolation_available: number;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          commune: string;
          complexity_level: string;
          lat: number;
          lng: number;
          isolation_available?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["hospitals"]["Insert"]>;
        Relationships: [];
      };
      hospital_capacity: {
        Row: {
          hospital_id: string;
          bed_kind: BedKind;
          physical_beds: number;
          out_of_service: number;
          unstaffed: number;
          occupied: number;
          effective_available: number;
          demand_waiting: number;
          projected_4h: number;
          updated_at: string;
        };
        Insert: {
          hospital_id: string;
          bed_kind: BedKind;
          physical_beds: number;
          out_of_service?: number;
          unstaffed?: number;
          occupied?: number;
          effective_available: number;
          demand_waiting?: number;
          projected_4h?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["hospital_capacity"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "hospital_capacity_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          },
        ];
      };
      professionals: {
        Row: {
          id: string;
          hospital_id: string;
          display_name: string;
          unit: string;
        };
        Insert: {
          id?: string;
          hospital_id: string;
          display_name: string;
          unit: string;
        };
        Update: Partial<Database["public"]["Tables"]["professionals"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "professionals_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          },
        ];
      };
      patients: {
        Row: {
          id: string;
          code: string;
          hospital_id: string;
          sex: string | null;
          age_years: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          hospital_id: string;
          sex?: string | null;
          age_years?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["patients"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "patients_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          },
        ];
      };
      voice_records: {
        Row: {
          id: string;
          hospital_id: string;
          professional_id: string | null;
          patient_id: string | null;
          transcript: string;
          duration_seconds: number | null;
          stt_engine: string;
          status: VoiceStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          hospital_id: string;
          professional_id?: string | null;
          patient_id?: string | null;
          transcript: string;
          duration_seconds?: number | null;
          stt_engine?: string;
          status?: VoiceStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["voice_records"]["Insert"]>;
        Relationships: [];
      };
      clinical_events: {
        Row: {
          id: string;
          voice_record_id: string | null;
          hospital_id: string;
          patient_id: string | null;
          event_kind: EventKind;
          icu_certainty: IcuCertainty | null;
          relevant_condition: string | null;
          confidence: number | null;
          confirmation: EventConfirmation;
          payload: Json;
          confirmed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          voice_record_id?: string | null;
          hospital_id: string;
          patient_id?: string | null;
          event_kind: EventKind;
          icu_certainty?: IcuCertainty | null;
          relevant_condition?: string | null;
          confidence?: number | null;
          confirmation?: EventConfirmation;
          payload?: Json;
          confirmed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clinical_events"]["Insert"]>;
        Relationships: [];
      };
      discharge_pipeline: {
        Row: {
          hospital_id: string;
          medical_discharge: number;
          pending_egress: number;
          bed_cleaning: number;
          bed_ready: number;
          updated_at: string;
        };
        Insert: {
          hospital_id: string;
          medical_discharge?: number;
          pending_egress?: number;
          bed_cleaning?: number;
          bed_ready?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["discharge_pipeline"]["Insert"]>;
        Relationships: [];
      };
      transfer_suggestions: {
        Row: {
          id: string;
          from_hospital_id: string;
          to_hospital_id: string;
          bed_kind: BedKind;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_hospital_id: string;
          to_hospital_id: string;
          bed_kind: BedKind;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transfer_suggestions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      bed_kind: BedKind;
      voice_status: VoiceStatus;
      event_confirmation: EventConfirmation;
      icu_certainty: IcuCertainty;
      event_kind: EventKind;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Hospital = Database["public"]["Tables"]["hospitals"]["Row"];
export type HospitalCapacity =
  Database["public"]["Tables"]["hospital_capacity"]["Row"];
export type Professional = Database["public"]["Tables"]["professionals"]["Row"];
export type Patient = Database["public"]["Tables"]["patients"]["Row"];
export type VoiceRecord = Database["public"]["Tables"]["voice_records"]["Row"];
export type ClinicalEvent =
  Database["public"]["Tables"]["clinical_events"]["Row"];
export type DischargePipeline =
  Database["public"]["Tables"]["discharge_pipeline"]["Row"];
export type TransferSuggestion =
  Database["public"]["Tables"]["transfer_suggestions"]["Row"];
