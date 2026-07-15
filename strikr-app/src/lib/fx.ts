// Shared feedback FX for STRIKR: haptics + short synthesized tones.
// No bundled audio files — tones are generated at runtime as tiny WAV buffers
// (the RN equivalent of the web prototype's Web Audio API oscillators).
import * as Haptics from 'expo-haptics';
import { createAudioPlayer } from 'expo-audio';

const SAMPLE_RATE = 22050;

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined;
    result += BASE64_CHARS[b0 >> 2];
    result += BASE64_CHARS[((b0 & 3) << 4) | (b1 !== undefined ? b1 >> 4 : 0)];
    result += b1 !== undefined ? BASE64_CHARS[((b1 & 15) << 2) | (b2 !== undefined ? b2 >> 6 : 0)] : '=';
    result += b2 !== undefined ? BASE64_CHARS[b2 & 63] : '=';
  }
  return result;
}

function toneWavDataUri(freq: number, duration: number, type: 'sine' | 'square', gainPeak: number): string {
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, s: string) {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  const attackEnd = Math.min(numSamples, Math.floor(SAMPLE_RATE * 0.01));
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let envelope: number;
    if (i < attackEnd) {
      envelope = (i / attackEnd) * gainPeak;
    } else {
      const decayT = t - attackEnd / SAMPLE_RATE;
      envelope = gainPeak * Math.exp(-decayT * (6 / duration));
    }
    let sample: number;
    if (type === 'square') {
      sample = Math.sign(Math.sin(2 * Math.PI * freq * t));
    } else {
      sample = Math.sin(2 * Math.PI * freq * t);
    }
    const value = Math.max(-1, Math.min(1, sample * envelope));
    view.setInt16(44 + i * 2, value * 0x7fff, true);
  }

  const base64 = bytesToBase64(new Uint8Array(buffer));
  return 'data:audio/wav;base64,' + base64;
}

function tone(freq: number, duration: number, type: 'sine' | 'square' = 'sine', gainPeak = 0.15) {
  try {
    const uri = toneWavDataUri(freq, duration, type, gainPeak);
    const player = createAudioPlayer({ uri });
    player.play();
    setTimeout(() => {
      try {
        player.remove();
      } catch {}
    }, (duration + 0.3) * 1000);
  } catch {
    // Sound is best-effort; never let it break gameplay.
  }
}

function vibrate(style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') {
  try {
    if (style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (style === 'warning' || style === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else if (style === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else if (style === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

export const fx = {
  correct() {
    vibrate('success');
    tone(523.25, 0.12, 'sine', 0.16);
    setTimeout(() => tone(783.99, 0.16, 'sine', 0.16), 90);
  },
  wrong() {
    vibrate('error');
    tone(160, 0.22, 'square', 0.1);
  },
  win() {
    vibrate('success');
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      setTimeout(() => tone(f, 0.18, 'sine', 0.14), i * 90);
    });
  },
  coin() {
    vibrate('light');
    tone(1046.5, 0.09, 'sine', 0.12);
    setTimeout(() => tone(1318.5, 0.12, 'sine', 0.12), 60);
  },
  tap() {
    vibrate('light');
  },
};
