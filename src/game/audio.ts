/* ── Cricket game: SFX synthesis ────────────────────────────────────────────
   Lightweight Web Audio API tones — synthesised crowd cheers / wicket sting,
   no audio files needed. Lives at module scope (lazy-init context) so the
   site-wide AudioProvider's ambient layer is never touched. */

let _sfxCtx: AudioContext | null = null;

function getSfxContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_sfxCtx) {
    const Ctor = (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return null;
    _sfxCtx = new Ctor();
  }
  if (_sfxCtx.state === "suspended") _sfxCtx.resume().catch(() => {});
  return _sfxCtx;
}

interface ToneOpts {
  type?:    OscillatorType;
  volume?:  number;
  delayMs?: number;
  attack?:  number;
}

function playTone(freq: number, durationMs: number, opts: ToneOpts = {}): void {
  const ctx = getSfxContext();
  if (!ctx) return;
  const { type = "sine", volume = 0.18, delayMs = 0, attack = 0.015 } = opts;
  const start = ctx.currentTime + delayMs / 1000;
  const duration = durationMs / 1000;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/* Quick rising three-tone chord — a medium cheer for a boundary (4 runs). */
export function playBoundarySound(): void {
  playTone(330, 220, { type: "triangle", volume: 0.16 });
  playTone(415, 260, { type: "triangle", volume: 0.13, delayMs: 80  });
  playTone(523, 320, { type: "sine",     volume: 0.10, delayMs: 180 });
}

/* Wider chord swell + stadium whistle for a six (6 runs). */
export function playSixSound(): void {
  playTone(196, 360, { type: "sawtooth", volume: 0.08 });
  playTone(294, 420, { type: "triangle", volume: 0.14, delayMs: 60  });
  playTone(370, 480, { type: "triangle", volume: 0.15, delayMs: 140 });
  playTone(494, 560, { type: "sine",     volume: 0.13, delayMs: 240 });
  playTone(659, 600, { type: "sine",     volume: 0.09, delayMs: 360 });
  playTone(1800, 320, { type: "sine", volume: 0.055, delayMs: 280, attack: 0.040 });
  playTone(1830, 320, { type: "sine", volume: 0.045, delayMs: 280, attack: 0.040 });
  playTone(1780, 320, { type: "sine", volume: 0.045, delayMs: 280, attack: 0.040 });
}

/* "Silence + reaction" sting for a wicket. Custom synthesis (not playTone)
   so we can sequence three phases:
     1. Stump thump  (0    → 320ms) — short low percussive at impact
     2. Silence      (320  → 460ms) — natural beat where the crowd gasps
     3. "Ooh"        (460  → 1280ms) — descending mid→low + low rumble */
export function playWicketSound(): void {
  const ctx = getSfxContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  // 1 — Stump thump
  const thump     = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(85, t);
  thump.frequency.exponentialRampToValueAtTime(48, t + 0.18);
  thumpGain.gain.setValueAtTime(0, t);
  thumpGain.gain.linearRampToValueAtTime(0.18, t + 0.012);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
  thump.connect(thumpGain).connect(ctx.destination);
  thump.start(t);
  thump.stop(t + 0.36);

  // 2 — "Ooh"
  const oohStart = t + 0.46;
  const ooh      = ctx.createOscillator();
  const oohGain  = ctx.createGain();
  ooh.type = "triangle";
  ooh.frequency.setValueAtTime(380, oohStart);
  ooh.frequency.exponentialRampToValueAtTime(95, oohStart + 0.70);
  oohGain.gain.setValueAtTime(0, oohStart);
  oohGain.gain.linearRampToValueAtTime(0.15, oohStart + 0.07);
  oohGain.gain.exponentialRampToValueAtTime(0.001, oohStart + 0.82);
  ooh.connect(oohGain).connect(ctx.destination);
  ooh.start(oohStart);
  ooh.stop(oohStart + 0.86);

  // 3 — Low rumble
  const rumbleStart = t + 0.38;
  const rumble      = ctx.createOscillator();
  const rumbleGain  = ctx.createGain();
  rumble.type = "sawtooth";
  rumble.frequency.setValueAtTime(38, rumbleStart);
  rumbleGain.gain.setValueAtTime(0, rumbleStart);
  rumbleGain.gain.linearRampToValueAtTime(0.06, rumbleStart + 0.22);
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, rumbleStart + 1.00);
  rumble.connect(rumbleGain).connect(ctx.destination);
  rumble.start(rumbleStart);
  rumble.stop(rumbleStart + 1.05);
}
