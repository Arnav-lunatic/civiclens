import React, { useEffect, useState } from 'react';
import { X, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';

export interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  subtitle?: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  subtitle,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      setIsZoomed(false);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white text-slate-900">
          <div className="min-w-0 pr-3">
            <h3 className="text-sm font-bold text-slate-900 truncate">
              {title || 'Photo Evidence Preview'}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Zoom Toggle */}
            <button
              type="button"
              onClick={() => setIsZoomed((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200"
              title={isZoomed ? 'Reset zoom' : 'Zoom in'}
            >
              {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isZoomed ? 'Fit Screen' : 'Zoom 1.5x'}</span>
            </button>

            {/* Open Original */}
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200"
              title="Open raw original image in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open Raw</span>
            </a>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-500 flex items-center justify-center transition border border-slate-200 ml-1"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Display Area with Ambient Background */}
        <div className="relative flex-1 overflow-auto bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[78vh] p-2 sm:p-4">
          {/* Subtle Ambient Background Blur */}
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-20 scale-125 pointer-events-none"
          />

          {/* Foreground Uncropped Image */}
          <img
            src={imageUrl}
            alt={title || 'Evidence full preview'}
            className={`relative rounded-xl object-contain transition-all duration-300 select-none shadow-2xl ${
              isZoomed
                ? 'scale-150 cursor-zoom-out my-auto'
                : 'max-h-[72vh] max-w-full cursor-zoom-in'
            }`}
            onClick={() => setIsZoomed((prev) => !prev)}
          />
        </div>

        {/* Bottom Bar: Instructions */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Click photo or toggle button to zoom. Entire image is 100% uncropped.</span>
          <span className="hidden sm:inline font-mono text-[10px] text-slate-400">
            Press ESC to exit
          </span>
        </div>
      </div>
    </div>
  );
};
