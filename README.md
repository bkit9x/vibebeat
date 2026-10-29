# VibeBeat Studio — 16-Step Web Audio Groovebox

A high-performance React + TypeScript rewrite of VibeBeat Studio, powered by Vite, Tailwind CSS, and the Web Audio API.

## Features

- **Pure Web Audio Synthesizer**: 26 procedural sounds generated in real-time (Kicks, Snares, Claps, Hi-Hats, Cymbals, Percussion & FX, Sub & Acid Basses, Melodic & Chiptune Synths).
- **10-Track 16-Step Matrix**: Full sequencer grid with pitch variations (C..C+ for melodic tracks) and drum accents/pitch shifts (ACC, VAR, HI, LOW).
- **Real-Time Visualizer**: Dual-mode spectrum analyser (Frequency Bars and Oscilloscope Waveform).
- **Groove & Swing Engine**: Tempo slider (60–200 BPM) and 16th-note swing timing.
- **Sound Shaper / FX**: Master Low-Pass Filter cutoff (250 Hz – 20 kHz), Decay/Release envelope shaper, Punch/Drive distortion, and Global Tune shift.
- **10 Live Trigger Pads**: Performance pads with visual feedback, triggerable via mouse click, touch, or keyboard keys `1`–`9` and `0`. Spacebar toggles Play/Stop.
- **Genre Presets & Smart Beat Generator**:
  - 🔥 Hip-Hop Boom Bap (92 BPM)
  - ⚡ Trap 808 Banger (140 BPM)
  - 🪩 909 Deep House (124 BPM)
  - ☕ Lo-Fi Chill Study (82 BPM)
  - 🧪 Acid Techno 303 (132 BPM)
  - 🌆 Retro Synthwave (110 BPM)
  - Random Sound Kit switcher & algorithmic beat generator
- **State Persistence**: Browser localStorage pattern save/restore and one-click JSON export.

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```
