import React from 'react';
import { Maximize2 } from 'lucide-react';

export interface ComplaintImageProps {
  src: string;
  alt?: string;
  heightClass?: string;
  className?: string;
  onClick?: () => void;
  showZoomHint?: boolean;
  topLeftBadge?: React.ReactNode;
  topRightBadge?: React.ReactNode;
  bottomOverlay?: React.ReactNode;
}

export const ComplaintImage: React.FC<ComplaintImageProps> = ({
  src,
  alt = 'Civic complaint evidence photo',
  heightClass = 'h-56 sm:h-64',
  className = '',
  onClick,
  showZoomHint = true,
  topLeftBadge,
  topRightBadge,
  bottomOverlay,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative ${heightClass} w-full bg-slate-950 overflow-hidden flex items-center justify-center select-none group cursor-pointer ${className}`}
    >
      {/* 1. Ambient Blurred Backdrop - Fills entire container with ambient color tones of the photo */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-110 pointer-events-none transition-transform duration-500 group-hover:scale-125"
      />

      {/* 2. Uncropped Foreground Image - 100% visible, object-contain, no portion cut off */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="relative max-h-full max-w-full object-contain z-10 transition-transform duration-300 group-hover:scale-[1.02]"
      />

      {/* 3. Hover Zoom Hint */}
      {showZoomHint && (
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center pointer-events-none">
          <span className="px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xl border border-white/20">
            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Click to view full photo</span>
          </span>
        </div>
      )}

      {/* 4. Top-Left Badge */}
      {topLeftBadge && (
        <div className="absolute top-3 left-3 z-30 pointer-events-none">
          {topLeftBadge}
        </div>
      )}

      {/* 5. Top-Right Badge */}
      {topRightBadge && (
        <div className="absolute top-3 right-3 z-30 pointer-events-none">
          {topRightBadge}
        </div>
      )}

      {/* 6. Bottom Overlay */}
      {bottomOverlay && (
        <div className="absolute bottom-2 inset-x-2 z-30 pointer-events-none">
          {bottomOverlay}
        </div>
      )}
    </div>
  );
};
