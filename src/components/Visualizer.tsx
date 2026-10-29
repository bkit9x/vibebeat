import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { VizMode } from '../types';

interface VisualizerProps {
  isPlaying: boolean;
  vizMode: VizMode;
  onToggleVizMode: () => void;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isPlaying, vizMode, onToggleVizMode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);

    const drawFrame = () => {
      animId = requestAnimationFrame(drawFrame);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const analyser = audioEngine.getAnalyser();
      if (!analyser || !isPlaying) {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2 * window.devicePixelRatio;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      if (vizMode === 'BARS') {
        analyser.getByteFrequencyData(dataArray);
        const barCount = 28;
        const barWidth = (w / barCount) * 0.72;
        const gap = (w / barCount) * 0.28;

        for (let i = 0; i < barCount; i++) {
          const val = dataArray[i];
          const percent = val / 255;
          const barHeight = Math.max(3 * window.devicePixelRatio, percent * (h - 6 * window.devicePixelRatio));
          const x = i * (barWidth + gap);
          const y = h - barHeight;

          const grad = ctx.createLinearGradient(0, h, 0, 0);
          grad.addColorStop(0, '#06b6d4');
          grad.addColorStop(0.6, '#a855f7');
          grad.addColorStop(1, '#f43f5e');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2 * window.devicePixelRatio);
          ctx.fill();
        }
      } else {
        analyser.getByteTimeDomainData(dataArray);
        ctx.lineWidth = 2.2 * window.devicePixelRatio;
        ctx.strokeStyle = '#38bdf8';
        ctx.beginPath();

        const sliceWidth = w / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(w, h / 2);
        ctx.stroke();
      }
    };

    animId = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isPlaying, vizMode]);

  return (
    <div className="relative bg-[#090c12] border border-slate-800 rounded-xl overflow-hidden w-36 sm:w-52 h-12 flex items-center justify-center shadow-inner">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-1 left-2 flex items-center gap-1.5 pointer-events-none">
        <span
          className={`w-2 h-2 rounded-full ${
            isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
          }`}
        />
        <span
          className={`text-[10px] font-mono uppercase tracking-wider ${
            isPlaying ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          {isPlaying ? 'PLAYING' : 'STANDBY'}
        </span>
      </div>
      <button
        type="button"
        onClick={onToggleVizMode}
        title="Đổi chế độ hiển thị sóng âm"
        className="absolute bottom-1 right-1.5 text-[9px] font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 cursor-pointer transition"
      >
        {vizMode}
      </button>
    </div>
  );
};
