import { describe, expect, it } from "vitest";
import { joinTranscript, mergeSpeechResults } from "./speech";

describe("speech transcript accumulation", () => {
  it("separates final and interim browser results", () => {
    expect(
      mergeSpeechResults("Paciente PAC-29384", [
        { isFinal: true, transcript: "masculino de 72 años" },
        { isFinal: false, transcript: "requiere hospitalización" },
      ]),
    ).toEqual({
      finalTranscript: "Paciente PAC-29384 masculino de 72 años",
      interimTranscript: "requiere hospitalización",
    });
  });

  it("preserves the accumulated prefix after a recognition restart", () => {
    const first = mergeSpeechResults("", [
      { isFinal: true, transcript: "Paciente estable" },
    ]);
    const restarted = mergeSpeechResults(first.finalTranscript, [
      { isFinal: true, transcript: "requiere aislamiento" },
    ]);
    expect(restarted.finalTranscript).toBe(
      "Paciente estable requiere aislamiento",
    );
  });

  it("normalizes whitespace when Whisper replaces the provisional text", () => {
    expect(joinTranscript("  Paciente estable ", " requiere   UTI ")).toBe(
      "Paciente estable requiere UTI",
    );
  });
});
