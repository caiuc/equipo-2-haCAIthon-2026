import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVoiceCapture } from "./useVoiceCapture";

class FakeRecognition {
  static instances: FakeRecognition[] = [];

  lang = "";
  interimResults = false;
  continuous = false;
  onresult: ((event: { results: ArrayLike<FakeResult> }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    FakeRecognition.instances.push(this);
  }

  start() {}
  stop() {
    this.onend?.();
  }
  abort() {}

  emit(results: Array<{ transcript: string; isFinal: boolean }>) {
    this.onresult?.({
      results: results.map(({ transcript, isFinal }) =>
        Object.assign([{ transcript }], { isFinal }),
      ),
    });
  }
}

type FakeResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };

class FakeMediaRecorder {
  static instance: FakeMediaRecorder | null = null;

  state: RecordingState = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    FakeMediaRecorder.instance = this;
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["audio"], { type: this.mimeType }),
    } as BlobEvent);
    this.onstop?.();
  }
}

describe("useVoiceCapture", () => {
  beforeEach(() => {
    FakeRecognition.instances = [];
    FakeMediaRecorder.instance = null;
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: FakeRecognition,
    });
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      value: FakeMediaRecorder,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ text: "Paciente corregido por Whisper" }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows interim text, restarts recognition, and applies the Whisper correction", async () => {
    const { result, unmount } = renderHook(() =>
      useVoiceCapture({ whisperEnabled: true, fallbackToWebSpeech: true }),
    );

    await act(async () => {
      await result.current.startListening();
    });
    expect(result.current.phase).toBe("listening");
    expect(FakeRecognition.instances).toHaveLength(1);

    act(() => {
      FakeRecognition.instances[0].emit([
        { transcript: "Paciente PAC-29384", isFinal: true },
        { transcript: "requiere UCI", isFinal: false },
      ]);
    });
    expect(result.current.finalTranscript).toBe("Paciente PAC-29384");
    expect(result.current.interimTranscript).toBe("requiere UCI");

    act(() => FakeRecognition.instances[0].onend?.());
    await waitFor(() => expect(FakeRecognition.instances).toHaveLength(2));

    act(() => result.current.stopListening());
    await waitFor(() => expect(result.current.phase).toBe("review"));
    expect(result.current.finalTranscript).toBe("Paciente corregido por Whisper");
    expect(result.current.sttEngine).toBe("groq-whisper");
    expect(fetch).toHaveBeenCalledWith(
      "/api/transcribe",
      expect.objectContaining({ method: "POST" }),
    );

    unmount();
  });
});
