import { Injectable, inject, signal, NgZone } from '@angular/core';
import { SocketService } from './socket.service';
import { SoundService } from './sound.service';
import { HapticService } from './haptic.service';
import { NotificationService } from './notification.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ToastService } from './toast.service';

export interface CallState {
  isCalling: boolean;
  isReceiving: boolean;
  statusText: string;
  callType: 'audio' | 'video';
  remoteUser: any;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOff: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CallService {
  private socketService = inject(SocketService);
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private ngZone = inject(NgZone);
  private soundService = inject(SoundService);
  private hapticService = inject(HapticService);
  private notificationService = inject(NotificationService);

  private peerConnection: RTCPeerConnection | null = null;
  private currentCallId: string | null = null;
  private currentTargetUserId: string | null = null;

  // BUG FIX #1: Buffer ICE candidates that arrive before remote description is set
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet = false;

  // Call State Signals
  state = signal<CallState>({
    isCalling: false,
    isReceiving: false,
    statusText: '',
    callType: 'audio',
    remoteUser: null,
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isVideoOff: false,
    isSpeakerOff: false
  });

  // BUG FIX #2: Multiple STUN servers + proper TURN-ready configuration
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Added TURN server placeholders for reliable production connectivity
      {
        urls: 'turn:turn.your-domain.com:3478',
        username: 'turn-username',
        credential: 'turn-password'
      }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };

  constructor() {
    this.initSocketListeners();
  }

  private initSocketListeners() {
    // Incoming call: caller sends their offer along with ringing
    this.socketService.onCallRinging((data) => {
      console.log('[WebRTC] Incoming call from:', data.callerUsername, '| type:', data.callType);
      this.state.update(s => ({
        ...s,
        isReceiving: true,
        callType: data.callType,
        remoteUser: {
          _id: data.callerId,
          username: data.callerUsername,
          avatar: data.callerAvatar
        },
        statusText: `Incoming ${data.callType} call from ${data.callerUsername}`
      }));
      // Store offer for when user answers
      (window as any)._pendingOffer = data.offer;
      this.currentCallId = data.callId;
      this.currentTargetUserId = data.callerId;

      this.soundService.startRingtone();
      this.hapticService.vibrateIncomingCall();
      this.notificationService.notifyIncomingCall(data.callerUsername, data.callType === 'video');
    });

    this.socketService.onCallAnswered(async (data) => {
      console.log('[WebRTC] Call answered, setting remote description (answer)');
      this.soundService.stopCallAudio(); // Stop dialing tone unconditionally
      if (this.peerConnection && data.answer) {
        try {
          if (this.peerConnection.signalingState === 'have-local-offer') {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            console.log('[WebRTC] Remote description (answer) set. State:', this.peerConnection.signalingState);
            this.remoteDescriptionSet = true;
            await this.flushPendingCandidates();
            this.state.update(s => ({ ...s, statusText: 'Call Connected' }));
            this.hapticService.vibrateCallAccepted();
          } else {
            console.warn('[WebRTC] Cannot set answer in state:', this.peerConnection.signalingState);
          }
        } catch (e) {
          console.error('[WebRTC] Error setting remote description (answer):', e);
        }
      }
    });

    this.socketService.onCallRejected((data) => {
      console.log('[WebRTC] Call rejected:', data.reason);
      this.toastService.error(`Call was ${data.reason || 'declined'}`);
      this.soundService.playCallEndedSound();
      this.hapticService.vibrateCallEnded();
      this.cleanupCall();
      setTimeout(() => this.resetState(), 2000);
    });

    this.socketService.onCallEnded((data) => {
      console.log('[WebRTC] Call ended by remote user');
      this.soundService.playCallEndedSound();
      this.hapticService.vibrateCallEnded();
      
      // If we were receiving and never connected, it's a missed call
      if (this.state().isReceiving && this.state().statusText.includes('Incoming')) {
        const callerName = this.state().remoteUser?.username || 'Someone';
        this.notificationService.notifyMissedCall(callerName);
      }

      this.cleanupCall();
      this.state.update(s => ({ ...s, isCalling: false, isReceiving: false, statusText: 'Call Ended' }));
      setTimeout(() => this.resetState(), 2000);
    });

    // BUG FIX #4: Buffer candidates if remote description isn't set yet
    this.socketService.onIceCandidate(async (data) => {
      if (!data.candidate) return;
      console.log('[WebRTC] Received ICE candidate from remote');

      if (this.peerConnection && this.remoteDescriptionSet) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log('[WebRTC] Added ICE candidate successfully');
        } catch (e) {
          // Safely ignore candidates that fail after connection is established
          console.warn('[WebRTC] Failed to add ICE candidate:', e);
        }
      } else {
        console.log('[WebRTC] Buffering ICE candidate (remote desc not set yet)');
        this.pendingIceCandidates.push(data.candidate);
      }
    });
  }

  // Flush buffered ICE candidates after remote description is set
  private async flushPendingCandidates() {
    console.log(`[WebRTC] Flushing ${this.pendingIceCandidates.length} buffered ICE candidates`);
    for (const candidate of this.pendingIceCandidates) {
      try {
        await this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[WebRTC] Failed to flush buffered ICE candidate:', e);
      }
    }
    this.pendingIceCandidates = [];
  }

  async startCall(targetUserId: string, targetUser: any, type: 'audio' | 'video') {
    if (this.state().isCalling || this.state().isReceiving) {
      console.warn('[WebRTC] Call already in progress, ignoring double-click');
      return;
    }
    console.log('[WebRTC] Starting call to:', targetUser.username, '| type:', type);
    this.currentTargetUserId = targetUserId;
    this.state.update(s => ({
      ...s,
      isCalling: true,
      callType: type,
      remoteUser: targetUser,
      statusText: 'Connecting...'
    }));

    try {
      await this.setupLocalStream(type);
      this.createPeerConnection(targetUserId);

      // BUG FIX #5: createOffer AFTER tracks are added (createPeerConnection adds tracks)
      console.log('[WebRTC] Creating offer...');
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video'
      });
      await this.peerConnection!.setLocalDescription(offer);
      console.log('[WebRTC] Offer created & local description set. State:', this.peerConnection!.signalingState);

      // Record call in backend THEN send socket event
      this.http.post(`${environment.apiUrl}/calls/initiate`, {
        recipientId: targetUserId,
        type: type === 'audio' ? 'voice' : 'video'
      }).subscribe({
        next: (res: any) => {
          if (!this.state().isCalling) return; // Prevent race condition if call was ended before HTTP finished
          this.currentCallId = res.data?.call?._id || null;
          console.log('[WebRTC] Emitting call_initiate socket event with offer');
          this.socketService.initiateCall({
            targetUserId,
            callType: type,
            offer: this.peerConnection!.localDescription, // Use finalised local description
            callId: this.currentCallId
          });
          this.state.update(s => ({ ...s, statusText: 'Ringing...' }));
          this.soundService.startDialingTone();
        },
        error: (err) => {
          if (!this.state().isCalling) return; // Prevent race condition if call was ended before HTTP finished
          // Even if HTTP fails, still try to call via socket (non-critical)
          console.warn('[WebRTC] Backend call record failed, proceeding with socket anyway:', err);
          this.socketService.initiateCall({
            targetUserId,
            callType: type,
            offer: this.peerConnection!.localDescription,
            callId: null
          });
          this.state.update(s => ({ ...s, statusText: 'Ringing...' }));
          this.soundService.startDialingTone();
        }
      });
    } catch (err: any) {
      console.error('[WebRTC] Error starting call:', err);
      const msg = this.getMediaErrorMessage(err);
      this.toastService.error(msg);
      this.cleanupCall();
      this.state.update(s => ({ ...s, statusText: msg }));
      setTimeout(() => this.resetState(), 3000);
    }
  }

  async answerCall() {
    const s = this.state();
    const offer = (window as any)._pendingOffer;
    if (!offer || !s.remoteUser) {
      console.error('[WebRTC] Cannot answer: no pending offer or remote user');
      return;
    }

    console.log('[WebRTC] Answering call from:', s.remoteUser.username);
    this.soundService.stopCallAudio();
    this.hapticService.vibrateCallAccepted();
    this.state.update(st => ({ ...st, isReceiving: false, isCalling: true, statusText: 'Connecting...' }));

    try {
      await this.setupLocalStream(s.callType);
      this.createPeerConnection(s.remoteUser._id);

      // BUG FIX #6: Set remote description (offer) BEFORE creating answer
      console.log('[WebRTC] Setting remote description (offer)...');
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[WebRTC] Remote description (offer) set. State:', this.peerConnection!.signalingState);
      this.remoteDescriptionSet = true;
      await this.flushPendingCandidates();

      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);
      console.log('[WebRTC] Answer created & local description set. State:', this.peerConnection!.signalingState);

      this.socketService.answerCall({
        callerId: s.remoteUser._id,
        answer: this.peerConnection!.localDescription,
        callId: this.currentCallId
      });

      if (this.currentCallId) {
        this.http.post(`${environment.apiUrl}/calls/${this.currentCallId}/answer`, {}).subscribe();
      }

      this.state.update(st => ({ ...st, statusText: 'Call Connected' }));
    } catch (err: any) {
      console.error('[WebRTC] Error answering call:', err);
      const msg = this.getMediaErrorMessage(err);
      this.toastService.error(msg);
      this.rejectCall('Failed to connect media');
    }
  }

  rejectCall(reason: string = 'declined') {
    const remoteId = this.state().remoteUser?._id || this.currentTargetUserId;
    console.log('[WebRTC] Rejecting call. Reason:', reason);
    if (remoteId) {
      this.socketService.rejectCall({ callerId: remoteId, reason });
    }
    this.cleanupCall();
    this.resetState();
  }

  endCall() {
    const remoteId = this.state().remoteUser?._id || this.currentTargetUserId;
    console.log('[WebRTC] Ending call');
    if (remoteId) {
      this.socketService.endCall({ targetUserId: remoteId });
    }
    if (this.currentCallId) {
      this.http.post(`${environment.apiUrl}/calls/${this.currentCallId}/end`, {}).subscribe();
    }
    this.cleanupCall();
    this.resetState();
  }

  toggleMute() {
    this.state.update(s => {
      const isMuted = !s.isMuted;
      if (s.localStream) {
        s.localStream.getAudioTracks().forEach(track => {
          track.enabled = !isMuted;
        });
      }
      return { ...s, isMuted };
    });
  }

  toggleVideo() {
    this.state.update(s => {
      const isVideoOff = !s.isVideoOff;
      if (s.localStream) {
        s.localStream.getVideoTracks().forEach(track => {
          track.enabled = !isVideoOff;
        });
      }
      return { ...s, isVideoOff };
    });
  }

  toggleSpeaker() {
    this.state.update(s => ({ ...s, isSpeakerOff: !s.isSpeakerOff }));
  }

  private async setupLocalStream(type: 'audio' | 'video') {
    console.log('[WebRTC] Requesting media access. type:', type);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000
        },
        video: type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      });
      console.log('[WebRTC] Got local stream. Tracks:', stream.getTracks().map(t => `${t.kind}:${t.label}`));
      this.state.update(s => ({ ...s, localStream: stream }));
      return stream;
    } catch (err: any) {
      console.error('[WebRTC] getUserMedia failed:', err);
      throw err;
    }
  }

  private createPeerConnection(targetUserId: string) {
    if (this.peerConnection) {
      console.log('[WebRTC] Closing existing peer connection before creating new one');
      this.peerConnection.close();
    }

    console.log('[WebRTC] Creating RTCPeerConnection');
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);
    this.remoteDescriptionSet = false;
    this.pendingIceCandidates = [];

    // ICE Candidate Handler
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Sending ICE candidate to:', targetUserId);
        this.socketService.sendIceCandidate({
          targetUserId,
          candidate: event.candidate.toJSON()
        });
      } else {
        console.log('[WebRTC] ICE gathering complete');
      }
    };

    // ICE Connection State
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('[WebRTC] ICE connection state:', state);
      if (state === 'failed') {
        console.error('[WebRTC] ICE connection failed! Attempting restart...');
        this.toastService.error('Connection failed. Please try again.');
      }
      if (state === 'disconnected') {
        this.state.update(s => ({ ...s, statusText: 'Connection unstable...' }));
      }
      if (state === 'connected' || state === 'completed') {
        this.state.update(s => ({ ...s, statusText: 'Call Connected' }));
      }
    };

    // Signaling State
    this.peerConnection.onsignalingstatechange = () => {
      console.log('[WebRTC] Signaling state:', this.peerConnection?.signalingState);
    };

    // Connection State
    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.peerConnection?.connectionState);
    };

    // BUG FIX #7: ontrack - build remote stream from tracks, not just event.streams[0]
    // event.streams[0] can be undefined in Firefox and some Chrome versions
    const remoteStream = new MediaStream();
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Got remote track:', event.track.kind, '| streams:', event.streams.length);
      event.track.onunmute = () => {
        console.log('[WebRTC] Remote track unmuted:', event.track.kind);
      };
      // Add each track to our manually-managed remote stream
      remoteStream.addTrack(event.track);
      // Update the signal so Angular picks up the reference change
      this.ngZone.run(() => {
        this.state.update(s => ({ ...s, remoteStream: remoteStream }));
      });
    };

    // Add local tracks to peer connection
    const localStream = this.state().localStream;
    if (localStream) {
      localStream.getTracks().forEach(track => {
        console.log('[WebRTC] Adding local track to peer connection:', track.kind);
        this.peerConnection!.addTrack(track, localStream);
      });
    } else {
      console.error('[WebRTC] No local stream available when creating peer connection!');
    }

    return this.peerConnection;
  }

  private cleanupCall() {
    console.log('[WebRTC] Cleaning up call resources');
    this.soundService.stopCallAudio();
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onsignalingstatechange = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }
    const localStream = this.state().localStream;
    if (localStream) {
      localStream.getTracks().forEach(t => {
        t.stop();
        console.log('[WebRTC] Stopped local track:', t.kind);
      });
    }
    const remoteStream = this.state().remoteStream;
    if (remoteStream) {
      remoteStream.getTracks().forEach(t => {
        t.stop();
        console.log('[WebRTC] Stopped remote track:', t.kind);
      });
    }
    this.pendingIceCandidates = [];
    this.remoteDescriptionSet = false;
    (window as any)._pendingOffer = null;
  }

  private resetState() {
    this.state.set({
      isCalling: false,
      isReceiving: false,
      statusText: '',
      callType: 'audio',
      remoteUser: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoOff: false,
      isSpeakerOff: false
    });
    this.currentCallId = null;
    this.currentTargetUserId = null;
  }

  private getMediaErrorMessage(err: any): string {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return 'Camera/Microphone permission denied. Please allow access in your browser.';
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return 'No camera or microphone found. Please connect a device.';
    }
    if (err.name === 'NotReadableError') {
      return 'Camera/Microphone is already in use by another application.';
    }
    if (err.name === 'OverconstrainedError') {
      return 'Camera does not support the requested resolution.';
    }
    return err.message || 'Could not access camera/microphone.';
  }
}
