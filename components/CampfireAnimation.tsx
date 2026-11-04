'use client';

// ============================================================
// components/CampfireAnimation.tsx — 營火 Lottie 動畫播放器
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { WeatherType } from './WeatherControls';

interface Props {
  weather: WeatherType;
}

export default function CampfireAnimation({ weather }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let dotLottieInstance: any = null;
    let isCancelled = false;

    async function initLottie() {
      if (!canvasRef.current) return;
      try {
        setLoadError(false);
        const { DotLottie } = await import('@lottiefiles/dotlottie-web');
        if (isCancelled || !canvasRef.current) return;

        const src = `/ui_asset/${weather}/campfire_${weather}.lottie`;

        dotLottieInstance = new DotLottie({
          canvas: canvasRef.current,
          src,
          loop: true,
          autoplay: true,
          renderConfig: {
            autoResize: true,
          },
        });
      } catch (err) {
        console.warn('Campfire Lottie 載入提醒:', err);
        if (!isCancelled) setLoadError(true);
      }
    }

    initLottie();

    return () => {
      isCancelled = true;
      if (dotLottieInstance) {
        try {
          dotLottieInstance.destroy();
        } catch {}
      }
    };
  }, [weather]);

  return (
    <div
      className="absolute pointer-events-none select-none z-10 transition-opacity duration-500"
      style={{
        // 營火位於右側湖畔帳篷旁 (依概念圖景深定位)
        bottom: '18.5%',
        right: '12%',
        width: '130px',
        height: '130px',
      }}
      title="Campfire Animation"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(255,140,0,0.35)]"
      />
      {loadError && (
        <div className="w-full h-full flex items-center justify-center text-2xl animate-bounce">
          🔥
        </div>
      )}
    </div>
  );
}

