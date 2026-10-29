import React, { useRef, useState } from 'react';
import { CustomSample, Track } from '../types';
import { audioEngine } from '../audio/AudioEngine';

interface SampleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customSamples: CustomSample[];
  tracks: Track[];
  onUploadSample: (file: File, targetTrackIndex?: number) => Promise<void>;
  onDeleteSample: (sampleId: string) => void;
  onAssignSampleToTrack: (sampleId: string, trackIndex: number) => void;
}

export const SampleManagerModal: React.FC<SampleManagerModalProps> = ({
  isOpen,
  onClose,
  customSamples,
  tracks,
  onUploadSample,
  onDeleteSample,
  onAssignSampleToTrack,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await onUploadSample(files[i]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePreview = (sample: CustomSample) => {
    // Stop current preview
    if (previewSourceRef.current) {
      try {
        previewSourceRef.current.stop();
      } catch {
        // ignore
      }
      previewSourceRef.current = null;
    }

    if (previewingId === sample.id) {
      setPreviewingId(null);
      return;
    }

    try {
      audioEngine.init();
      // Temporary AudioBufferSourceNode
      const dummyCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const src = dummyCtx.createBufferSource();
      src.buffer = sample.buffer;
      src.connect(dummyCtx.destination);
      src.onended = () => setPreviewingId(null);
      src.start(0);
      previewSourceRef.current = src;
      setPreviewingId(sample.id);
    } catch {
      setPreviewingId(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121622] border border-slate-700/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0e121b]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📁</span>
            <div>
              <h3 className="text-base font-extrabold text-white">Quản Lý Custom Audio Samples</h3>
              <p className="text-xs text-slate-400">
                Tải lên file âm thanh (WAV, MP3, OGG, FLAC) để gán cho 10 rãnh groovebox
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 text-xs overflow-y-auto">
          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-2.5 transition cursor-pointer select-none ${
              isDragging
                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                : 'border-slate-700/90 bg-[#151a28] hover:bg-[#181f30] hover:border-slate-600'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*,.wav,.mp3,.ogg,.flac,.aac,.m4a"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl shadow-inner">
              {isProcessing ? '⏳' : '⬆️'}
            </div>
            <div>
              <p className="font-bold text-sm text-slate-200">
                {isProcessing
                  ? 'Đang giải mã âm thanh...'
                  : 'Nhấn để chọn file hoặc kéo & thả âm thanh vào đây'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Hỗ trợ định dạng: <strong>.WAV, .MP3, .OGG, .FLAC, .M4A</strong> (Tự động chuyển đổi thành AudioBuffer Web Audio)
              </p>
            </div>
          </div>

          {/* Sample List */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
              <span>DANH SÁCH SAMPLE ĐÃ TẢI ({customSamples.length})</span>
              <span>GÁN CHO PHÍM (1-9, 0)</span>
            </div>

            {customSamples.length === 0 ? (
              <div className="p-8 text-center bg-[#151a28]/60 border border-slate-800 rounded-xl text-slate-400">
                <span className="text-2xl block mb-2">🥁</span>
                <p className="font-medium text-slate-300">Chưa có sample tùy chỉnh nào.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Hãy kéo thả hoặc bấm tải lên các âm thanh One-Shot (Kick, Snare, Hi-hat, Vocal Chop, Bass...) để sáng tạo beat độc đáo!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
                {customSamples.map((sample) => {
                  const isPlaying = previewingId === sample.id;
                  return (
                    <div
                      key={sample.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#161c2b] border border-slate-800/80 hover:border-slate-700 transition gap-3"
                    >
                      {/* Left: Play button & info */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handlePreview(sample)}
                          title={isPlaying ? 'Dừng phát' : 'Nghe thử sample'}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition cursor-pointer font-bold ${
                            isPlaying
                              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                              : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {isPlaying ? '⏹' : '▶'}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-200 truncate">{sample.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                            <span>⏱ {sample.duration.toFixed(2)}s</span>
                            <span>•</span>
                            <span>💾 {formatSize(sample.size)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Track Assignment Dropdown & Delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value !== '') {
                              onAssignSampleToTrack(sample.id, parseInt(e.target.value, 10));
                              e.target.value = '';
                            }
                          }}
                          className="bg-[#0e121b] text-cyan-300 text-[11px] font-semibold px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none cursor-pointer"
                        >
                          <option value="" disabled>
                            ➕ Gán cho Track...
                          </option>
                          {tracks.map((t, idx) => (
                            <option key={t.id} value={idx}>
                              Phím {t.key}: Track {idx + 1}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => onDeleteSample(sample.id)}
                          title="Xóa sample này"
                          className="w-7 h-7 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center justify-center text-xs transition cursor-pointer"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0e121b] flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-mono">
            Mẹo: Bạn cũng có thể bấm trực tiếp nút tải lên trên từng hàng nhạc cụ để gán nhanh!
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
