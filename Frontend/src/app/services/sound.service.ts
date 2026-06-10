import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private audioCtx: AudioContext | null = null;
  private settingsService = inject(SettingsService);
  private ringtoneInterval: any = null;
  private dialToneInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        const ctx = this.getAudioContext();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume();
        }
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('keydown', unlock);
      };
      
      document.addEventListener('click', unlock);
      document.addEventListener('touchstart', unlock);
      document.addEventListener('keydown', unlock);
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    return this.audioCtx;
  }

  playMessageSound() {
    const tone = this.settingsService.messageTone();
    if (tone === 'Silent') return;

    this.playTone(tone);
  }

  playMessageSentSound() {
    const tone = this.settingsService.messageTone();
    if (tone === 'Silent') return;

    // A very subtle high pitched pop for sending messages
    const audioCtx = this.getAudioContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    try {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.05);
    } catch (e) {}
  }

  private isRinging = false;
  private isDialing = false;

  startRingtone() {
    this.stopCallAudio();
    if (this.settingsService.callRingtoneMuted()) return;
    
    this.isRinging = true;
    this.playTone('Call Ringing');
    this.ringtoneInterval = window.setInterval(() => {
      if (!this.isRinging) {
        this.stopCallAudio();
        return;
      }
      this.playTone('Call Ringing');
    }, 2000);
    // Defense against Angular HMR
    (window as any)._cipherchat_ringtone_interval = this.ringtoneInterval;
  }

  startDialingTone() {
    this.stopCallAudio();
    this.isDialing = true;
    this.playTone('Dialing');
    this.dialToneInterval = window.setInterval(() => {
      if (!this.isDialing) {
        this.stopCallAudio();
        return;
      }
      this.playTone('Dialing');
    }, 4000);
    // Defense against Angular HMR
    (window as any)._cipherchat_dial_interval = this.dialToneInterval;
  }

  stopCallAudio() {
    this.isRinging = false;
    this.isDialing = false;
    
    // Clear local references
    if (this.ringtoneInterval !== null) {
      window.clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
    if (this.dialToneInterval !== null) {
      window.clearInterval(this.dialToneInterval);
      this.dialToneInterval = null;
    }

    // Clear global HMR references
    if ((window as any)._cipherchat_ringtone_interval) {
      window.clearInterval((window as any)._cipherchat_ringtone_interval);
      (window as any)._cipherchat_ringtone_interval = null;
    }
    if ((window as any)._cipherchat_dial_interval) {
      window.clearInterval((window as any)._cipherchat_dial_interval);
      (window as any)._cipherchat_dial_interval = null;
    }
  }

  playCallEndedSound() {
    this.stopCallAudio();
    this.playTone('Call Ended');
  }

  private playTone(tone: string) {
    const audioCtx = this.getAudioContext();
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    try {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (tone === 'Ping' || tone === 'Soft Ping') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
      } else if (tone === 'Subtle Chime') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.4);
      } else if (tone === 'Bell') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
      } else if (tone === 'WhatsApp Style') {
        // Double pop
        oscillator.type = 'sine';
        
        // First pop
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        
        // Second pop
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(700, audioCtx.currentTime + 0.1);
        osc2.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + 0.15);
        gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.1);
        gain2.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.11);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.05);
        osc2.start(audioCtx.currentTime + 0.1);
        osc2.stop(audioCtx.currentTime + 0.15);

      } else if (tone === 'Call Ringing') {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(450, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 1.0);
      } else if (tone === 'Dialing') {
        const osc2 = audioCtx.createOscillator();
        oscillator.type = 'sine';
        osc2.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc2.frequency.setValueAtTime(480, audioCtx.currentTime);
        osc2.connect(gainNode);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime + 1.9);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2.0);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 2.0);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 2.0);
      } else if (tone === 'Call Ended') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
      } else {
        // Default (Pop)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.1);
      }
    } catch (e) {
      console.warn('Audio playback failed', e);
    }
  }
}
