import { Component, inject, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CallService } from '../../services/call.service';

@Component({
  selector: 'app-call-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './call-modal.html',
  styleUrl: './call-modal.css'
})
export class CallModal {
  callService = inject(CallService);

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteAudio') remoteAudio!: ElementRef<HTMLAudioElement>;

  constructor() {
    effect(() => {
      const state = this.callService.state();

      // Defer to next tick so the DOM elements exist after *ngIf renders
      setTimeout(() => {

        // ── LOCAL VIDEO ────────────────────────────────────────────────
        if (this.localVideo?.nativeElement) {
          const el = this.localVideo.nativeElement;
          if (state.localStream && el.srcObject !== state.localStream) {
            console.log('[CallModal] Attaching local stream to <video>');
            el.srcObject = state.localStream;
            el.play().catch(e => console.warn('[CallModal] Local play():', e));
          } else if (!state.localStream) {
            el.srcObject = null;
          }
        }

        // ── REMOTE VIDEO (video calls) ─────────────────────────────────
        if (this.remoteVideo?.nativeElement) {
          const el = this.remoteVideo.nativeElement;
          if (state.remoteStream && el.srcObject !== state.remoteStream) {
            console.log('[CallModal] Attaching remote stream to <video>');
            el.srcObject = state.remoteStream;
            el.muted = false;                          // CRITICAL: never mute remote video
            el.volume = state.isSpeakerOff ? 0 : 1;
            el.play().catch(e => console.warn('[CallModal] Remote video play():', e));
          } else if (!state.remoteStream) {
            el.srcObject = null;
          }
          if (el.srcObject) {
            el.volume = state.isSpeakerOff ? 0 : 1;  // live speaker toggle
          }
        }

        // ── REMOTE AUDIO (audio-only calls) ───────────────────────────
        // For audio calls the remote <video> element is hidden (no srcObject set),
        // so we route the audio stream through a dedicated <audio> element.
        if (this.remoteAudio?.nativeElement && state.callType === 'audio') {
          const el = this.remoteAudio.nativeElement;
          if (state.remoteStream && el.srcObject !== state.remoteStream) {
            console.log('[CallModal] Attaching remote stream to <audio>');
            el.srcObject = state.remoteStream;
            el.muted = false;
            el.volume = state.isSpeakerOff ? 0 : 1;
            el.play().catch(e => console.warn('[CallModal] Remote audio play():', e));
          } else if (!state.remoteStream) {
            el.srcObject = null;
          }
          if (el.srcObject) {
            el.volume = state.isSpeakerOff ? 0 : 1;
          }
        }

      }, 0);
    });
  }

  acceptCall() { this.callService.answerCall(); }
  rejectCall()  { this.callService.rejectCall(); }
  endCall()     { this.callService.endCall(); }
  toggleMute()  { this.callService.toggleMute(); }
  toggleVideo() { this.callService.toggleVideo(); }
  toggleSpeaker() { this.callService.toggleSpeaker(); }
}
