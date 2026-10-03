import { GreetingLanguage, WelcomeAudioMode } from '../types/attendance';

let sharedAudioCtx: AudioContext | null = null;
let ambientIntervalId: number | null = null;
let ambientPlaying = false;
let currentTtsAudio: HTMLAudioElement | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// Preload SpeechSynthesis voices on browser load
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

/**
 * Plays a warm, refined Piano & Harp note with soft low-pass filtering
 */
function playWarmPianoNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  peakGain = 0.065
) {
  const oscMain = ctx.createOscillator();
  const oscHarmonic = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  oscMain.type = 'sine';
  oscMain.frequency.setValueAtTime(freq, startTime);

  // Soft octave/fifth shimmer for acoustic warmth
  oscHarmonic.type = 'triangle';
  oscHarmonic.frequency.setValueAtTime(freq * 2, startTime);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(2800, freq * 3.5), startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.045);
  gain.gain.exponentialRampToValueAtTime(
    peakGain * 0.45,
    startTime + Math.min(0.35, duration * 0.4)
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  const harmonicGain = ctx.createGain();
  harmonicGain.gain.setValueAtTime(0.18, startTime);

  oscMain.connect(filter);
  oscHarmonic.connect(harmonicGain);
  harmonicGain.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  oscMain.start(startTime);
  oscHarmonic.start(startTime);
  oscMain.stop(startTime + duration + 0.05);
  oscHarmonic.stop(startTime + duration + 0.05);
}

/**
 * Plays a gentle, sophisticated instrumental welcome melody (Nhạc không lời nhẹ nhàng, tinh tế)
 * welcoming guests, partners, speakers, and parents upon check-in.
 */
export function playInstrumentalWelcomeMelody() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime + 0.02;

  // Warm Cmaj9 -> Fmaj7 -> G6 -> Cmaj9 harp & piano arpeggio progression (~4.5 seconds)
  const notes = [
    // Chord 1: Cmaj9 warm pad & arpeggio
    { f: 261.63, t: 0.0, d: 2.2, g: 0.045 }, // C4
    { f: 329.63, t: 0.12, d: 2.0, g: 0.045 }, // E4
    { f: 392.0, t: 0.24, d: 1.9, g: 0.045 }, // G4
    { f: 493.88, t: 0.36, d: 1.8, g: 0.05 }, // B4
    { f: 587.33, t: 0.48, d: 1.8, g: 0.058 }, // D5
    { f: 659.25, t: 0.72, d: 1.5, g: 0.052 }, // E5

    // Chord 2: Fmaj9 -> G13 gentle uplift
    { f: 349.23, t: 1.45, d: 2.0, g: 0.042 }, // F4
    { f: 440.0, t: 1.58, d: 1.9, g: 0.045 }, // A4
    { f: 523.25, t: 1.72, d: 1.8, g: 0.05 }, // C5
    { f: 659.25, t: 1.86, d: 1.7, g: 0.055 }, // E5
    { f: 783.99, t: 2.05, d: 1.9, g: 0.06 }, // G5

    // Resolving cadence: Cmaj9 crystal bell
    { f: 523.25, t: 2.65, d: 2.4, g: 0.048 }, // C5
    { f: 659.25, t: 2.8, d: 2.3, g: 0.05 }, // E5
    { f: 783.99, t: 2.95, d: 2.3, g: 0.052 }, // G5
    { f: 1046.5, t: 3.12, d: 2.6, g: 0.058 }, // C6
  ];

  notes.forEach((n) => {
    playWarmPianoNote(ctx, n.f, now + n.t, n.d, n.g);
  });
}

/**
 * Starts or stops continuous gentle ambient lounge music (Nhạc nền không lời sảnh đón tiếp)
 */
export function setAmbientLoungeMusic(enable: boolean): boolean {
  if (!enable) {
    ambientPlaying = false;
    if (ambientIntervalId !== null) {
      window.clearInterval(ambientIntervalId);
      ambientIntervalId = null;
    }
    return false;
  }

  const ctx = getAudioContext();
  if (!ctx) return false;

  ambientPlaying = true;
  if (ambientIntervalId !== null) {
    window.clearInterval(ambientIntervalId);
  }

  let barIndex = 0;
  const progressions = [
    // Bar 1: Fmaj9 (F4 - A4 - C5 - E5 - G5)
    [
      { f: 174.61, t: 0.0, d: 3.6, g: 0.03 },
      { f: 349.23, t: 0.3, d: 3.2, g: 0.032 },
      { f: 440.0, t: 0.65, d: 2.9, g: 0.035 },
      { f: 523.25, t: 1.05, d: 2.6, g: 0.038 },
      { f: 659.25, t: 1.5, d: 2.4, g: 0.04 },
      { f: 783.99, t: 2.1, d: 2.0, g: 0.035 },
    ],
    // Bar 2: Em7 -> Am9 (E4 - G4 - B4 - D5 - E5)
    [
      { f: 164.81, t: 0.0, d: 3.6, g: 0.03 },
      { f: 329.63, t: 0.35, d: 3.1, g: 0.032 },
      { f: 392.0, t: 0.7, d: 2.8, g: 0.035 },
      { f: 493.88, t: 1.15, d: 2.5, g: 0.038 },
      { f: 587.33, t: 1.65, d: 2.2, g: 0.04 },
      { f: 659.25, t: 2.25, d: 1.9, g: 0.036 },
    ],
    // Bar 3: Dm9 -> G13 (D4 - F4 - A4 - C5 - E5)
    [
      { f: 146.83, t: 0.0, d: 3.6, g: 0.03 },
      { f: 293.66, t: 0.35, d: 3.1, g: 0.032 },
      { f: 349.23, t: 0.7, d: 2.8, g: 0.035 },
      { f: 440.0, t: 1.15, d: 2.5, g: 0.038 },
      { f: 523.25, t: 1.65, d: 2.2, g: 0.04 },
      { f: 659.25, t: 2.2, d: 1.9, g: 0.036 },
    ],
    // Bar 4: Cmaj9 (C4 - E4 - G4 - B4 - D5 - G5)
    [
      { f: 130.81, t: 0.0, d: 3.8, g: 0.03 },
      { f: 261.63, t: 0.35, d: 3.3, g: 0.032 },
      { f: 329.63, t: 0.7, d: 3.0, g: 0.035 },
      { f: 392.0, t: 1.1, d: 2.7, g: 0.038 },
      { f: 493.88, t: 1.55, d: 2.4, g: 0.04 },
      { f: 587.33, t: 2.05, d: 2.2, g: 0.042 },
    ],
  ];

  const playBar = () => {
    if (!ambientPlaying) return;
    const c = getAudioContext();
    if (!c) return;
    const now = c.currentTime + 0.03;
    const bar = progressions[barIndex % progressions.length];
    barIndex++;
    bar.forEach((n) => {
      playWarmPianoNote(c, n.f, now + n.t, n.d, n.g);
    });
  };

  playBar();
  ambientIntervalId = window.setInterval(playBar, 3800);
  return true;
}

export function isAmbientLoungeMusicPlaying(): boolean {
  return ambientPlaying;
}

export function playEventChime(type: 'check_in' | 'check_out' | 'error') {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime + 0.01;

  if (type === 'check_in') {
    // Play refined harp & piano welcome chord
    const freqs = [523.25, 659.25, 783.99, 987.77, 1174.66];
    freqs.forEach((f, idx) => {
      playWarmPianoNote(ctx, f, now + idx * 0.085, 1.35, 0.068);
    });
  } else if (type === 'check_out') {
    const freqs = [783.99, 659.25, 523.25];
    freqs.forEach((f, idx) => {
      playWarmPianoNote(ctx, f, now + idx * 0.12, 1.1, 0.055);
    });
  } else {
    // Gentle soft notification chime (no harsh red alert buzzer)
    playWarmPianoNote(ctx, 440, now, 0.6, 0.045);
    playWarmPianoNote(ctx, 523.25, now + 0.14, 0.8, 0.045);
  }
}

export function speakRedAlertWarning(_textVi: string) {
  // Red alert warning removed per user request
}

function normalizeVietnameseSpeechText(raw: string): string {
  return raw
    .replace(/\bTS\.\s*/gi, 'Tiến sĩ ')
    .replace(/\bPGS\.\s*/gi, 'Phó Giáo sư ')
    .replace(/\bGS\.\s*/gi, 'Giáo sư ')
    .replace(/\bThS\.\s*/gi, 'Thạc sĩ ')
    .replace(/\bVVIP\b/g, 'V-V-I-P')
    .replace(/[—·•|]/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEnglishSpeechText(raw: string): string {
  return raw
    .replace(/\bTS\.\s*/gi, 'Doctor ')
    .replace(/\bDr\.\s*/gi, 'Doctor ')
    .replace(/\bMr\.\s*/gi, 'Mister ')
    .replace(/\bMs\.\s*/gi, 'Ms ')
    .replace(/\bVVIP\b/g, 'V V I P')
    .replace(/[—·•|]/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findBestBrowserVoice(langPrefix: 'vi' | 'en'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  if (langPrefix === 'vi') {
    const viVoices = voices.filter(
      (v) =>
        v.lang.toLowerCase().startsWith('vi') ||
        v.name.toLowerCase().includes('viet') ||
        v.name.toLowerCase().includes('hoaimy') ||
        v.name.toLowerCase().includes('namminh') ||
        v.name.toLowerCase().includes('linh')
    );
    if (viVoices.length === 0) return null;
    return (
      viVoices.find(
        (v) =>
          v.name.toLowerCase().includes('natural') ||
          v.name.toLowerCase().includes('google') ||
          v.name.toLowerCase().includes('hoaimy')
      ) || viVoices[0]
    );
  }

  const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  if (enVoices.length === 0) return null;
  return (
    enVoices.find(
      (v) =>
        v.name.includes('Google US English') ||
        v.name.includes('Natural') ||
        v.name.includes('Samantha') ||
        v.name.includes('Jenny') ||
        v.name.includes('Aria') ||
        v.name.includes('Daniel')
    ) || enVoices[0]
  );
}

/**
 * Plays natural, accurate pronunciation in Vietnamese or English via server-assisted TTS stream
 * or native browser voice when available, ensuring Vietnamese is NEVER read by an English voice.
 */
async function playSingleLanguageSpeech(
  text: string,
  lang: 'vi' | 'en'
): Promise<void> {
  const cleaned =
    lang === 'vi'
      ? normalizeVietnameseSpeechText(text)
      : normalizeEnglishSpeechText(text);
  if (!cleaned) return;

  const nativeVoice = findBestBrowserVoice(lang);

  // For Vietnamese, if the OS/browser does NOT have a native vi-VN voice, use the server TTS audio endpoint first
  // so it speaks authentic Vietnamese instead of a broken English accent.
  if (lang === 'vi' && !nativeVoice) {
    try {
      if (currentTtsAudio) {
        currentTtsAudio.pause();
        currentTtsAudio = null;
      }
      const url = `/api/tts-audio?lang=vi&text=${encodeURIComponent(
        cleaned.slice(0, 220)
      )}`;
      const audio = new Audio(url);
      currentTtsAudio = audio;
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error('TTS stream error'));
        audio.play().catch(reject);
      });
      return;
    } catch {
      // If server TTS stream is unavailable and no vi-VN voice exists, play gentle instrumental melody instead of wrong accent
      playInstrumentalWelcomeMelody();
      return;
    }
  }

  // Try server TTS first for crystal-clear pronunciation, falling back to nativeVoice
  try {
    if (currentTtsAudio) {
      currentTtsAudio.pause();
      currentTtsAudio = null;
    }
    const url = `/api/tts-audio?lang=${lang}&text=${encodeURIComponent(
      cleaned.slice(0, 220)
    )}`;
    const audio = new Audio(url);
    currentTtsAudio = audio;
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('TTS stream error'));
      audio.play().catch(reject);
    });
    return;
  } catch {
    // Fallback to native browser SpeechSynthesisVoice
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window && nativeVoice) {
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(cleaned);
      u.voice = nativeVoice;
      u.lang = lang === 'vi' ? 'vi-VN' : 'en-US';
      u.rate = lang === 'vi' ? 0.98 : 0.95;
      u.pitch = 1.02;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  }
}

export function speakVietnameseGreeting(text: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  playSingleLanguageSpeech(text, 'vi');
}

/**
 * Speaks the camera guidance prompt: "Xin mời bạn đứng vào khuôn hình"
 */
export function speakStandInFramePrompt() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  playSingleLanguageSpeech('Xin mời bạn đứng vào khuôn hình', 'vi');
}

/**
 * Speaks the check-in confirmation prompt: "Cảm ơn bạn đã ghi danh"
 * optionally followed by the guest welcome greeting.
 */
export async function speakThankYouCheckIn(
  additionalWelcomeVi?: string,
  includeWelcome = false
) {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    const textToSpeak =
      includeWelcome && additionalWelcomeVi
        ? `Cảm ơn bạn đã ghi danh. ${additionalWelcomeVi}`
        : 'Cảm ơn bạn đã ghi danh';
    await playSingleLanguageSpeech(textToSpeak, 'vi');
  } catch {
    // Ignore audio autoplay restriction errors
  }
}

export function speakEnglishGreeting(textEn: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  playSingleLanguageSpeech(textEn, 'en');
}

export async function speakEventGreeting(
  textVi: string,
  textEn: string,
  languageMode: GreetingLanguage = 'vi',
  audioMode: WelcomeAudioMode = 'instrumental_and_voice',
  isCheckInAction = true
) {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (
      audioMode === 'instrumental_only' ||
      audioMode === 'instrumental_and_voice'
    ) {
      playInstrumentalWelcomeMelody();
    }

    if (isCheckInAction) {
      const hasThankYouPrefix = textVi
        .toLowerCase()
        .includes('cảm ơn bạn đã ghi danh');
      const fullViSpeech =
        audioMode === 'instrumental_only'
          ? 'Cảm ơn bạn đã ghi danh'
          : hasThankYouPrefix
          ? textVi
          : textVi
          ? `Cảm ơn bạn đã ghi danh. ${textVi}`
          : 'Cảm ơn bạn đã ghi danh';
      await playSingleLanguageSpeech(fullViSpeech, 'vi');
      return;
    }

    if (audioMode === 'instrumental_only') {
      return;
    }

    if (languageMode === 'vi' && textVi) {
      await playSingleLanguageSpeech(textVi, 'vi');
    } else if (languageMode === 'en' && textEn) {
      await playSingleLanguageSpeech(textEn, 'en');
    } else {
      if (textVi) {
        await playSingleLanguageSpeech(textVi, 'vi');
      }
      if (textEn) {
        await playSingleLanguageSpeech(textEn, 'en');
      }
    }
  } catch {
    // Ignore audio errors on restricted autoplay
  }
}
