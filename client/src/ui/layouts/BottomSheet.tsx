import React from 'react';
import clsx from 'clsx';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
      />

      {/* Sheet Content */}
      <div className="relative w-full max-h-[85vh] h-[75vh] bg-[#1E1B24] border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col z-10 animate-slide-up">
        {/* Grab bar */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-3 cursor-grab" onClick={onClose} />
        <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
      </div>
    </div>
  );
};
