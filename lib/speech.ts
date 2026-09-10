/**
 * Client-only Web Speech API wrapper for voice input.
 *
 * Uses the browser's built-in `SpeechRecognition` / `webkitSpeechRecognition`
 * to transcribe Indonesian speech (`id-ID`) locally — no audio upload, no
 * API key, no server round-trip. Falls back gracefully when the API is
 * unavailable (Firefox, old Safari) by returning `null` so the dialog can
 * surface the typed-input path instead.
 *
 * Must ONLY be called from client event handlers or effects — never at module
 * top level (Next 16 client-component rule; also, `window` is undefined on
 * the server).
 */

declare global {
  /** Minimal subset of the Web Speech API Surface we actually touch. */
  interface SpeechRecognitionEvent {
    resultIndex: number;
    results: ArrayLike<{
      isFinal: boolean;
      0: { transcript: string };
    }>;
  }
  interface SpeechRecognitionErrorEvent {
    error?: string;
  }
  interface SpeechRecognition {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
  }
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

/** Detect support without triggering side effects (safe in module scope). */
export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export interface SpeechController {
  /** Stop listening immediately and release the mic. Safe to call multiple
   * times. */
  stop: () => void;
}

export interface SpeechListenOptions {
  /** Fires once with the full final transcript when the engine finishes
   * processing an utterance. */
  onResult: (transcript: string) => void;
  /** Fires with interim (not yet finalized) text as the engine processes
   * audio — useful for live "typing" UX. */
  onInterim?: (transcript: string) => void;
  /** Fires on any recognition error, with a human-readable Indonesian
   * message (not the raw DOMException). */
  onError: (message: string) => void;
  /** Fires when the engine stops listening (either after recognizing speech
   * or on an error). */
  onEnd: () => void;
}

/** Maps Web Speech API `error.error` codes to user-facing Indonesian messages. */
function friendlyError(error: string): string {
  switch (error) {
    case "not-allowed":
      return "Akses mikrofon ditolak. Izinkan mikrofon di pengaturan browser lalu coba lagi.";
    case "no-speech":
      return "Tidak ada suara terdeteksi. Coba bicara lebih jelas atau ketik kalimatnya.";
    case "network":
      return "Layanan pengenalan suara tidak tersedia secara offline. Periksa koneksi internet.";
    case "aborted":
      return ""; // silent — user/intentional abort, not an error
    default:
      return "Gagal membaca suara. Ketik kalimatnya sebagai ganti.";
  }
}

/**
 * Start listening for a single utterance. Returns a `SpeechController` whose
 * `.stop()` releases the mic, or `null` when the API is not supported.
 *
 * The browser will keep listening (possibly with `interimResults`) until the
 * user pauses or you call `.stop()`, then fire `onResult` once, then `onEnd`.
 * There is no explicit "turn off" needed beyond `.stop()`.
 */
export function startListening(opts: SpeechListenOptions): SpeechController | null {
  const SpeechRecognitionCtor = typeof window === "undefined"
    ? undefined
    : window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) return null;

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = "id-ID";
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }
    if (interim && opts.onInterim) opts.onInterim(interim);
    if (final) opts.onResult(final);
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    const msg = friendlyError(String(event?.error ?? ""));
    if (msg) opts.onError(msg);
  };

  recognition.onend = () => {
    // The engine fires `onend` after recognizing speech OR after an error.
    // If the user spoke and `onResult` was already called (finalSent),
    // `onEnd` is the terminal signal. If `onresult` never fired (error or
    // no speech), `onEnd` is still the terminal signal. We always fire
    // `onEnd` here.
    opts.onEnd();
  };

  try {
    recognition.start();
  } catch {
    // Thrown when `start()` is called on an already-running instance.
    return null;
  }

  return {
    stop() {
      try { recognition.stop(); } catch { /* already stopped */ }
    },
  };
}