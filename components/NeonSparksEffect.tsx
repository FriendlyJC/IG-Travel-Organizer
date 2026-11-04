'use client';

// ============================================================
// components/NeonSparksEffect.tsx — 霓虹燈桃紅色遮罩閃爍、噴濺火花與短路音效
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { soundManager } from '@/lib/sound';

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export default function NeonSparksEffect() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparksRef = useRef<Spark[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const [flickerState, setFlickerState] = useState<'idle' | 'flicker' | 'sparking'>('idle');

  // 產生火花爆裂
  const triggerSparks = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;

    // 發射點集中在霓虹燈標題框邊角 (左上、右上、中心金框處)
    const emitterPoints = [
      { x: width * 0.15, y: height * 0.4 },
      { x: width * 0.85, y: height * 0.35 },
      { x: width * 0.5, y: height * 0.2 },
    ];

    const colors = ['#f43f5e', '#ec4899', '#fbbf24', '#f59e0b', '#ffffff', '#a855f7'];

    emitterPoints.forEach((pt) => {
      const count = 12 + Math.floor(Math.random() * 8);
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
        const speed = 2.5 + Math.random() * 5.5;
        sparksRef.current.push({
          x: pt.x,
          y: pt.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 28 + Math.floor(Math.random() * 24),
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 1.5 + Math.random() * 2.5,
        });
      }
    });

    // 啟動動畫循環
    if (!animFrameRef.current) {
      animateSparks();
    }
  }, []);

  // 閃爍序列、火花觸發與短路音效播放
  const runFlickerSequence = useCallback(() => {
    // 播放 error.mp3 漏電短路音效
    soundManager.playSparkErrorSound();

    // 快速閃爍 3-4 次模擬接觸不良
    setFlickerState('flicker');
    setTimeout(() => setFlickerState('idle'), 60);
    setTimeout(() => setFlickerState('flicker'), 130);
    setTimeout(() => {
      setFlickerState('sparking');
      triggerSparks();
    }, 220);
    setTimeout(() => setFlickerState('flicker'), 360);
    setTimeout(() => setFlickerState('idle'), 480);
  }, [triggerSparks]);

  // 動畫循環 (更新火花物理)
  const animateSparks = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gravity = 0.16;
    const drag = 0.96;

    sparksRef.current.forEach((s) => {
      s.vx *= drag;
      s.vy *= drag;
      s.vy += gravity;
      s.x += s.vx;
      s.y += s.vy;
      s.life++;

      const progress = s.life / s.maxLife;
      const alpha = Math.max(0, 1 - progress);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 8;
      ctx.shadowColor = s.color;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * (1 - progress * 0.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 清除結束的火花
    sparksRef.current = sparksRef.current.filter((s) => s.life < s.maxLife);

    if (sparksRef.current.length > 0) {
      animFrameRef.current = requestAnimationFrame(animateSparks);
    } else {
      animFrameRef.current = null;
    }
  };

  // 定時器：久久偶爾閃爍一次 (每 18～28 秒隨機觸發一次)
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const scheduleNextFlicker = () => {
      const delay = 18000 + Math.random() * 10000; // 18~28 秒
      timer = setTimeout(() => {
        runFlickerSequence();
        scheduleNextFlicker();
      }, delay);
    };

    scheduleNextFlicker();

    // 剛載入 2.5 秒後先微閃一次讓使用者立即看到效果
    const initTimer = setTimeout(() => {
      runFlickerSequence();
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearTimeout(initTimer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [runFlickerSequence]);

  return (
    <div
      onClick={runFlickerSequence}
      title="點擊測試霓虹燈閃爍與電弧火花效果"
      className="absolute inset-0 cursor-pointer pointer-events-auto select-none rounded-xl overflow-visible"
    >
      {/* 桃紅色透明度霓虹遮罩層 */}
      <div
        className={`absolute inset-0 rounded-xl transition-all duration-75 pointer-events-none ${
          flickerState === 'flicker'
            ? 'opacity-85 bg-pink-500/40 mix-blend-color-dodge shadow-[0_0_35px_rgba(244,63,94,0.9),inset_0_0_20px_rgba(251,113,133,0.8)]'
            : flickerState === 'sparking'
            ? 'opacity-95 bg-rose-400/50 mix-blend-screen shadow-[0_0_45px_rgba(251,113,133,1),inset_0_0_25px_rgba(253,224,71,0.9)]'
            : 'opacity-20 hover:opacity-35 bg-pink-500/20 mix-blend-color-dodge shadow-[0_0_15px_rgba(244,63,94,0.3)]'
        }`}
      />

      {/* 火花噴濺 Canvas */}
      <canvas
        ref={canvasRef}
        width={480}
        height={220}
        className="absolute -top-12 -left-12 -right-12 -bottom-8 w-[calc(100%+96px)] h-[calc(100%+80px)] pointer-events-none z-20"
      />
    </div>
  );
}
