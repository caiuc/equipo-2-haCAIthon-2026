"use client";

import { BedAdmissionForm } from "@/components/urgencias/BedAdmissionForm";
import { BedVoiceIntake } from "@/components/urgencias/BedVoiceIntake";
import { WhisperDemoPanel } from "@/components/urgencias/WhisperDemoPanel";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import { DEMO_BED_ADMIT_PHRASE, parseBedIntakeText } from "@/lib/intake/bedParser";
import { useEffect, useMemo, useState } from "react";

export function UrgenciasWorkspace() {
  const [whisperEnabled, setWhisperEnabled] = useState(false);
  const [highlight, setHighlight] = useState<"demo" | "voice" | "form" | null>(
    null,
  );
  const capture = useVoiceCapture({
    whisperEnabled,
    fallbackToWebSpeech: false,
  });

  useEffect(() => {
    fetch("/api/transcribe/status")
      .then((response) => response.json())
      .then((data: { available?: boolean }) => {
        if (data.available) setWhisperEnabled(true);
      })
      .catch(() => undefined);
  }, []);

  const parsed = useMemo(
    () =>
      capture.transcript.trim()
        ? parseBedIntakeText(capture.transcript)
        : null,
    [capture.transcript],
  );

  async function runDemo() {
    setWhisperEnabled(true);
    setHighlight("demo");
    const status = await fetch("/api/transcribe/status")
      .then((response) => response.json())
      .catch(() => ({ available: false }));
    if (!status.available) {
      capture.setTranscript(DEMO_BED_ADMIT_PHRASE);
      setHighlight("form");
      return;
    }
    setHighlight("voice");
  }

  return (
    <div className="flex flex-col gap-4">
      <WhisperDemoPanel
        whisperEnabled={whisperEnabled}
        onToggleWhisper={setWhisperEnabled}
        onRunDemo={() => void runDemo()}
        highlight={highlight === "demo"}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <BedVoiceIntake
          whisperEnabled={whisperEnabled}
          highlight={highlight === "voice"}
          transcript={capture.transcript}
          onTranscript={capture.setTranscript}
          listening={capture.listening}
          transcribing={capture.transcribing}
          speechError={capture.speechError}
          onStart={() => void capture.startListening()}
          onStop={capture.stopListening}
        />
        <BedAdmissionForm
          key={capture.transcript || "empty"}
          parsed={parsed}
          highlight={highlight === "form"}
          onSaved={() => setHighlight(null)}
        />
      </div>
    </div>
  );
}
