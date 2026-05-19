const STORAGE_KEY = "printops_sound_enabled";
const COOLDOWN_MS = 3_000;

type AlertSoundType =
  | "printer_offline"
  | "printer_recovered"
  | "toner_low"
  | "critical_incident"
  | "warning";

type ToneStep = {
  frequency: number;
  durationMs: number;
  gain: number;
  type?: OscillatorType;
};

type SoundPattern = {
  steps: ToneStep[];
  gapMs: number;
};

const soundPatterns: Record<AlertSoundType, SoundPattern> = {
  printer_offline: {
    gapMs: 70,
    steps: [
      { frequency: 720, durationMs: 110, gain: 0.22, type: "square" },
      { frequency: 620, durationMs: 140, gain: 0.21, type: ".square" },
    ],
  },
  printer_recovered: {
    gapMs: 40,
    steps: [
      { frequency: 520, durationMs: 90, gain: 0.19, type: "sine" },
      { frequency: 760, durationMs: 120, gain: 0.20, type: "sine" },
    ],
  },
  toner_low: {
    gapMs: 50,
    steps: [{ frequency: 330, durationMs: 100, gain: 0.028, type: "triangle" }],
  },
  critical_incident: {
    gapMs: 60,
    steps: [
      { frequency: 196, durationMs: 110, gain: 0.05, type: "triangle" },
      { frequency: 196, durationMs: 110, gain: 0.04, type: "triangle" },
    ],
  },
  warning: {
    gapMs: 50,
    steps: [{ frequency: 392, durationMs: 90, gain: 0.026, type: "sine" }],
  },
};

const lastPlayedAt = new Map<AlertSoundType, number>();

let audioContext: AudioContext | null = null;
let playing = false;
let unlockHandlersInstalled = false;

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function getAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;

  const audioWindow = window as AudioWindow;
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
}

function hasBrowserAudio(): boolean {
  return typeof getAudioContextCtor() !== "undefined";
}

function getAudioContext(): AudioContext | null {
  if (!hasBrowserAudio()) return null;

  const AudioContextCtor = getAudioContextCtor();
  if (!AudioContextCtor) return null;

  audioContext ??= new AudioContextCtor();
  return audioContext;
}

function readStoredEnabled(): boolean {
  if (typeof window === "undefined") return true;

  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function writeStoredEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}

function canPlay(type: AlertSoundType): boolean {
  if (!readStoredEnabled() || playing) return false;

  const now = Date.now();
  const lastPlayed = lastPlayedAt.get(type) ?? 0;

  if (now - lastPlayed < COOLDOWN_MS) return false;

  lastPlayedAt.set(type, now);
  return true;
}

function scheduleTone(context: AudioContext, startAt: number, step: ToneStep): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const endAt = startAt + step.durationMs / 1_000;

  oscillator.type = step.type ?? "sine";
  oscillator.frequency.setValueAtTime(step.frequency, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(step.gain, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startAt);
  oscillator.stop(endAt + 0.01);

  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}

async function playPattern(type: AlertSoundType): Promise<void> {
  if (!canPlay(type)) return;

  try {
    const context = getAudioContext();
    if (!context) return;

    if (context.state === "suspended") {
      await context.resume();
    }

    const pattern = soundPatterns[type];
    let cursor = context.currentTime + 0.01;

    playing = true;

    for (const step of pattern.steps) {
      scheduleTone(context, cursor, step);
      cursor += step.durationMs / 1_000 + pattern.gapMs / 1_000;
    }

    window.setTimeout(
      () => {
        playing = false;
      },
      Math.ceil((cursor - context.currentTime) * 1_000),
    );
  } catch {
    playing = false;
  }
}

async function unlockAudioContext(): Promise<void> {
  if (!readStoredEnabled()) return;

  try {
    const context = getAudioContext();
    if (!context || context.state !== "suspended") return;

    await context.resume();
  } catch {
    // Autoplay policies vary by browser; realtime alerts should never break the app.
  }
}

export function initializeSoundAlerts(): void {
  if (typeof window === "undefined" || unlockHandlersInstalled) return;

  unlockHandlersInstalled = true;

  const unlock = () => {
    void unlockAudioContext();
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
}

export function playOfflineAlert(): void {
  void playPattern("printer_offline");
}

export function playRecoveryAlert(): void {
  void playPattern("printer_recovered");
}

export function toggleSoundAlerts(): boolean {
  const enabled = !readStoredEnabled();
  writeStoredEnabled(enabled);
  return enabled;
}

export function isSoundAlertsEnabled(): boolean {
  return readStoredEnabled();
}
