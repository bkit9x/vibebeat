import React from 'react';
import { Track, FxSettings } from '../types';
import { SOUND_LIBRARY } from '../constants/sounds';

interface LivePadsAndFxProps {
  tracks: Track[];
  flashedTrackIndex: number | null;
  onTriggerTrack: (trackIndex: number) => void;
  onChangeSound: (trackIndex: number, soundId: string) => void;
  fx: FxSettings;
  onFxChange: (newFx: FxSettings) => void;
  onResetFx: () => void;
}

export const LivePadsAndFx: React.FC<LivePadsAndFxProps> = ({
  tracks,
  flashedTrackIndex,
  onTriggerTrack,
  onChangeSound,
  fx,
  onFxChange,
  onResetFx,
}) => {
  const groupedSounds = React.useMemo(() => {
    const groups: Record<string, typeof SOUND_LIBRARY[string][]> = {};
    Object.values(SOUND_LIBRARY).forEach((s) => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  }, []);

  return (
    <section className="bg-[#0e121b] border-t border-slate-800/80 p-3 sm:p-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Live Performance Pads (Keys 1-9, 0) */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span>🎹 10 LIVE TRIGGER PADS (NHẤN CHUỘT, CHỌN ÂM HOẶC GÕ PHÍM SỐ 1 - 9, 0)</span>
            </h2>
            <span className="text-[11px] text-cyan-400/90 font-mono">
              Đổi âm thanh trực tiếp trên từng Pad hoặc từng hàng
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {tracks.map((track, tIdx) => {
              const isFlashed = flashedTrackIndex === tIdx;
              return (
                <div
                  key={track.id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName === 'SELECT') return;
                    onTriggerTrack(tIdx);
                  }}
                  style={{
                    borderColor: `${track.color}55`,
                    backgroundColor: isFlashed ? `${track.color}44` : undefined,
                    boxShadow: isFlashed ? `0 0 18px ${track.glow}` : undefined,
                  }}
                  className="bg-[#161c2b] hover:bg-[#1e263a] transition-all p-2 rounded-xl border flex flex-col justify-between h-20 relative overflow-hidden cursor-pointer select-none"
                >
                  <div className="w-full flex items-center justify-between pointer-events-none">
                    <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-slate-900/90 text-white border border-slate-700">
                      KEY {track.key}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: track.color,
                        boxShadow: `0 0 8px ${track.color}`,
                      }}
                    />
                  </div>
                  <select
                    value={track.soundId}
                    onChange={(e) => onChangeSound(tIdx, e.target.value)}
                    title={`Đổi nhanh âm thanh cho Phím ${track.key}`}
                    className="w-full bg-[#0d111a]/90 hover:bg-slate-900 text-slate-200 text-[10px] font-semibold px-1 py-1 rounded border border-slate-700/80 focus:outline-none focus:border-cyan-400 cursor-pointer mt-1 truncate"
                  >
                    {Object.entries(groupedSounds).map(([cat, items]) => (
                      <optgroup key={cat} label={cat}>
                        {items.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* Master Filter & Sound Character Controls */}
        <div className="lg:col-span-4 bg-[#141926] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              🎛️ SOUND SHAPER / FX
            </span>
            <button
              id="resetFxBtn"
              type="button"
              onClick={onResetFx}
              className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
            >
              Reset FX
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* LPF Cutoff */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">LPF CUTOFF</span>
                <span id="cutoffVal" className="font-mono text-cyan-300">
                  {(fx.cutoff / 1000).toFixed(1)} kHz
                </span>
              </div>
              <input
                id="cutoffSlider"
                type="range"
                min="250"
                max="20000"
                value={fx.cutoff}
                onChange={(e) => onFxChange({ ...fx, cutoff: parseFloat(e.target.value) })}
                className="cursor-pointer"
              />
            </div>

            {/* Decay / Release */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">DECAY / RELEASE</span>
                <span id="decayVal" className="font-mono text-amber-300">{fx.decay}%</span>
              </div>
              <input
                id="decaySlider"
                type="range"
                min="40"
                max="180"
                value={fx.decay}
                onChange={(e) => onFxChange({ ...fx, decay: parseInt(e.target.value, 10) })}
                className="cursor-pointer"
              />
            </div>

            {/* Punch / Drive */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">PUNCH / DRIVE</span>
                <span id="driveVal" className="font-mono text-rose-300">{fx.drive}%</span>
              </div>
              <input
                id="driveSlider"
                type="range"
                min="0"
                max="100"
                value={fx.drive}
                onChange={(e) => onFxChange({ ...fx, drive: parseInt(e.target.value, 10) })}
                className="cursor-pointer"
              />
            </div>

            {/* Tune Shift */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">TUNE SHIFT</span>
                <span id="pitchVal" className="font-mono text-emerald-300">
                  {fx.pitch > 0 ? `+${fx.pitch}` : fx.pitch} ST
                </span>
              </div>
              <input
                id="pitchSlider"
                type="range"
                min="-12"
                max="12"
                value={fx.pitch}
                onChange={(e) => onFxChange({ ...fx, pitch: parseInt(e.target.value, 10) })}
                className="cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
