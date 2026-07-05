import React from 'react';
import { useTheme } from '../theme/themeContext';
import './AppBackground.css';

// Map our size options to CSS background-size + background-repeat values
function resolveBgSize(size: string): { backgroundSize: string; backgroundRepeat: string; backgroundPosition: string } {
  switch (size) {
    case 'cover':
      return { backgroundSize: 'cover',   backgroundRepeat: 'no-repeat', backgroundPosition: 'center' };
    case 'contain':
      return { backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' };
    case 'fill':
      // stretch to fill entirely, ignoring aspect ratio
      return { backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' };
    case 'fit-width':
      return { backgroundSize: '100% auto', backgroundRepeat: 'no-repeat', backgroundPosition: 'top center' };
    case 'fit-height':
      return { backgroundSize: 'auto 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center left' };
    case 'center':
      // original size, centered, no repeat
      return { backgroundSize: 'auto',    backgroundRepeat: 'no-repeat', backgroundPosition: 'center' };
    case 'tile':
      // original size, repeated in both axes
      return { backgroundSize: 'auto',    backgroundRepeat: 'repeat',    backgroundPosition: '0 0' };
    case 'tile-x':
      return { backgroundSize: 'auto',    backgroundRepeat: 'repeat-x',  backgroundPosition: 'center' };
    case 'tile-y':
      return { backgroundSize: 'auto',    backgroundRepeat: 'repeat-y',  backgroundPosition: 'center' };
    case 'stretch':
      // same as fill
      return { backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' };
    case 'auto':
    default:
      return { backgroundSize: 'auto',    backgroundRepeat: 'no-repeat', backgroundPosition: 'center' };
  }
}

export default function AppBackground() {
  const { theme } = useTheme();
  const hasBgImage = theme.bgMode === 'image' && theme.bgImage;
  const bgStyle = hasBgImage ? resolveBgSize(theme.bgImageSize) : null;

  return (
    <div className="app-bg-layer">
      {/* solid color base — always the bgColor */}
      <div className="app-bg-color" />

      {/* image / gif overlay — only when set */}
      {hasBgImage && bgStyle && (
        <div
          className="app-bg-image"
          style={{
            backgroundImage:    `url(${theme.bgImage})`,
            backgroundSize:     bgStyle.backgroundSize,
            backgroundRepeat:   bgStyle.backgroundRepeat,
            backgroundPosition: bgStyle.backgroundPosition,
            opacity:            theme.bgImageOpacity,
            filter:             theme.bgImageBlur > 0
              ? `blur(${theme.bgImageBlur}px) saturate(1.1)`
              : undefined,
          }}
        />
      )}
    </div>
  );
}
