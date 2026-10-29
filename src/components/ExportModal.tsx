import React, { useState } from 'react';
import { Track, FxSettings } from '../types';
import { AudioExporter, ExportOptions } from '../audio/AudioExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  grid: number[][];
  bpm: number;
  swing: number;
  masterVol: number;
  fx: FxSettings;
  customBuffers: Map<string, AudioBuffer>;
  currentPreset: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  tracks,
  grid,
  bpm,
  swing,
  masterVol,
  fx,
  customBuffers,
  currentPreset,
}) => {
  const [format, setFormat] = useState<'wav' | 'mp3'>('wav');
  const [loops, setLoops] = useState<number>(2);
  const [includeTail, setIncludeTail] = useState<boolean>(true);
  const [mp3Kbps, setMp3Kbps] = useState<number>(320);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [stageText, setStageText] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>('');

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress(0.05);
    setStageText('Đang khởi tạo bộ giải mã âm thanh...');
    setDownloadUrl(null);

    const options: ExportOptions = {
      format,
      loops,
      includeTail,
      mp3Kbps,
    };

    try {
      const blob = await AudioExporter.renderPattern(
        tracks,
        grid,
        bpm,
        swing,
        masterVol / 100,
        fx,
        customBuffers,
        options,
        (p, stage) => {
          setProgress(p);
          setStageText(stage);
        }
      );

      const filename = `vibebeat_${currentPreset || 'beat'}_${bpm}bpm_${loops}bars.${format}`;
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadFilename(filename);

      // Auto trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      setStageText('Có lỗi xảy ra trong quá trình xuất âm thanh: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121622] border border-slate-700/80 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0e121b]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⬇️</span>
            <div>
              <h3 className="text-base font-extrabold text-white">Xuất Âm Thanh Studio (WAV / MP3)</h3>
              <p className="text-xs text-slate-400">Tải bản phối âm thanh chất lượng cao để làm nhạc hoặc lưu trữ</p>
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

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 text-xs">
          {/* Format Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
              Định dạng âm thanh
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFormat('wav')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                  format === 'wav'
                    ? 'border-cyan-400 bg-cyan-500/15 shadow-sm shadow-cyan-500/20'
                    : 'border-slate-800 bg-[#161c2b] hover:bg-[#1a2133]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-cyan-300">WAV Lossless</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 text-[10px] font-bold">
                    Khuyên dùng
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  44.1 kHz • 16-bit PCM chất lượng phòng thu cao nhất, không nén (hoàn hảo cho DAW).
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('mp3')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                  format === 'mp3'
                    ? 'border-amber-400 bg-amber-500/15 shadow-sm shadow-amber-500/20'
                    : 'border-slate-800 bg-[#161c2b] hover:bg-[#1a2133]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-amber-300">MP3 High Quality</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-bold">
                    320 kbps
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Dung lượng nhẹ, tương thích với mọi thiết bị di động, web và chia sẻ trực tuyến.
                </span>
              </button>
            </div>
          </div>

          {/* Loop Count Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
              Độ dài vòng lặp (Bars / Loops)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { count: 1, label: '1 Vòng (16 Steps)' },
                { count: 2, label: '2 Vòng (32 Steps)' },
                { count: 4, label: '4 Vòng (64 Steps)' },
                { count: 8, label: '8 Vòng (128 Steps)' },
              ].map((item) => (
                <button
                  key={item.count}
                  type="button"
                  onClick={() => setLoops(item.count)}
                  className={`py-2 px-2 rounded-lg border font-semibold text-center transition cursor-pointer ${
                    loops === item.count
                      ? 'border-indigo-400 bg-indigo-500/20 text-indigo-300 font-bold'
                      : 'border-slate-800 bg-[#161c2b] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* MP3 Bitrate option (only when mp3 selected) */}
          {format === 'mp3' && (
            <div className="flex items-center justify-between bg-[#161c2b] p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-300">Chất lượng nén MP3 (Bitrate)</span>
              <select
                value={mp3Kbps}
                onChange={(e) => setMp3Kbps(parseInt(e.target.value, 10))}
                className="bg-[#0e121b] text-amber-300 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none cursor-pointer"
              >
                <option value={320}>320 kbps (Cực kỳ sắc nét / Studio)</option>
                <option value={256}>256 kbps (Rất cao)</option>
                <option value={192}>192 kbps (Chuẩn phát thanh)</option>
                <option value={128}>128 kbps (Tiết kiệm dung lượng)</option>
              </select>
            </div>
          )}

          {/* Reverb / Decay Tail Option */}
          <label className="flex items-center justify-between bg-[#161c2b] p-2.5 rounded-xl border border-slate-800 cursor-pointer select-none">
            <div className="flex flex-col">
              <span className="text-slate-200 font-semibold">Thêm đuôi âm vang tự nhiên (+1.2s)</span>
              <span className="text-[11px] text-slate-400">
                Giữ trọn vẹn tiếng đuôi decay của Bass 808, Cymbal và Reverb sau khi hết vòng lặp
              </span>
            </div>
            <input
              type="checkbox"
              checked={includeTail}
              onChange={(e) => setIncludeTail(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-800 border-slate-700 cursor-pointer"
            />
          </label>

          {/* Progress bar during rendering */}
          {isExporting && (
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-cyan-300 font-medium">{stageText}</span>
                <span className="font-mono text-cyan-400 font-bold">{Math.round(progress * 100)}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-rose-400 h-full transition-all duration-150"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Download Link if available */}
          {downloadUrl && !isExporting && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between">
              <div className="flex flex-col min-w-0">
                <span className="text-emerald-400 font-bold text-xs truncate">✓ Đã xuất thành công:</span>
                <span className="text-slate-300 text-[11px] font-mono truncate">{downloadFilename}</span>
              </div>
              <a
                href={downloadUrl}
                download={downloadFilename}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 transition"
              >
                Tải lại file
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0e121b] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleStartExport}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-lg ${
              isExporting
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : format === 'wav'
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25 active:scale-95'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25 active:scale-95'
            }`}
          >
            <span>{isExporting ? '⏳' : '⚡'}</span>
            <span>
              {isExporting
                ? 'Đang render...'
                : `Bắt đầu xuất ${format.toUpperCase()} (${loops} Vòng)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
