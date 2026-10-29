import React from 'react';
import { Visualizer } from './Visualizer';
import { VizMode } from '../types';

interface HeaderProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentStep: number;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  swing: number;
  onSwingChange: (swing: number) => void;
  masterVol: number;
  onMasterVolChange: (vol: number) => void;
  currentPreset: string;
  onSelectPreset: (presetKey: string) => void;
  onRandomKit: () => void;
  onRandomBeat: () => void;
  onClear: () => void;
  vizMode: VizMode;
  onToggleVizMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPlaying,
  onTogglePlay,
  currentStep,
  bpm,
  onBpmChange,
  swing,
  onSwingChange,
  masterVol,
  onMasterVolChange,
  currentPreset,
  onSelectPreset,
  onRandomKit,
  onRandomBeat,
  onClear,
  vizMode,
  onToggleVizMode
}) => {
  const displayStep = currentStep >= 0 ? currentStep + 1 : 1;
  const stepText = `${String(displayStep).padStart(2, '0')} / 16`;

  return (
    <header className="bg-[#0e121b] border-b border-slate-800/80 p-3 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Brand & Visualizer */}
        <div className="flex items-center justify-between sm:justify-start gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/20 border border-white/10">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                  VIBE<span className="text-cyan-400">BEAT</span>{' '}
                  <span className="text-xs font-mono uppercase px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                    TR-WEB8
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400">Pure Web Audio Synthesizer & 16-Step Sequencer</p>
            </div>
          </div>

          {/* Real-Time Audio Visualizer Canvas */}
          <Visualizer isPlaying={isPlaying} vizMode={vizMode} onToggleVizMode={onToggleVizMode} />
        </div>

        {/* Transport Controls (Play, Stop, BPM, Swing, Master Vol, Presets) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 bg-[#151a26] p-2.5 rounded-xl border border-slate-800/90">
          {/* Play / Stop Button */}
          <button
            id="playBtn"
            type="button"
            onClick={onTogglePlay}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg active:scale-95 cursor-pointer ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {isPlaying ? (
              <>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
                <span>STOP</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>PLAY</span>
              </>
            )}
          </button>

          {/* Step Counter Display */}
          <div className="bg-[#090c12] border border-slate-800 px-3 py-1.5 rounded-lg text-center min-w-[72px]">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">STEP</div>
            <div id="stepDisplay" className="font-mono text-base font-bold text-amber-400">{stepText}</div>
          </div>

          {/* BPM Control */}
          <div className="flex flex-col gap-1 px-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">TEMPO</span>
              <span id="bpmValue" className="font-mono font-bold text-cyan-400">{bpm} BPM</span>
            </div>
            <input
              id="bpmSlider"
              type="range"
              min="60"
              max="200"
              value={bpm}
              onChange={(e) => onBpmChange(parseInt(e.target.value, 10))}
              className="w-24 sm:w-28 cursor-pointer"
            />
          </div>

          {/* Swing Control */}
          <div className="flex flex-col gap-1 px-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">SWING</span>
              <span id="swingValue" className="font-mono font-bold text-purple-400">{swing}%</span>
            </div>
            <input
              id="swingSlider"
              type="range"
              min="0"
              max="60"
              value={swing}
              onChange={(e) => onSwingChange(parseInt(e.target.value, 10))}
              className="w-20 sm:w-24 cursor-pointer"
            />
          </div>

          {/* Master Volume */}
          <div className="flex flex-col gap-1 px-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">MASTER</span>
              <span id="masterVolValue" className="font-mono font-bold text-emerald-400">{masterVol}%</span>
            </div>
            <input
              id="masterVolSlider"
              type="range"
              min="0"
              max="100"
              value={masterVol}
              onChange={(e) => onMasterVolChange(parseInt(e.target.value, 10))}
              className="w-20 sm:w-24 cursor-pointer"
            />
          </div>

          {/* Genre Presets & Pattern Tools */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              id="presetSelect"
              value={currentPreset}
              onChange={(e) => onSelectPreset(e.target.value)}
              className="bg-[#181f2e] hover:bg-[#1f293d] text-slate-200 text-xs sm:text-sm font-medium px-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="hiphop">🔥 Hip-Hop Boom Bap (92 BPM)</option>
              <option value="trap">⚡ Trap 808 Banger (140 BPM)</option>
              <option value="house">🪩 909 Deep House (124 BPM)</option>
              <option value="lofi">☕ Lo-Fi Chill Study (82 BPM)</option>
              <option value="acid">🧪 Acid Techno 303 (132 BPM)</option>
              <option value="synthwave">🌆 Retro Synthwave (110 BPM)</option>
            </select>

            <button
              id="randomKitBtn"
              type="button"
              onClick={onRandomKit}
              title="Đổi ngẫu nhiên bộ âm thanh (Sound Kit) cho 10 phím"
              className="px-3 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/35 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <span>🎛️</span> <span>Đổi Kit</span>
            </button>

            <button
              id="randomBtn"
              type="button"
              onClick={onRandomBeat}
              title="Tạo beat ngẫu nhiên thông minh"
              className="px-3 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <span>🎲</span> <span>Random Beat</span>
            </button>

            <button
              id="clearBtn"
              type="button"
              onClick={onClear}
              title="Xóa toàn bộ các bước trên bảng"
              className="px-3 py-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <span>🗑️</span> <span>Clear</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
