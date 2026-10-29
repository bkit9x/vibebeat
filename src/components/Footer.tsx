import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="max-w-[1440px] w-full mx-auto mt-3 px-2 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
      <div>VibeBeat Studio • 10 Phím (1-9, 0) • 26 Bộ Tổng Hợp Âm Thanh Web Audio API Thời Gian Thực</div>
      <div className="font-mono">
        Mẹo: Chọn bất kỳ âm thanh nào từ menu thả xuống trên từng hàng hoặc bấm &quot;🎛️ Đổi Kit&quot; để khám phá âm mới!
      </div>
    </footer>
  );
};
