import React from 'react';
import { useTheme } from '../theme/themeContext';
import './AppBackground.css';

export default function AppBackground() {
  const { theme } = useTheme();

  const hasBgImage = theme.bgMode === 'image' && theme.bgImage;

  return (
    <div className="app-bg-layer">
      {hasBgImage && (
        <div
          className="app-bg-image"
          style={{
            backgroundImage:  `url(${theme.bgImage})`,
            backgroundSize:   theme.bgImageSize,
            opacity:          theme.bgImageOpacity,
            filter:           theme.bgImageBlur > 0 ? `blur(${theme.bgImageBlur}px)` : undefined,
          }}
        />
      )}
      {/* hero art — always shown, blends differently on image vs color bg */}
      <img
        className="app-hero-art"
        src="/img/hero-art.jpg"
        alt=""
        aria-hidden
        style={{ opacity: hasBgImage ? 0.25 : 0.55 }}
      />
    </div>
  );
}
