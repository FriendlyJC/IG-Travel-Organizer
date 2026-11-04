'use client';

// ============================================================
// components/WeatherControls.tsx — 右上角可愛風格天氣切換與音樂開關
// ============================================================

import { useState } from 'react';
import Image from 'next/image';
import { soundManager } from '@/lib/sound';

export type WeatherType = 'day' | 'night' | 'autumn' | 'winter';

interface Props {
  currentWeather: WeatherType;
  onChange: (weather: WeatherType) => void;
}

const WEATHERS: { id: WeatherType; name: string; icon: string }[] = [
  { id: 'day', name: '晴天白天', icon: '/ui_asset/day_icon.png' },
  { id: 'night', name: '晴天晚上', icon: '/ui_asset/night_icon.png' },
  { id: 'autumn', name: '秋天', icon: '/ui_asset/autumn_icon.png' },
  { id: 'winter', name: '冬天白天', icon: '/ui_asset/winter_icon.png' },
];

export default function WeatherControls({ currentWeather, onChange }: Props) {
  const [isMuted, setIsMuted] = useState(false);

  const handleToggleMute = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
  };

  return (
    <aside aria-label="天氣切換與音樂控制" className="fixed top-4 right-4 z-50 flex items-center gap-2 sm:gap-2.5 p-2 bg-white/75 backdrop-blur-md rounded-2xl shadow-lg border border-white/70 select-none">
      {/* 4 個天氣切換方形按鈕 */}
      {WEATHERS.map((w) => {
        const isSelected = currentWeather === w.id;
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => {
              onChange(w.id);
              soundManager.setWeatherBgm(w.id);
            }}
            title={w.name}
            className={`group relative flex flex-col items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-2xl transition-all duration-150 select-none ${
              isSelected
                ? 'bg-[#e2ded9] border-2 border-[#b8b3ad] shadow-[inset_0_3px_5px_rgba(0,0,0,0.2)] translate-y-[2px]'
                : 'bg-white border-2 border-stone-200/90 shadow-[0_4px_0_#d6d3d1,0_6px_12px_rgba(0,0,0,0.08)] hover:translate-y-[-2px] hover:shadow-[0_6px_0_#d6d3d1,0_9px_16px_rgba(0,0,0,0.12)] active:translate-y-[2px] active:shadow-[0_1px_0_#d6d3d1]'
            }`}
          >
            <div className={`relative w-6 h-6 sm:w-7 sm:h-7 transition-transform ${isSelected ? 'scale-95' : 'group-hover:scale-110'}`}>
              <Image
                src={w.icon}
                alt={w.name}
                fill
                sizes="32px"
                className="object-contain"
                priority
              />
            </div>
            <span
              className={`text-[8px] sm:text-[9px] font-bold mt-0.5 leading-none transition-colors ${
                isSelected ? 'text-stone-700' : 'text-stone-500 group-hover:text-stone-800'
              }`}
            >
              {w.id === 'day' ? '晴天' : w.id === 'night' ? '晚上' : w.id === 'autumn' ? '秋天' : '冬天'}
            </span>
          </button>
        );
      })}

      {/* 分隔小虛線 */}
      <div className="w-[1px] h-7 bg-stone-300 mx-0.5" />

      {/* 音樂播放 / 靜音按鈕 */}
      <button
        type="button"
        onClick={handleToggleMute}
        title={isMuted ? '開啟天氣音樂' : '靜音背景音樂'}
        className={`group relative flex flex-col items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-2xl transition-all duration-150 select-none ${
          isMuted
            ? 'bg-[#e2ded9] border-2 border-[#b8b3ad] shadow-[inset_0_3px_5px_rgba(0,0,0,0.2)] translate-y-[2px]'
            : 'bg-white border-2 border-amber-300 shadow-[0_4px_0_#f59e0b,0_6px_12px_rgba(245,158,11,0.2)] hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-[0_1px_0_#f59e0b]'
        }`}
      >
        <span className={`text-base sm:text-lg transition-transform ${isMuted ? 'opacity-60 grayscale' : 'group-hover:scale-125'}`}>
          {isMuted ? '🔇' : '🎵'}
        </span>
        <span
          className={`text-[8px] sm:text-[9px] font-bold mt-0.5 leading-none ${
            isMuted ? 'text-stone-500' : 'text-amber-700'
          }`}
        >
          {isMuted ? '靜音' : '音樂'}
        </span>
      </button>
    </aside>
  );
}
