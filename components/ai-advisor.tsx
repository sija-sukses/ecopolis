'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, Mic, MicOff, Send, Sparkles, Square, Volume2, VolumeX, X } from 'lucide-react';

import { askAdvisor } from '@/app/actions/askAdvisor.ts';
import {
  localAdvisorReply,
  quickPromptsFor,
  type AdvisorMessage,
} from '@/lib/advisor.ts';
import { honorificOf } from '@/lib/avatars.ts';
import { useGame } from '@/lib/game-context.tsx';
import { ROUNDS } from '@/lib/scenarios.ts';
import { play } from '@/lib/sfx.ts';

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResult {
  0?: SpeechRecognitionResultItem;
  isFinal?: boolean;
}

interface SpeechRecognitionEventLike {
  results?: {
    0?: SpeechRecognitionResult;
  };
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const ORB_SIZE = 60;
const EDGE_MARGIN = 16;

function VoiceWave({ active = false }: { active?: boolean }) {
  return (
    <span className={`voice-wave${active ? ' voice-wave--active' : ''}`} aria-hidden="true">
      <span className="voice-wave__bar" />
      <span className="voice-wave__bar" />
      <span className="voice-wave__bar" />
      <span className="voice-wave__bar" />
    </span>
  );
}
function TypewriterText({
  text,
  animate = false,
  onUpdate,
}: {
  text: string;
  animate?: boolean;
  onUpdate?: () => void;
}) {
  const [displayedLength, setDisplayedLength] = useState(() => {
    if (!animate) return text.length;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return text.length;
    }
    return 0;
  });
  const hasFinishedRef = useRef(!animate);

  useEffect(() => {
    if (!animate || hasFinishedRef.current) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      hasFinishedRef.current = true;
      return;
    }

    const step = Math.max(1, Math.floor(text.length / 45));
    const timer = setInterval(() => {
      setDisplayedLength((prev) => {
        const next = Math.min(prev + step, text.length);
        if (next >= text.length) {
          clearInterval(timer);
          hasFinishedRef.current = true;
        }
        onUpdate?.();
        return next;
      });
    }, 22);

    return () => clearInterval(timer);
  }, [text, animate, onUpdate]);

  const isTyping = animate && displayedLength < text.length;

  return (
    <p>
      {text.slice(0, displayedLength)}
      {isTyping && <span className="typewriter-cursor" aria-hidden="true">▍</span>}
    </p>
  );
}

function speakIndonesian(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.04;
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.toLowerCase().includes('id'));
    if (idVoice) utterance.voice = idVoice;
    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
  } catch {
    onEnd?.();
  }
}

function stopSpeaking() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Abaikan.
  }
}

function getNudgeMessage(
  round: number,
  stats: { economy: number; environment: number; satisfaction: number; energy: number },
  hasLeader: boolean,
  isCrisis = false,
): string {
  if (!hasLeader) {
    return 'Siap memimpin kota? Pilih avatar dan nama Anda!';
  }
  if (round > ROUNDS) {
    return 'Laporan 2050 terbit! Diskusikan evaluasi bersama TARA.';
  }
  if (isCrisis) {
    if (stats.environment <= 30) {
      return '🚨 KRISIS LINGKUNGAN: Ekosistem terancam! Buka rencana kontinjensi.';
    }
    if (stats.economy <= 30) {
      return '🚨 KRISIS EKONOMI: Kas kota kritis! Buka rencana kontinjensi.';
    }
    if (stats.satisfaction <= 30) {
      return '🚨 KRISIS SOSIAL: Warga bergejolak! Buka rencana kontinjensi.';
    }
    if (stats.energy <= 30) {
      return '🚨 KRISIS ENERGI: Listrik menipis parah! Buka rencana kontinjensi.';
    }
  }
  if (stats.environment <= 35) {
    return '⚠️ Lingkungan kritis! TARA punya saran mitigasi emisi.';
  }
  if (stats.economy <= 35) {
    return '⚠️ Ekonomi defisit! Perlu stimulus anggaran segera.';
  }
  if (stats.satisfaction <= 35) {
    return '⚠️ Warga gelisah! Kebijakan berikutnya harus pro-rakyat.';
  }
  if (stats.energy <= 35) {
    return '⚠️ Listrik menipis! Amankan sumber daya energi.';
  }
  switch (round) {
    case 1:
      return 'TARA siap membantu analisis PLTU vs PLTS Surya.';
    case 2:
      return 'Bimbang antara tol atau BRT? Cek dampak jangka panjangnya.';
    case 3:
      return 'Kelola sampah: TPA murah atau investasi daur ulang?';
    case 4:
      return 'Ruang hijau atau industri? Tinjau dampaknya bersama TARA.';
    case 5:
      return 'Ronde penentu! Konsultasikan tata ruang hunian 2050.';
    default:
      return 'Ada yang ingin dikonsultasikan seputar strategi kota?';
  }
}

export function AiAdvisor() {
  const { state } = useGame();
  const [open, setOpen] = useState(false);
  const hasLeader = Boolean(state.leader);
  const isCrisis =
    hasLeader &&
    state.round <= ROUNDS &&
    (state.stats.environment <= 30 ||
      state.stats.economy <= 30 ||
      state.stats.satisfaction <= 30 ||
      state.stats.energy <= 30);
  const currentKey = `${state.round}-${hasLeader ? 'leader' : 'prep'}${isCrisis ? '-crisis' : ''}`;
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number; side: 'left' | 'right' }>({
    x: -1,
    y: -1,
    side: 'right',
  });
  const [dragging, setDragging] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceReply, setVoiceReply] = useState(true);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [lastEngine, setLastEngine] = useState<'gemini' | 'local' | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdvisorMessage[]>([
    {
      role: 'assistant',
      text: 'Halo! Saya TARA, Staf Ahli AI Ecopolis. Geser tombol ini ke mana saja, atau tanyakan strategi kota Anda lewat ketikan maupun suara!',
    },
  ]);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);
  const draggedRef = useRef(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Tempatkan orb di kanan bawah saat pertama kali dimuat, dan jaga agar tetap
  // di dalam layar ketika ukuran jendela berubah.
  useEffect(() => {
    function syncViewport() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const minY = vw < 768 ? 116 : EDGE_MARGIN;
      const maxY = vh - ORB_SIZE - (vw < 768 ? 20 : EDGE_MARGIN);
      setPos((prev) => {
        if (prev.x < 0 || prev.y < 0) {
          return {
            x: Math.max(EDGE_MARGIN, vw - ORB_SIZE - EDGE_MARGIN),
            y:
              vw < 768
                ? Math.round(vh * 0.45)
                : Math.max(EDGE_MARGIN, vh - ORB_SIZE - 28),
            side: 'right',
          };
        }
        const clampedY = Math.min(Math.max(minY, prev.y), maxY);
        const snapX =
          prev.side === 'left'
            ? EDGE_MARGIN
            : Math.max(EDGE_MARGIN, vw - ORB_SIZE - EDGE_MARGIN);
        return { x: snapX, y: clampedY, side: prev.side };
      });
    }

    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      recognitionRef.current?.stop();
    };
  }, []);

  // Pintasan keyboard: Alt+T / T untuk buka-tutup TARA, Esc untuk tutup
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if (e.key === 'Escape' && open) {
        setOpen(false);
        stopSpeaking();
        setSpeakingText(null);
        return;
      }

      if (
        (e.altKey && e.key.toLowerCase() === 't') ||
        (!isInput && e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey)
      ) {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) setDismissedKey(currentKey);
          if (prev) {
            stopSpeaking();
            setSpeakingText(null);
          }
          return !prev;
        });
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, currentKey]);

  // Batasi durasi tayang balon petunjuk (nudge) hingga 9 detik
  useEffect(() => {
    const timer = setTimeout(() => {
      setDismissedKey(currentKey);
    }, 9000);
    return () => clearTimeout(timer);
  }, [currentKey]);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;

    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) > 6) {
      d.moved = true;
      setDragging(true);
      setDismissedKey(currentKey);
    }
    if (!d.moved) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const minY = vw < 768 ? 116 : EDGE_MARGIN;
    const maxY = vh - ORB_SIZE - (vw < 768 ? 20 : EDGE_MARGIN);
    const nextX = Math.min(Math.max(EDGE_MARGIN, d.origX + dx), vw - ORB_SIZE - EDGE_MARGIN);
    const nextY = Math.min(Math.max(minY, d.origY + dy), maxY);
    setPos((prev) => ({ ...prev, x: nextX, y: nextY }));
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;

    if (d.moved) {
      draggedRef.current = true;
      setDragging(false);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const minY = vw < 768 ? 116 : EDGE_MARGIN;
      const maxY = vh - ORB_SIZE - (vw < 768 ? 20 : EDGE_MARGIN);
      const isLeft = pos.x + ORB_SIZE / 2 < vw / 2;
      const snapX = isLeft ? EDGE_MARGIN : Math.max(EDGE_MARGIN, vw - ORB_SIZE - EDGE_MARGIN);
      const clampedY = Math.min(Math.max(minY, pos.y), maxY);
      setPos((prev) => ({
        ...prev,
        x: snapX,
        y: clampedY,
        side: isLeft ? 'left' : 'right',
      }));
      return;
    }
    draggedRef.current = false;
  }

  async function ask(rawQuestion: string) {
    const trimmed = rawQuestion.trim();
    if (!trimmed || loading) return;

    setVoiceError(null);
    setInput('');
    const userMsg: AdvisorMessage = { role: 'user', text: trimmed };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setLoading(true);

    const payload = {
      leader: state.leader,
      round: state.round,
      stats: state.stats,
      choices: state.choices,
      question: trimmed,
      history: messages,
    };

    try {
      const res = await askAdvisor(payload);
      setLastEngine(res.fallback ? 'local' : 'gemini');
      const aiMsg: AdvisorMessage = {
        role: 'assistant',
        text: res.reply,
        fallback: res.fallback,
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (voiceReply && !state.muted) {
        speakIndonesian(
          res.reply,
          () => setSpeakingText(res.reply),
          () => setSpeakingText(null),
        );
      }
    } catch {
      const fallback = localAdvisorReply(payload);
      setLastEngine('local');
      const aiMsg: AdvisorMessage = {
        role: 'assistant',
        text: fallback.reply,
        fallback: true,
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (voiceReply && !state.muted) {
        speakIndonesian(
          fallback.reply,
          () => setSpeakingText(fallback.reply),
          () => setSpeakingText(null),
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleVoiceInput() {
    play('click', state.muted);
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }
    setVoiceError(null);

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const SpeechCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechCtor) {
      setVoiceError('Browser ini belum mendukung input mikrofon suara.');
      return;
    }

    try {
      stopSpeaking();
      const rec = new SpeechCtor();
      rec.lang = 'id-ID';
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      let finalTranscript = '';

      rec.onresult = (event) => {
        const result = event.results?.[0];
        const transcript = result?.[0]?.transcript ?? '';
        if (transcript) {
          setInput(transcript);
          if (result?.isFinal) {
            finalTranscript = transcript;
          }
        }
      };

      rec.onerror = () => {
        setListening(false);
        setVoiceError('Suara tidak terdengar jelas. Coba tekan mikrofon lagi.');
      };

      rec.onend = () => {
        setListening(false);
        if (finalTranscript.trim()) {
          void ask(finalTranscript);
        }
      };

      recognitionRef.current = rec;
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
      setVoiceError('Gagal menyalakan mikrofon.');
    }
  }

  if (pos.x < 0 || pos.y < 0) return null;

  const who = state.leader
    ? `${honorificOf(state.leader.avatar)} ${state.leader.name}`
    : 'Calon Wali Kota';
  const statusLabel = !state.leader
    ? 'Persiapan pemimpin'
    : state.round > ROUNDS
      ? 'Evaluasi 2050'
      : `Ronde ${state.round} / ${ROUNDS}`;

  const prompts = quickPromptsFor(state.round, Boolean(state.leader), isCrisis);
  const nudgeText = getNudgeMessage(state.round, state.stats, Boolean(state.leader), isCrisis);
  const showNudge = !open && !dragging && dismissedKey !== currentKey;

  return (
    <div
      className={`assist${open ? ' assist--open' : ''}${dragging ? ' assist--drag' : ''} assist--${pos.side}`}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
    >
      <button
        type="button"
        className={`assist__orb${isCrisis ? ' assist__orb--crisis' : showNudge && !open ? ' assist__orb--nudge' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => {
          if (draggedRef.current) {
            draggedRef.current = false;
            return;
          }
          play('click', state.muted);
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(8);
          }
          setOpen((prev) => {
            if (!prev) setDismissedKey(currentKey);
            if (prev) {
              stopSpeaking();
              setSpeakingText(null);
            }
            return !prev;
          });
        }}
        aria-expanded={open}
        aria-label={open ? 'Tutup Staf Ahli AI' : 'Buka Staf Ahli AI (bisa digeser)'}
        title="TARA — Staf Ahli AI (Geser atau klik, Alt+T)"
      >
        <span className="assist__ring" aria-hidden="true">
          <span className="assist__core">
            <Bot size={24} strokeWidth={2.4} />
          </span>
        </span>
        <span className={`assist__badge${isCrisis ? ' assist__badge--crisis' : ''}`} aria-hidden="true">
          {isCrisis ? 'SOS' : 'AI'}
        </span>
      </button>

      {showNudge && !open && !dragging && (
        <aside
          className={`assist__nudge assist__nudge--${pos.side}${isCrisis ? ' assist__nudge--crisis' : ''}`}
          aria-label="Petunjuk asisten TARA"
        >
          <button
            type="button"
            className="assist__nudge-body"
            aria-label={`Buka saran TARA: ${nudgeText}`}
            onClick={() => {
              play('click', state.muted);
              setOpen(true);
              setDismissedKey(currentKey);
            }}
          >
            <span className="assist__nudge-icon" aria-hidden="true">
              {isCrisis ? <AlertTriangle size={13} strokeWidth={2.4} /> : <Sparkles size={13} strokeWidth={2.4} />}
            </span>
            <span className="assist__nudge-text">{nudgeText}</span>
          </button>
          <button
            type="button"
            className="assist__nudge-dismiss"
            onClick={(e) => {
              e.stopPropagation();
              setDismissedKey(currentKey);
            }}
            aria-label="Tutup petunjuk TARA"
            title="Tutup"
          >
            <X size={12} strokeWidth={2.4} />
          </button>
        </aside>
      )}

      {open && (
        <section className="assist__panel" aria-label="Asisten AI Ecopolis">
          <header className="assist__head">
            <div className="assist__identity">
              <span
                className={`assist__avatar${speakingText ? ' assist__avatar--speaking' : ''}`}
                aria-hidden="true"
              >
                {speakingText ? (
                  <VoiceWave active={true} />
                ) : (
                  <Sparkles size={18} strokeWidth={2.4} />
                )}
              </span>
              <div>
                <div className="assist__title-row">
                  <b className="assist__title">TARA · Staf Ahli AI</b>
                  <span
                    className={`assist__engine-badge assist__engine-badge--${lastEngine || 'gemini'}`}
                  >
                    {lastEngine === 'local' ? '🛡️ Mode Cerdas' : '⚡ Gemini 2.5 Flash'}
                  </span>
                </div>
                <span className="assist__sub">
                  {who} · {statusLabel}
                </span>
              </div>
            </div>

            <div className="assist__controls">
              <button
                type="button"
                className="assist__icon-btn"
                aria-pressed={voiceReply}
                onClick={() => {
                  const next = !voiceReply;
                  setVoiceReply(next);
                  if (!next) {
                    stopSpeaking();
                    setSpeakingText(null);
                  }
                }}
                title={voiceReply ? 'Matikan balasan suara AI' : 'Nyalakan balasan suara AI'}
                aria-label={voiceReply ? 'Matikan suara AI' : 'Nyalakan suara AI'}
              >
                {voiceReply ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button
                type="button"
                className="assist__icon-btn"
                onClick={() => {
                  play('click', state.muted);
                  stopSpeaking();
                  setSpeakingText(null);
                  setOpen(false);
                }}
                title="Tutup panel AI (Esc)"
                aria-label="Tutup panel AI"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          <div className="assist__log" ref={logRef} aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`assist__msg assist__msg--${m.role}`}>
                <TypewriterText
                  text={m.text}
                  animate={i === messages.length - 1 && messages.length > 1 && m.role === 'assistant'}
                  onUpdate={() => {
                    if (logRef.current) {
                      logRef.current.scrollTop = logRef.current.scrollHeight;
                    }
                  }}
                />
                {m.role === 'assistant' && (
                  <div className="assist__msg-actions">
                    <button
                      type="button"
                      className={`assist__speak${speakingText === m.text ? ' assist__speak--active' : ''}`}
                      onClick={() => {
                        if (speakingText === m.text) {
                          stopSpeaking();
                          setSpeakingText(null);
                        } else {
                          speakIndonesian(
                            m.text,
                            () => setSpeakingText(m.text),
                            () => setSpeakingText(null),
                          );
                        }
                      }}
                      title={speakingText === m.text ? 'Hentikan suara' : 'Dengarkan suara'}
                    >
                      {speakingText === m.text ? (
                        <>
                          <Square size={11} fill="currentColor" /> Hentikan
                          <VoiceWave active={true} />
                        </>
                      ) : (
                        <>
                          <Volume2 size={13} /> Dengarkan
                        </>
                      )}
                    </button>

                    {m.fallback !== undefined && (
                      <span
                        className="assist__msg-engine"
                        title={
                          m.fallback
                            ? 'Dianalisis menggunakan Sistem Pakar Tata Ruang Lokal (Offline Resilience)'
                            : 'Dianalisis langsung menggunakan Google Gemini 2.5 Flash'
                        }
                      >
                        {m.fallback ? '🛡️ Mode Cerdas' : '⚡ Gemini AI'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="assist__msg assist__msg--assistant assist__msg--loading">
                <p>TARA sedang menganalisis data kota...</p>
              </div>
            )}
          </div>

          {voiceError && <p className="assist__err">{voiceError}</p>}

          <div className="assist__chips" aria-label="Pertanyaan cepat">
            {prompts.map((p) => {
              const isCrisisPrompt = p.includes('Kontinjensi') || p.includes('Darurat');
              return (
                <button
                  key={p}
                  type="button"
                  className={`assist__chip${isCrisisPrompt ? ' assist__chip--crisis' : ''}`}
                  disabled={loading}
                  onClick={() => {
                    play('click', state.muted);
                    void ask(p);
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <form
            className="assist__form"
            onSubmit={(e) => {
              e.preventDefault();
              play('click', state.muted);
              void ask(input);
            }}
          >
            <button
              type="button"
              className={`assist__mic${listening ? ' assist__mic--active' : ''}`}
              onClick={toggleVoiceInput}
              title={listening ? 'Berhenti mendengarkan' : 'Bicara dengan suara'}
              aria-label={listening ? 'Berhenti mendengarkan' : 'Bicara dengan suara'}
              aria-pressed={listening}
            >
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <div className="assist__input-wrap">
              <input
                id="advisor-query"
                name="advisor-query"
                className="assist__input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? 'Mendengarkan suara Anda...' : 'Tanya strategi / audit kota... (Alt+T)'}
                disabled={loading}
                aria-label="Pertanyaan untuk Staf Ahli AI"
              />
              {listening && (
                <span className="assist__input-wave" aria-hidden="true">
                  <VoiceWave active={true} />
                </span>
              )}
            </div>

            <button
              type="submit"
              className="assist__send"
              disabled={loading || !input.trim()}
              aria-label="Kirim pertanyaan"
            >
              <Send size={17} />
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
