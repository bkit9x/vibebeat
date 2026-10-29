import React from 'react';
import { Track } from '../types';
import { SOUND_LIBRARY, PITCHED_MODES, DRUM_MODES } from '../constants/sounds';

interface SequencerGridProps {
  tracks: Track[];
  grid: number[][];
  currentPlayingStep: number;
  flashedTrackIndex: number | null;
  onToggleStep: (trackIndex: number, stepIndex: number) => void;
  onCycleStepVariation: (trackIndex: number, stepIndex: number) => void;
  onTriggerTrack: (trackIndex: number) => void;
  onChangeSound: (trackIndex: number, soundId: string) => void;
  onChangeTune: (trackIndex: number, tune: number) => void;
  onToggleMute: (trackIndex: number) => void;
  onToggleSolo: (trackIndex: number) => void;
  onChangeVolume: (trackIndex: number, vol: number) => void;
}

export const SequencerGrid: React.FC<SequencerGridProps> = ({
  tracks,
  grid,
  currentPlayingStep,
  flashedTrackIndex,
  onToggleStep,
  onCycleStepVariation,
  onTriggerTrack,
  onChangeSound,
  onChangeTune,
  onToggleMute,
  onToggleSolo,
  onChangeVolume,
}) => {
  // Group sounds by category for select dropdowns
  const groupedSounds = React.useMemo(() => {
    const groups: Record<string, typeof SOUND_LIBRARY[string][]> = {};
    Object.values(SOUND_LIBRARY).forEach((s) => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  }, []);

  const getTrackModes = (trackIndex: number) => {
    const track = tracks[trackIndex];
    if (!track) return DRUM_MODES;
    const sound = SOUND_LIBRARY[track.soundId];
    return sound && sound.pitched ? PITCHED_MODES : DRUM_MODES;
  };

  return (
    <main className="p-3 sm:p-5 overflow-x-auto sequencer-scroll">
      <div className="min-w-[1040px]">
        {/* Step Number Header Row */}
        <div className="grid grid-cols-[310px_1fr] gap-3 mb-2 items-center">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center justify-between">
            <span>KEY / ĐỔI ÂM THANH (26 SOUNDS)</span>
            <span className="text-[10px] font-mono text-slate-500">TUNE / M / S / VOL</span>
          </div>

          <div className="grid grid-cols-16 gap-1.5">
            {Array.from({ length: 16 }).map((_, s) => {
              const isBeatStart = s % 4 === 0;
              const isCurrent = currentPlayingStep === s;
              return (
                <div
                  key={s}
                  className={`text-center font-mono text-[11px] py-1 rounded transition-colors ${
                    isCurrent
                      ? 'bg-amber-400 text-slate-950 font-bold scale-105 shadow-md shadow-amber-400/30'
                      : isBeatStart
                      ? 'bg-slate-800 text-cyan-300 font-bold border border-slate-700'
                      : 'text-slate-500 font-medium'
                  }`}
                >
                  {String(s + 1).padStart(2, '0')}
                </div>
              );
            })}
          </div>
        </div>

        {/* 10 Track Rows */}
        <div className="flex flex-col gap-2">
          {tracks.map((track, tIdx) => {
            const soundMeta = SOUND_LIBRARY[track.soundId] || { name: 'Sound', sub: '' };
            const modes = getTrackModes(tIdx);
            const isFlashed = flashedTrackIndex === tIdx;

            return (
              <div
                key={track.id}
                className="grid grid-cols-[310px_1fr] gap-3 items-center bg-[#161b28]/70 hover:bg-[#192030] p-2 rounded-xl border border-slate-800/70 transition"
              >
                {/* Left Track Control Panel */}
                <div className="flex items-center justify-between gap-2 pr-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onTriggerTrack(tIdx)}
                      title={`Nghe thử phím ${track.key}`}
                      style={{
                        backgroundColor: `${track.color}22`,
                        borderColor: `${track.color}88`,
                        color: track.color,
                        transform: isFlashed ? 'scale(1.12)' : undefined,
                      }}
                      className="w-8 h-8 rounded-lg border flex items-center justify-center font-extrabold font-mono text-xs shrink-0 hover:scale-105 active:scale-95 transition shadow-sm cursor-pointer"
                    >
                      {track.key}
                    </button>
                    <div className="min-w-0 flex-1">
                      <select
                        value={track.soundId}
                        onChange={(e) => onChangeSound(tIdx, e.target.value)}
                        title={`Đổi âm thanh cho Phím ${track.key}`}
                        className="w-full bg-[#10141f] hover:bg-[#1a2234] text-slate-100 text-xs font-bold px-2 py-1 rounded-md border border-slate-700/80 focus:outline-none focus:border-cyan-400 cursor-pointer truncate"
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
                      <div className="text-[10px] text-slate-400 truncate pl-1 mt-0.5">
                        {soundMeta.sub}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex flex-col items-center" title={`Chỉnh cao độ (Tune) riêng cho Phím ${track.key}`}>
                      <span className="text-[9px] font-mono text-slate-400 leading-none mb-0.5">
                        {track.tune > 0 ? `+${track.tune}` : track.tune}st
                      </span>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        value={track.tune}
                        onChange={(e) => onChangeTune(tIdx, parseInt(e.target.value, 10))}
                        className="w-10 cursor-pointer"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleMute(tIdx)}
                      title="Mute Track"
                      className={`w-6 h-6 rounded text-[10px] font-bold font-mono border transition cursor-pointer ${
                        track.muted
                          ? 'border-rose-400 bg-rose-500 text-slate-950 shadow-sm shadow-rose-500/40'
                          : 'border-slate-700 bg-slate-800/90 text-slate-400 hover:text-white'
                      }`}
                    >
                      M
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleSolo(tIdx)}
                      title="Solo Track"
                      className={`w-6 h-6 rounded text-[10px] font-bold font-mono border transition cursor-pointer ${
                        track.solo
                          ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/40'
                          : 'border-slate-700 bg-slate-800/90 text-slate-400 hover:text-white'
                      }`}
                    >
                      S
                    </button>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(track.volume * 100)}
                      onChange={(e) => onChangeVolume(tIdx, parseInt(e.target.value, 10) / 100)}
                      title={`Âm lượng Phím ${track.key}`}
                      className="w-12 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Right 16-Step Grid */}
                <div className="grid grid-cols-16 gap-1.5">
                  {Array.from({ length: 16 }).map((_, s) => {
                    const val = grid[tIdx] ? grid[tIdx][s] : 0;
                    const isQuarterGroup = Math.floor(s / 4) % 2 === 0;
                    const isDownbeat = s % 4 === 0;
                    const isPlayingCurrent = currentPlayingStep === s;

                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={(e) => {
                          if (e.shiftKey) {
                            onCycleStepVariation(tIdx, s);
                          } else {
                            onToggleStep(tIdx, s);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          onCycleStepVariation(tIdx, s);
                        }}
                        style={
                          val > 0
                            ? {
                                backgroundColor: track.color,
                                borderColor: '#ffffff99',
                                boxShadow: `0 0 14px ${track.glow}`,
                              }
                            : undefined
                        }
                        className={`step-btn h-10 rounded-lg border flex flex-col items-center justify-center select-none cursor-pointer transition ${
                          val > 0
                            ? ''
                            : isQuarterGroup
                            ? 'bg-[#1c2232]'
                            : 'bg-[#151a26]'
                        } ${
                          val > 0
                            ? ''
                            : isDownbeat
                            ? 'border-slate-700/90'
                            : 'border-slate-800/80'
                        } ${isPlayingCurrent ? 'step-playing' : ''}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mb-0.5 ${
                            val > 0 ? 'bg-slate-950' : 'bg-slate-600/50'
                          }`}
                        />
                        <span
                          className={`text-[9px] font-mono leading-none ${
                            val > 0
                              ? 'font-extrabold text-slate-950'
                              : 'opacity-0'
                          }`}
                        >
                          {val > 0 ? modes[val] || '' : '.'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};
