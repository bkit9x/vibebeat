import { SoundDefinition, Track, Preset } from '../types';

export const PITCHED_MODES = ['', 'C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb', 'C+'];
export const BASS_FREQS    = [0, 65.41, 73.42, 77.78, 87.31, 98.00, 103.83, 116.54, 130.81];
export const SYNTH_FREQS   = [0, 261.63, 293.66, 311.13, 349.23, 392.00, 415.30, 466.16, 523.25];
export const DRUM_MODES    = ['', 'ACC', 'VAR', 'HI', 'LOW'];

export const SOUND_LIBRARY: Record<string, SoundDefinition> = {
  // --- KICKS ---
  kick808:   { id: 'kick808',   category: '🥁 Kicks', name: 'Kick 808 Sub',    sub: 'Deep Boom Sub',    pitched: false },
  kick909:   { id: 'kick909',   category: '🥁 Kicks', name: 'Kick 909 Punch',  sub: 'Techno/House',     pitched: false },
  kickDry:   { id: 'kickDry',   category: '🥁 Kicks', name: 'Acoustic Kick',   sub: 'Warm Boom Bap',    pitched: false },
  kickHard:  { id: 'kickHard',  category: '🥁 Kicks', name: 'Hard Dist Kick',  sub: 'Overdrive Gabb',   pitched: false },

  // --- SNARES & CLAPS ---
  snareCrisp:{ id: 'snareCrisp',category: '💥 Snares & Claps', name: 'Snare Crisp',    sub: 'Analog Snap',      pitched: false },
  snare808:  { id: 'snare808',  category: '💥 Snares & Claps', name: 'Snare 808',      sub: 'Tight Hip-Hop',    pitched: false },
  rimshot:   { id: 'rimshot',   category: '💥 Snares & Claps', name: 'Lo-Fi Rimshot',  sub: 'Woody Click',      pitched: false },
  clapStudio:{ id: 'clapStudio',category: '💥 Snares & Claps', name: 'Hand Clap',      sub: '808 Multi-Burst',  pitched: false },
  clapFat:   { id: 'clapFat',   category: '💥 Snares & Claps', name: 'Fat Arena Clap', sub: 'Wide Reverb Tail', pitched: false },

  // --- HI-HATS & CYMBALS ---
  hatClosed: { id: 'hatClosed', category: '✨ Hi-Hats & Cymbals', name: 'Closed Hat',  sub: 'Tight Metallic',   pitched: false },
  hatOpen:   { id: 'hatOpen',   category: '✨ Hi-Hats & Cymbals', name: 'Open Hat 909',sub: 'Long Shimmer',     pitched: false },
  shaker:    { id: 'shaker',    category: '✨ Hi-Hats & Cymbals', name: 'Crisp Shaker',sub: 'Groove Brush',     pitched: false },
  rideCym:   { id: 'rideCym',   category: '✨ Hi-Hats & Cymbals', name: 'Ride Cymbal', sub: 'Metallic Bell',    pitched: false },
  crashCym:  { id: 'crashCym',  category: '✨ Hi-Hats & Cymbals', name: 'Crash Splash',sub: 'Bright Wash',      pitched: false },

  // --- PERCUSSION & FX ---
  tomLow:    { id: 'tomLow',    category: '🪘 Percussion & FX', name: 'Floor Tom',     sub: 'Deep Analog Tom',  pitched: false },
  tomHi:     { id: 'tomHi',     category: '🪘 Percussion & FX', name: 'Hi Conga/Tom',  sub: 'Bouncy Perc',      pitched: false },
  cowbell:   { id: 'cowbell',   category: '🪘 Percussion & FX', name: '808 Cowbell',   sub: 'Phonk Dual-Osc',   pitched: false },
  clave:     { id: 'clave',     category: '🪘 Percussion & FX', name: 'Wood Clave',    sub: 'Latin Click',      pitched: false },
  laserZap:  { id: 'laserZap',  category: '🪘 Percussion & FX', name: 'Laser Synth FX',sub: 'Sci-Fi Sweep',     pitched: false },
  vinylHit:  { id: 'vinylHit',  category: '🪘 Percussion & FX', name: 'Vinyl Dust Hit',sub: 'Lo-Fi Texture',    pitched: false },

  // --- BASS SYNTHS (PITCHED) ---
  bassSub:   { id: 'bassSub',   category: '🎸 Bass Synths', name: 'Sub Bass',          sub: 'Deep Sine/Saw',    pitched: true },
  bassAcid:  { id: 'bassAcid',  category: '🎸 Bass Synths', name: 'Acid 303 Bass',     sub: 'Resonant Squelch', pitched: true },
  bassReese: { id: 'bassReese', category: '🎸 Bass Synths', name: 'Reese Detune',      sub: 'Wide Dark Bass',   pitched: true },
  bassSlap:  { id: 'bassSlap',  category: '🎸 Bass Synths', name: 'FM Funk Bass',      sub: 'Percussive Pluck', pitched: true },

  // --- MELODIC SYNTHS (PITCHED) ---
  synthPluck:{ id: 'synthPluck',category: '🎹 Melodic Synths', name: 'Synth Pluck',    sub: 'Minor Stab',       pitched: true },
  synthChord:{ id: 'synthChord',category: '🎹 Melodic Synths', name: 'Warm Chord Pad', sub: 'Lush Minor 7th',   pitched: true },
  synthLead: { id: 'synthLead', category: '🎹 Melodic Synths', name: 'Retro Saw Lead', sub: '80s Synthwave',    pitched: true },
  synthBell: { id: 'synthBell', category: '🎹 Melodic Synths', name: 'FM Crystal Bell',sub: 'Kalimba / Chime',  pitched: true },
  synthArp:  { id: 'synthArp',  category: '🎹 Melodic Synths', name: 'Chiptune Blip',  sub: '8-Bit Arcade',     pitched: true }
};

export const INITIAL_TRACKS: Track[] = [
  { id: 'track1', key: '1', soundId: 'kick808',    color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.55)',  volume: 0.95, tune: 0, muted: false, solo: false },
  { id: 'track2', key: '2', soundId: 'snareCrisp', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.55)', volume: 0.85, tune: 0, muted: false, solo: false },
  { id: 'track3', key: '3', soundId: 'hatClosed',  color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.55)',  volume: 0.72, tune: 0, muted: false, solo: false },
  { id: 'track4', key: '4', soundId: 'hatOpen',    color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.55)', volume: 0.68, tune: 0, muted: false, solo: false },
  { id: 'track5', key: '5', soundId: 'clapStudio', color: '#ec4899', glow: 'rgba(236, 72, 153, 0.55)', volume: 0.80, tune: 0, muted: false, solo: false },
  { id: 'track6', key: '6', soundId: 'tomLow',     color: '#a855f7', glow: 'rgba(168, 85, 247, 0.55)', volume: 0.78, tune: 0, muted: false, solo: false },
  { id: 'track7', key: '7', soundId: 'cowbell',    color: '#14b8a6', glow: 'rgba(20, 184, 166, 0.55)', volume: 0.72, tune: 0, muted: false, solo: false },
  { id: 'track8', key: '8', soundId: 'bassSub',    color: '#10b981', glow: 'rgba(16, 185, 129, 0.55)', volume: 0.86, tune: 0, muted: false, solo: false },
  { id: 'track9', key: '9', soundId: 'synthPluck', color: '#eab308', glow: 'rgba(234, 179, 8, 0.55)',  volume: 0.76, tune: 0, muted: false, solo: false },
  { id: 'track0', key: '0', soundId: 'synthLead',  color: '#6366f1', glow: 'rgba(99, 102, 241, 0.55)', volume: 0.74, tune: 0, muted: false, solo: false }
];

export const PRESETS: Record<string, Preset> = {
  hiphop: {
    bpm: 92,
    swing: 24,
    sounds: ['kickDry', 'snareCrisp', 'hatClosed', 'hatOpen', 'rimshot', 'shaker', 'vinylHit', 'bassSub', 'synthChord', 'synthBell'],
    pattern: [
      [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,0], // 1: Acoustic Kick
      [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,2], // 2: Snare Crisp
      [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1], // 3: Closed Hat
      [0,0,0,0, 0,0,1,0, 0,0,0,0, 0,0,1,0], // 4: Open Hat
      [0,0,0,1, 0,0,0,0, 0,1,0,0, 0,0,2,0], // 5: Rimshot
      [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1], // 6: Shaker
      [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // 7: Vinyl Hit
      [1,0,0,1, 0,0,0,3, 0,0,5,0, 0,4,0,0], // 8: Sub Bass
      [1,0,0,0, 0,0,3,0, 0,5,0,0, 0,0,7,0], // 9: Warm Chord
      [0,0,0,0, 5,0,0,0, 0,0,0,3, 0,0,8,0]  // 0: FM Bell
    ]
  },
  trap: {
    bpm: 140,
    swing: 0,
    sounds: ['kick808', 'snare808', 'hatClosed', 'hatOpen', 'clapStudio', 'tomHi', 'cowbell', 'bassSub', 'synthBell', 'laserZap'],
    pattern: [
      [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,1], // 1: Kick 808
      [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], // 2: Snare 808
      [1,1,1,2, 1,0,1,1, 1,0,3,3, 1,1,2,1], // 3: Trap Hat Rolls
      [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // 4: Open Hat
      [0,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,2], // 5: Clap
      [0,0,0,2, 0,0,1,0, 0,0,0,0, 0,3,0,0], // 6: Hi Tom
      [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,3,0], // 7: 808 Cowbell (Phonk)
      [1,0,0,0, 0,0,0,0, 1,0,1,0, 0,0,6,0], // 8: Sub Bass
      [1,0,0,3, 0,0,5,0, 1,0,0,3, 0,0,6,0], // 9: Dark Bell
      [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1]  // 0: Laser Zap
    ]
  },
  house: {
    bpm: 124,
    swing: 14,
    sounds: ['kick909', 'snareCrisp', 'hatClosed', 'hatOpen', 'clapFat', 'tomLow', 'shaker', 'bassSlap', 'synthChord', 'synthPluck'],
    pattern: [
      [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], // 1: 4x4 909 Kick
      [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // 2: Snare
      [1,0,0,1, 1,0,0,1, 1,0,0,1, 1,0,1,0], // 3: Closed Hat
      [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], // 4: Offbeat Open Hat
      [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // 5: Fat Clap
      [0,0,0,1, 0,0,2,0, 0,1,0,0, 0,0,3,0], // 6: Low Tom
      [0,1,1,0, 0,1,1,0, 0,1,1,0, 0,1,1,0], // 7: Shaker
      [0,0,1,0, 0,3,1,0, 0,0,5,0, 0,4,7,0], // 8: FM Funk Bass
      [0,0,1,0, 0,0,0,3, 0,0,5,0, 0,7,0,0], // 9: Warm Chord Stab
      [1,0,0,0, 0,0,5,0, 0,3,0,0, 0,0,8,0]  // 0: Synth Pluck
    ]
  },
  lofi: {
    bpm: 82,
    swing: 36,
    sounds: ['kickDry', 'rimshot', 'hatClosed', 'shaker', 'clave', 'vinylHit', 'tomLow', 'bassSub', 'synthChord', 'synthBell'],
    pattern: [
      [1,0,0,0, 0,0,0,2, 0,0,1,0, 0,0,0,0], // 1: Kick Dry
      [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // 2: Rimshot
      [1,0,2,0, 1,0,2,0, 1,0,2,0, 1,0,2,2], // 3: Hat
      [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], // 4: Shaker
      [0,0,0,1, 0,0,0,0, 0,0,1,0, 0,0,0,0], // 5: Clave
      [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], // 6: Vinyl Dust
      [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,1,2,0], // 7: Tom
      [1,0,0,0, 0,0,4,0, 5,0,0,0, 0,0,3,0], // 8: Sub Bass
      [1,0,0,3, 0,5,0,0, 4,0,0,7, 0,3,0,0], // 9: Lush Chord
      [0,0,8,0, 0,0,5,0, 0,3,0,0, 0,0,7,0]  // 0: Kalimba Bell
    ]
  },
  acid: {
    bpm: 132,
    swing: 8,
    sounds: ['kickHard', 'snareCrisp', 'hatClosed', 'hatOpen', 'clapStudio', 'rideCym', 'cowbell', 'bassAcid', 'synthArp', 'laserZap'],
    pattern: [
      [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,1,0], // 1: Hard Kick
      [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,2], // 2: Snare
      [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], // 3: Closed Hat
      [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], // 4: Open Hat
      [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // 5: Clap
      [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], // 6: Ride
      [0,0,0,1, 0,0,0,0, 0,0,0,1, 0,0,0,0], // 7: Cowbell
      [1,3,8,1, 0,4,7,1, 3,5,8,1, 6,4,3,8], // 8: 303 Acid Line!
      [1,0,5,0, 8,0,5,0, 4,0,7,0, 8,0,5,0], // 9: Chiptune Arp
      [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0]  // 0: Laser
    ]
  },
  synthwave: {
    bpm: 110,
    swing: 0,
    sounds: ['kick909', 'clapFat', 'hatClosed', 'crashCym', 'tomHi', 'tomLow', 'bassReese', 'bassAcid', 'synthLead', 'synthArp'],
    pattern: [
      [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,1,0], // 1: Kick 909
      [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // 2: Fat Arena Clap
      [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], // 3: 16th Hats
      [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // 4: Crash on step 1
      [0,0,0,0, 0,0,0,0, 0,0,0,0, 1,1,0,0], // 5: Hi Tom fill
      [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,2], // 6: Low Tom fill
      [1,0,0,0, 0,0,0,0, 4,0,0,0, 5,0,0,0], // 7: Reese Bass Drone
      [1,1,1,1, 4,4,4,4, 5,5,5,5, 7,7,3,3], // 8: Driving 16th Bass
      [1,0,5,0, 8,0,5,0, 4,0,5,0, 7,0,3,0], // 9: Retro Saw Lead
      [8,5,3,1, 8,5,3,1, 7,5,4,1, 8,7,5,3]  // 0: 8-bit Arp
    ]
  }
};

export const RANDOM_KIT_POOLS = [
  ['kick808', 'kick909', 'kickDry', 'kickHard'],
  ['snareCrisp', 'snare808', 'rimshot'],
  ['hatClosed', 'shaker'],
  ['hatOpen', 'rideCym', 'crashCym'],
  ['clapStudio', 'clapFat', 'rimshot'],
  ['tomLow', 'tomHi', 'clave'],
  ['cowbell', 'clave', 'vinylHit', 'laserZap'],
  ['bassSub', 'bassAcid', 'bassReese', 'bassSlap'],
  ['synthPluck', 'synthChord', 'synthBell'],
  ['synthLead', 'synthArp', 'synthBell', 'laserZap']
];
