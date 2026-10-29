import React from 'react';

interface SubBarProps {
  onSave: () => void;
  onLoad: () => void;
  onExportJson: () => void;
}

export const SubBar: React.FC<SubBarProps> = ({ onSave, onLoad, onExportJson }) => {
  return (
    <div className="bg-[#10141f] border-b border-slate-800/70 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex flex-wrap items-center gap-4 text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" />
          <span>
            <strong>Click trái:</strong> Bật / Tắt nhịp
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
          <span>
            <strong>Click phải / Shift+Click:</strong> Đổi nốt nhạc (C..C+) hoặc Accent / Biến thể âm
          </span>
        </span>
        <span className="hidden md:inline-flex items-center gap-1.5 text-slate-300">
          <span>
            ⌨️ Phím tắt: <strong>[Space]</strong> Play/Stop • <strong>[Phím 1 - 9, 0]</strong> Gõ 10 Drum Pads • Chọn menu trên từng hàng để đổi âm thanh!
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          id="saveLocalBtn"
          type="button"
          onClick={onSave}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition cursor-pointer active:scale-95"
        >
          💾 Lưu Beat
        </button>
        <button
          id="loadLocalBtn"
          type="button"
          onClick={onLoad}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition cursor-pointer active:scale-95"
        >
          📂 Mở Beat đã lưu
        </button>
        <button
          id="exportJsonBtn"
          type="button"
          onClick={onExportJson}
          className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-medium transition cursor-pointer active:scale-95"
        >
          📋 Copy JSON
        </button>
      </div>
    </div>
  );
};
