import React from 'react';
import { useTheme } from '../theme/themeContext';
import './AppBackground.css';

export default function AppBackground() {
  const { theme } = useTheme();
  const hasBgImage = theme.bgMode === 'image' && theme.bgImage;

  return (
    <div className="app-bg-layer">
      {/* solid color base — always the bgColor */}
      <div className="app-bg-color" />

      {/* image / gif overlay — only when set */}
      {hasBgImage && (
        <div
          className="app-bg-image"
          style={{
            backgroundImage:   `url(${theme.bgImage})`,
            backgroundSize:    theme.bgImageSize,
            backgroundPosition: 'center',
            backgroundRepeat:  'no-repeat',
            opacity:           theme.bgImageOpacity,
            filter:            theme.bgImageBlur > 0
              ? `blur(${theme.bgImageBlur}px) saturate(1.1)`
              : undefined,
          }}
        />
      )}
    </div>
  );
}
