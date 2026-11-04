'use client';

// ============================================================
// components/WeatherParticles.tsx — 天氣環境氛圍粒子 (雪花/落葉/螢火蟲/陽光)
// ============================================================

import { useEffect, useRef } from 'react';
import { WeatherType } from './WeatherControls';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  rotation: number;
  vRot: number;
  color: string;
}

interface Props {
  weather: WeatherType;
}

export default function WeatherParticles({ weather }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Particle[] = [];
    const count = weather === 'winter' ? 65 : weather === 'autumn' ? 35 : weather === 'night' ? 25 : 20;

    const autumnColors = ['#f97316', '#ea580c', '#eab308', '#dc2626', '#b45309'];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: weather === 'winter' ? (Math.random() - 0.5) * 0.8 : weather === 'autumn' ? 0.6 + Math.random() * 1.2 : (Math.random() - 0.5) * 0.4,
        vy: weather === 'winter' ? 0.8 + Math.random() * 1.5 : weather === 'autumn' ? 0.9 + Math.random() * 1.4 : (Math.random() - 0.5) * 0.3 - 0.2,
        size: weather === 'winter' ? 1.5 + Math.random() * 3 : weather === 'autumn' ? 5 + Math.random() * 6 : 2 + Math.random() * 3,
        alpha: 0.3 + Math.random() * 0.6,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.04,
        color:
          weather === 'winter'
            ? '#ffffff'
            : weather === 'autumn'
            ? autumnColors[Math.floor(Math.random() * autumnColors.length)]
            : weather === 'night'
            ? '#fef08a'
            : '#fef3c7',
      });
    }

    let animId: number;
    let tick = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      tick++;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        // 循環邊界
        if (p.y > height + 20) {
          p.y = -10;
          p.x = Math.random() * width;
        } else if (p.y < -20) {
          p.y = height + 10;
        }
        if (p.x > width + 20) p.x = -10;
        else if (p.x < -20) p.x = width + 10;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (weather === 'winter') {
          // 雪花 (柔光小白點)
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (weather === 'autumn') {
          // 楓葉 (橢圓落葉幾何片)
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (weather === 'night') {
          // 螢火蟲呼吸閃爍
          const pulse = (Math.sin(tick * 0.05 + p.size) + 1) * 0.5;
          ctx.globalAlpha = p.alpha * (0.3 + pulse * 0.7);
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#facc15';
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 晴天白天暖光粉塵
          ctx.globalAlpha = p.alpha * 0.4;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [weather]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10 w-full h-full"
    />
  );
}

