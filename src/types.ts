export interface SoundDefinition {
  id: string;
  category: string;
  name: string;
  sub: string;
  pitched: boolean;
}

export interface Track {
  id: string;
  key: string;
  soundId: string;
  color: string;
  glow: string;
  volume: number; // 0 to 1
  tune: number;   // -12 to +12
  muted: boolean;
  solo: boolean;
}

export interface Preset {
  bpm: number;
  swing: number;
  sounds: string[];
  pattern: number[][];
}

export interface FxSettings {
  cutoff: number; // 250 to 20000 Hz
  decay: number;  // 40 to 180 % (multiplier 0.4 to 1.8)
  drive: number;  // 0 to 100 % (multiplier 0 to 1.0)
  pitch: number;  // -12 to +12 semitones
}

export type VizMode = 'BARS' | 'WAVE';

export interface CustomSample {
  id: string;
  name: string;
  duration: number; // in seconds
  size: number;     // in bytes
  buffer: AudioBuffer;
  createdAt: number;
}
