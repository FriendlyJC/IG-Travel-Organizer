// ============================================================
// lib/sound.ts — 音效與天氣背景音樂管理器
// ============================================================

import { WeatherType } from '@/components/WeatherControls';

class SoundController {
  private bgmAudio: HTMLAudioElement | null = null;
  private currentTrack: string | null = null;
  private isMuted: boolean = false;
  private isUserInteracted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // 監聽首次使用者點擊以解鎖瀏覽器 Autoplay 限制
      const unlockAudio = () => {
        this.isUserInteracted = true;
        if (this.bgmAudio && !this.isMuted) {
          this.bgmAudio.play().catch(() => {});
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
    }
  }

  // 切換天氣背景音樂
  public setWeatherBgm(weather: WeatherType) {
    if (typeof window === 'undefined') return;

    const trackUrl = `/ui_asset/${weather}/music_${weather}.mp3`;
    if (this.currentTrack === trackUrl && this.bgmAudio) return;

    this.currentTrack = trackUrl;

    if (this.bgmAudio) {
      // 停止上一首
      try {
        this.bgmAudio.pause();
        this.bgmAudio.src = '';
      } catch {}
    }

    try {
      this.bgmAudio = new Audio(trackUrl);
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = 0.45; // 柔和適中音量

      if (!this.isMuted && this.isUserInteracted) {
        this.bgmAudio.play().catch(() => {
          // 靜默捕捉 (若音檔尚未放入則不噴錯)
        });
      }
    } catch {}
  }

  // 播放霓虹燈短路電弧音效 (error.mp3)
  public playSparkErrorSound() {
    if (typeof window === 'undefined' || this.isMuted) return;

    try {
      const sparkAudio = new Audio('/ui_asset/error.mp3');
      sparkAudio.volume = 0.55;
      sparkAudio.play().catch(() => {
        // 音檔若尚未放入則靜默，不中斷畫面
      });
    } catch {}
  }

  // 切換靜音狀態
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.isUserInteracted = true;

    if (this.bgmAudio) {
      if (this.isMuted) {
        this.bgmAudio.pause();
      } else {
        this.bgmAudio.play().catch(() => {});
      }
    }
    return this.isMuted;
  }

  public getMutedState(): boolean {
    return this.isMuted;
  }
}

export const soundManager = new SoundController();

