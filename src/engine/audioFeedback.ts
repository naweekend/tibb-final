export function playClinicalChime(kind: 'emergency' | 'alarm' | 'tap'): void {
  if (typeof window === 'undefined') return;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (kind === 'tap') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
      return;
    }

    const pattern = kind === 'emergency' ? [880, 660, 880] : [587.33, 783.99];
    pattern.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'emergency' ? 'triangle' : 'sine';
      const start = now + idx * 0.22;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.16, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.19);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  } catch {
    // Web Audio blocked before user gesture
  }
}

let activeAudioElement: HTMLAudioElement | null = null;

export async function speakOfflineGuidance(text: string, lang: 'ur-PK' | 'en-US' = 'ur-PK'): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // When online, use Gemini 3.8 Flash Lite TTS for crystal-clear Urdu/English voice playback
  if (navigator.onLine) {
    try {
      const res = await fetch('/api/agent/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 400), lang }),
      });
      if (res.ok) {
        const data = (await res.json()) as { audioBase64?: string };
        if (data.audioBase64) {
          if (activeAudioElement) {
            activeAudioElement.pause();
          }
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          activeAudioElement = audio;
          await audio.play();
          return true;
        }
      }
    } catch {
      // Fall back cleanly to browser SpeechSynthesis / chime
    }
  }

  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find((v) =>
        v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase())
      );
      if (matched) utterance.voice = matched;
      utterance.lang = lang;
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      playClinicalChime('alarm');
      return false;
    }
  }

  playClinicalChime('alarm');
  return false;
}
