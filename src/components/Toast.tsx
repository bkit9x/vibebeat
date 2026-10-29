import React from 'react';

interface ToastProps {
  message: string;
  icon: string;
  visible: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, icon, visible }) => {
  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-slate-900/95 border border-cyan-500/50 text-cyan-300 px-4 py-2.5 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 backdrop-blur-md transition-all animate-bounce">
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  );
};
