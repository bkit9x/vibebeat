import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { SubBar } from './components/SubBar';
import { SequencerGrid } from './components/SequencerGrid';
import { LivePadsAndFx } from './components/LivePadsAndFx';
import { Footer } from './components/Footer';
import { Toast } from './components/Toast';
import { ExportModal } from './components/ExportModal';
import { SampleManagerModal } from './components/SampleManagerModal';
import { audioEngine } from './audio/AudioEngine';
import {
  INITIAL_TRACKS,
  PRESETS,
  RANDOM_KIT_POOLS,
  SOUND_LIBRARY,
  PITCHED_MODES,
  DRUM_MODES,
} from './constants/sounds';
import { Track, FxSettings, VizMode, CustomSample } from './types';

export const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [stepCount, setStepCount] = useState<number>(16);
  const [grid, setGrid] = useState<number[][]>(() =>
    INITIAL_TRACKS.map(() => new Array(32).fill(0))
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [flashedTrack, setFlashedTrack] = useState<number | null>(null);

  const [bpm, setBpm] = useState<number>(92);
  const [swing, setSwing] = useState<number>(24);
  const [masterVol, setMasterVol] = useState<number>(85);
  const [currentPreset, setCurrentPreset] = useState<string>('hiphop');
  const [vizMode, setVizMode] = useState<VizMode>('BARS');

  // Custom Samples & Modals
  const [customSamples, setCustomSamples] = useState<CustomSample[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isSampleManagerOpen, setIsSampleManagerOpen] = useState<boolean>(false);

  const [fx, setFx] = useState<FxSettings>({
    cutoff: 20000,
    decay: 100,
    drive: 15,
    pitch: 0,
  });

  const [toast, setToast] = useState<{ message: string; icon: string; visible: boolean }>({
    message: '',
    icon: '✨',
    visible: false,
  });

  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback((message: string, icon = '✨') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, icon, visible: true });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2400);
  }, []);

  const triggerPadFlash = useCallback((tIdx: number) => {
    setFlashedTrack(tIdx);
    window.setTimeout(() => {
      setFlashedTrack((current) => (current === tIdx ? null : current));
    }, 130);
  }, []);

  // Sync engine configuration
  useEffect(() => {
    audioEngine.updateConfig(tracks, grid, bpm, swing, masterVol / 100, fx, stepCount);
  }, [tracks, grid, bpm, swing, masterVol, fx, stepCount]);

  // Load initial preset (hiphop)
  useEffect(() => {
    const preset = PRESETS.hiphop;
    if (preset) {
      setBpm(preset.bpm);
      setSwing(preset.swing);
      setTracks((prev) =>
        prev.map((t, idx) => {
          const soundId = preset.sounds[idx];
          return soundId && SOUND_LIBRARY[soundId] ? { ...t, soundId } : t;
        })
      );
      setGrid(
        preset.pattern.map((row) => {
          const padded = new Array(32).fill(0);
          for (let i = 0; i < row.length; i++) padded[i] = row[i];
          return padded;
        })
      );
    }
  }, []);

  // Visual sync loop for playhead and pad flashes
  useEffect(() => {
    let animId: number;
    let lastStep = -1;

    const loop = () => {
      animId = requestAnimationFrame(loop);

      if (audioEngine.getIsPlaying()) {
        const currentTime = audioEngine.getCurrentTime();
        const queue = audioEngine.getVisualQueue();

        while (queue.length > 0 && queue[0].time <= currentTime) {
          const item = audioEngine.popVisualQueueItem();
          if (item && item.step !== lastStep) {
            lastStep = item.step;
            setCurrentStep(item.step);

            // Flash active tracks on this step
            tracks.forEach((track, tIdx) => {
              const val = grid[tIdx] ? grid[tIdx][item.step] : 0;
              const anySolo = tracks.some((t) => t.solo);
              const isAudible = anySolo ? track.solo : !track.muted;
              if (val > 0 && isAudible) {
                triggerPadFlash(tIdx);
              }
            });
          }
        }
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [grid, tracks, triggerPadFlash]);

  const handleTogglePlay = useCallback(() => {
    const playing = audioEngine.togglePlay();
    setIsPlaying(playing);
    if (!playing) {
      setCurrentStep(-1);
    }
  }, []);

  const handleTriggerTrack = useCallback(
    (tIdx: number) => {
      audioEngine.triggerInstrument(tIdx, 1);
      triggerPadFlash(tIdx);
    },
    [triggerPadFlash]
  );

  const handleToggleStep = useCallback(
    (tIdx: number, sIdx: number) => {
      audioEngine.init();
      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        const currentVal = next[tIdx][sIdx];
        if (currentVal === 0) {
          next[tIdx][sIdx] = 1;
          if (!isPlaying) {
            audioEngine.triggerInstrument(tIdx, 1);
          }
        } else {
          next[tIdx][sIdx] = 0;
        }
        return next;
      });
    },
    [isPlaying]
  );

  const handleCycleStepVariation = useCallback((tIdx: number, sIdx: number) => {
    audioEngine.init();
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      const track = tracks[tIdx];
      const sound = SOUND_LIBRARY[track.soundId];
      const modes = sound && sound.pitched ? PITCHED_MODES : DRUM_MODES;
      const maxModes = modes.length - 1;

      let nextVal = next[tIdx][sIdx] + 1;
      if (nextVal > maxModes) {
        nextVal = 1;
      }
      next[tIdx][sIdx] = nextVal;
      audioEngine.triggerInstrument(tIdx, nextVal);
      return next;
    });
  }, [tracks]);

  const handleChangeSound = useCallback(
    (tIdx: number, newSoundId: string) => {
      const customSample = customSamples.find((cs) => cs.id === newSoundId);
      const soundMeta = customSample
        ? { name: customSample.name, pitched: false }
        : SOUND_LIBRARY[newSoundId];
      if (!soundMeta) return;

      setTracks((prev) =>
        prev.map((t, idx) => (idx === tIdx ? { ...t, soundId: newSoundId } : t))
      );

      // Clamp grid step values if mode length changed
      const maxModes = soundMeta.pitched ? PITCHED_MODES.length - 1 : DRUM_MODES.length - 1;
      setGrid((prev) =>
        prev.map((row, idx) => {
          if (idx !== tIdx) return row;
          return row.map((cell) => (cell > maxModes ? 1 : cell));
        })
      );

      audioEngine.triggerInstrument(tIdx, 1);
      triggerPadFlash(tIdx);
      showToast(`🎹 Phím [${tracks[tIdx]?.key}] ➔ ${soundMeta.name}`, '🎹');
    },
    [customSamples, showToast, tracks, triggerPadFlash]
  );

  const handleChangeTune = useCallback((tIdx: number, tune: number) => {
    setTracks((prev) =>
      prev.map((t, idx) => (idx === tIdx ? { ...t, tune } : t))
    );
  }, []);

  const handleToggleMute = useCallback((tIdx: number) => {
    setTracks((prev) =>
      prev.map((t, idx) => (idx === tIdx ? { ...t, muted: !t.muted } : t))
    );
  }, []);

  const handleToggleSolo = useCallback((tIdx: number) => {
    setTracks((prev) =>
      prev.map((t, idx) => (idx === tIdx ? { ...t, solo: !t.solo } : t))
    );
  }, []);

  const handleChangeVolume = useCallback((tIdx: number, volume: number) => {
    setTracks((prev) =>
      prev.map((t, idx) => (idx === tIdx ? { ...t, volume } : t))
    );
  }, []);

  // Custom Sample Upload Handler
  const handleUploadSample = useCallback(
    async (file: File, targetTrackIndex?: number) => {
      try {
        const buffer = await audioEngine.decodeAudioFile(file);
        const sampleId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        audioEngine.setCustomSample(sampleId, buffer);

        const newSample: CustomSample = {
          id: sampleId,
          name: file.name.replace(/\.[^/.]+$/, ''),
          duration: buffer.duration,
          size: file.size,
          buffer,
          createdAt: Date.now(),
        };

        setCustomSamples((prev) => [...prev, newSample]);

        // If target track is specified or only 1 file uploaded directly
        if (targetTrackIndex !== undefined && tracks[targetTrackIndex]) {
          setTracks((prev) =>
            prev.map((t, idx) => (idx === targetTrackIndex ? { ...t, soundId: sampleId } : t))
          );
          audioEngine.triggerInstrument(targetTrackIndex, 1);
          triggerPadFlash(targetTrackIndex);
          showToast(`📁 Đã gán sample "${newSample.name}" cho Phím ${tracks[targetTrackIndex].key}!`, '🎉');
        } else {
          showToast(`📁 Đã tải sample "${newSample.name}" vào thư viện!`, '✅');
        }
      } catch (err) {
        console.error(err);
        showToast('⚠️ Không thể giải mã file âm thanh này.', '⚠️');
      }
    },
    [showToast, tracks, triggerPadFlash]
  );

  const handleDeleteSample = useCallback(
    (sampleId: string) => {
      audioEngine.removeCustomSample(sampleId);
      setCustomSamples((prev) => prev.filter((s) => s.id !== sampleId));

      // Reset any tracks using this custom sample to initial sound
      setTracks((prev) =>
        prev.map((t, idx) =>
          t.soundId === sampleId ? { ...t, soundId: INITIAL_TRACKS[idx].soundId } : t
        )
      );
      showToast('🗑️ Đã xóa sample tùy chỉnh.', '🗑️');
    },
    [showToast]
  );

  const handleAssignSampleToTrack = useCallback(
    (sampleId: string, trackIndex: number) => {
      const sample = customSamples.find((s) => s.id === sampleId);
      if (!sample || !tracks[trackIndex]) return;

      setTracks((prev) =>
        prev.map((t, idx) => (idx === trackIndex ? { ...t, soundId: sampleId } : t))
      );
      audioEngine.triggerInstrument(trackIndex, 1);
      triggerPadFlash(trackIndex);
      showToast(`⭐ Đã gán "${sample.name}" vào Phím ${tracks[trackIndex].key}`, '⭐');
    },
    [customSamples, showToast, tracks, triggerPadFlash]
  );

  const handleStepCountChange = useCallback(
    (newCount: number) => {
      const clamped = Math.max(16, Math.min(32, newCount));
      setStepCount(clamped);
      showToast(`Đã đổi chiều dài chuỗi nhịp: ${clamped} bước!`, '📏');
    },
    [showToast]
  );

  const handleSelectPreset = useCallback(
    (presetKey: string) => {
      const preset = PRESETS[presetKey];
      if (!preset) return;

      setCurrentPreset(presetKey);
      setBpm(preset.bpm);
      setSwing(preset.swing);

      if (preset.sounds) {
        setTracks((prev) =>
          prev.map((t, idx) => {
            const sId = preset.sounds[idx];
            return sId && SOUND_LIBRARY[sId] ? { ...t, soundId: sId } : t;
          })
        );
      }

      setGrid(
        preset.pattern.map((row) => {
          const padded = new Array(32).fill(0);
          for (let i = 0; i < row.length; i++) padded[i] = row[i];
          return padded;
        })
      );
      showToast(`Đã tải preset: ${presetKey.toUpperCase()} (${preset.bpm} BPM)`, '🔥');
    },
    [showToast]
  );

  const handleRandomKit = useCallback(() => {
    audioEngine.init();
    setTracks((prev) =>
      prev.map((t, idx) => {
        const pool = RANDOM_KIT_POOLS[idx] || RANDOM_KIT_POOLS[0];
        const pick = pool[Math.floor(Math.random() * pool.length)];
        return { ...t, soundId: pick };
      })
    );
    showToast('🎛️ Đã đổi ngẫu nhiên bộ Sound Kit cho 10 phím (1-9, 0)!', '🎛️');
  }, [showToast]);

  const handleRandomBeat = useCallback(() => {
    audioEngine.init();
    const newGrid: number[][] = [];
    for (let t = 0; t < 10; t++) {
      newGrid.push(new Array(32).fill(0));
    }

    for (let s = 0; s < stepCount; s++) {
      const isSecondBar = s >= 16;
      newGrid[0][s] = s % 16 === 0 || s % 16 === 8 ? 1 : Math.random() < 0.2 ? 1 : 0; // 1: Kick
      newGrid[1][s] = s % 16 === 4 || s % 16 === 12 ? 1 : (isSecondBar && s === 30 ? 2 : Math.random() < 0.1 ? 2 : 0); // 2: Snare
      newGrid[2][s] = s % 2 === 0 ? 1 : Math.random() < 0.35 ? 2 : 0; // 3: Closed Hat
      newGrid[3][s] = s % 4 === 2 && Math.random() < 0.45 ? 1 : 0; // 4: Open Hat
      newGrid[4][s] = s % 16 === 12 && Math.random() < 0.7 ? 1 : Math.random() < 0.08 ? 1 : 0; // 5: Clap
      newGrid[5][s] = Math.random() < 0.15 ? Math.floor(Math.random() * 3) + 1 : 0; // 6: Tom
      newGrid[6][s] = Math.random() < 0.14 ? Math.floor(Math.random() * 2) + 1 : 0; // 7: Perc/Cowbell
      newGrid[7][s] = s % 16 === 0 ? 1 : Math.random() < 0.28 ? Math.floor(Math.random() * 7) + 1 : 0; // 8: Bass
      newGrid[8][s] = Math.random() < 0.22 ? Math.floor(Math.random() * 7) + 1 : 0; // 9: Synth 1
      newGrid[9][s] = Math.random() < 0.18 ? Math.floor(Math.random() * 8) + 1 : 0; // 0: Synth 2
    }

    setGrid(newGrid);
    showToast(`🎲 Đã phối ngẫu nhiên nhịp Beat (${stepCount} bước)!`, '🎲');
  }, [showToast, stepCount]);

  const handleClear = useCallback(() => {
    if (isPlaying) {
      audioEngine.togglePlay();
      setIsPlaying(false);
      setCurrentStep(-1);
    } else {
      audioEngine.stopAllSounds();
    }
    setGrid(INITIAL_TRACKS.map(() => new Array(32).fill(0)));
    showToast('🗑️ Đã xóa trắng bảng Sequencer.', '🗑️');
  }, [isPlaying, showToast]);

  const handleResetFx = useCallback(() => {
    setFx({
      cutoff: 20000,
      decay: 100,
      drive: 15,
      pitch: 0,
    });
    showToast('🎛️ Đã đặt lại bộ lọc & hiệu ứng âm thanh!', '🎛️');
  }, [showToast]);

  const handleSave = useCallback(() => {
    const sounds = tracks.map((t) => t.soundId);
    const tunes = tracks.map((t) => t.tune);
    const payload = { bpm, swingPercent: swing, stepCount, sounds, tunes, gridState: grid };
    try {
      localStorage.setItem('vibebeat_saved_pattern', JSON.stringify(payload));
      showToast('💾 Đã lưu Beat & Cấu hình 10 phím vào trình duyệt!', '💾');
    } catch {
      showToast('⚠️ Không thể lưu beat.', '⚠️');
    }
  }, [bpm, grid, showToast, stepCount, swing, tracks]);

  const handleLoad = useCallback(() => {
    const raw = localStorage.getItem('vibebeat_saved_pattern');
    if (!raw) {
      showToast('⚠️ Chưa có Beat nào được lưu trước đó.', '⚠️');
      return;
    }
    try {
      const data = JSON.parse(raw);
      if (data.bpm) setBpm(Math.max(50, Math.min(200, data.bpm)));
      if (data.swingPercent !== undefined) setSwing(data.swingPercent);
      if (data.stepCount) {
        setStepCount(Math.max(16, Math.min(32, data.stepCount)));
      }

      if (Array.isArray(data.sounds)) {
        setTracks((prev) =>
          prev.map((t, idx) => {
            const sId = data.sounds[idx];
            return sId && (SOUND_LIBRARY[sId] || customSamples.some((cs) => cs.id === sId))
              ? { ...t, soundId: sId }
              : t;
          })
        );
      }

      if (Array.isArray(data.tunes)) {
        setTracks((prev) =>
          prev.map((t, idx) => {
            const tVal = data.tunes[idx];
            return typeof tVal === 'number' ? { ...t, tune: tVal } : t;
          })
        );
      }

      if (Array.isArray(data.gridState) && data.gridState.length === 10) {
        setGrid(
          data.gridState.map((row: number[]) => {
            const padded = new Array(32).fill(0);
            for (let i = 0; i < row.length; i++) padded[i] = row[i];
            return padded;
          })
        );
      }
      showToast('📂 Đã khôi phục Beat & Sound Kit đã lưu!', '📂');
    } catch {
      showToast('⚠️ Dữ liệu Beat không hợp lệ.', '⚠️');
    }
  }, [customSamples, showToast]);

  const handleExportJson = useCallback(() => {
    const sounds = tracks.map((t) => t.soundId);
    const pattern = grid.map((r) => r.slice(0, stepCount));
    const jsonStr = JSON.stringify({ bpm, swing, stepCount, sounds, pattern });
    navigator.clipboard
      .writeText(jsonStr)
      .then(() => {
        showToast('📋 Đã sao chép mã JSON của Beat vào Clipboard!', '📋');
      })
      .catch(() => {
        showToast('⚠️ Không thể sao chép JSON.', '⚠️');
      });
  }, [bpm, grid, showToast, stepCount, swing, tracks]);

  // Keyboard Shortcuts (Space, 1-9, 0)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1;
        if (tracks[idx]) {
          handleTriggerTrack(idx);
        }
      } else if (e.key === '0') {
        const idx = 9;
        if (tracks[idx]) {
          handleTriggerTrack(idx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleTriggerTrack, tracks]);

  return (
    <div className="min-h-screen flex flex-col justify-between p-2 sm:p-4 md:p-6 text-slate-200">
      <Toast message={toast.message} icon={toast.icon} visible={toast.visible} />

      <div className="max-w-[1440px] w-full mx-auto bg-[#131722] border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden">
        <Header
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          currentStep={currentStep}
          stepCount={stepCount}
          onStepCountChange={handleStepCountChange}
          bpm={bpm}
          onBpmChange={setBpm}
          swing={swing}
          onSwingChange={setSwing}
          masterVol={masterVol}
          onMasterVolChange={setMasterVol}
          currentPreset={currentPreset}
          onSelectPreset={handleSelectPreset}
          onRandomKit={handleRandomKit}
          onRandomBeat={handleRandomBeat}
          onClear={handleClear}
          vizMode={vizMode}
          onToggleVizMode={() =>
            setVizMode((prev) => (prev === 'BARS' ? 'WAVE' : 'BARS'))
          }
        />

        <SubBar
          onSave={handleSave}
          onLoad={handleLoad}
          onExportJson={handleExportJson}
          onOpenExport={() => setIsExportModalOpen(true)}
          onOpenSampleManager={() => setIsSampleManagerOpen(true)}
          customSampleCount={customSamples.length}
        />

        <SequencerGrid
          tracks={tracks}
          grid={grid}
          stepCount={stepCount}
          currentPlayingStep={currentStep}
          flashedTrackIndex={flashedTrack}
          customSamples={customSamples}
          onToggleStep={handleToggleStep}
          onCycleStepVariation={handleCycleStepVariation}
          onTriggerTrack={handleTriggerTrack}
          onChangeSound={handleChangeSound}
          onChangeTune={handleChangeTune}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
          onChangeVolume={handleChangeVolume}
          onUploadSampleForTrack={handleUploadSample}
        />

        <LivePadsAndFx
          tracks={tracks}
          flashedTrackIndex={flashedTrack}
          customSamples={customSamples}
          onTriggerTrack={handleTriggerTrack}
          onChangeSound={handleChangeSound}
          fx={fx}
          onFxChange={setFx}
          onResetFx={handleResetFx}
        />
      </div>

      <Footer />

      {/* Export Audio Modal (WAV / MP3) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        tracks={tracks}
        grid={grid}
        stepCount={stepCount}
        bpm={bpm}
        swing={swing}
        masterVol={masterVol}
        fx={fx}
        customBuffers={audioEngine.getCustomBuffers()}
        currentPreset={currentPreset}
      />

      {/* Custom Sample Manager Modal */}
      <SampleManagerModal
        isOpen={isSampleManagerOpen}
        onClose={() => setIsSampleManagerOpen(false)}
        customSamples={customSamples}
        tracks={tracks}
        onUploadSample={handleUploadSample}
        onDeleteSample={handleDeleteSample}
        onAssignSampleToTrack={handleAssignSampleToTrack}
      />
    </div>
  );
};

export default App;
