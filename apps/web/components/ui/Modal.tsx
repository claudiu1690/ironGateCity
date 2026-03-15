'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  const widthMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      className="fixed inset-0 z-50 bg-transparent p-0 m-0 max-w-none max-h-none w-full h-full"
      onClose={onClose}
    >
      <div
        className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className={`card w-full ${widthMap[size]} animate-fade-up max-h-[90vh] overflow-y-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-iron-100">{title}</h2>
              <button
                onClick={onClose}
                className="text-iron-400 hover:text-iron-200 text-xl leading-none"
              >
                ×
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </dialog>
  );
}
