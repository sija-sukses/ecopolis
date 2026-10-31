'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Mic, MicOff, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react';

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

function speakIndonesian(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.04;
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.toLowerCase().includes('id'));
    if (idVoice) utterance.voice = idVoice;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Abaikan jika peramban memblokir sintesis suara.
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

export function AiAdvisor() {
  const { state } = useGame();
  const [open, setOpen] = useState(false);
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

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Tempatkan orb di kanan bawah saat pertama kali dimuat, dan jaga agar tetap
  // di dalam layar ketika ukuran jendela berubah.
  useEffect(() => {
    function syncViewport() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPos((prev) => {
        if (prev.x < 0 || prev.y < 0) {
          return {
            x: vw - ORB_SIZE - EDGE_MARGIN,
            y:
              vw < 768
                ? Math.round(vh * 0.48)
                : Math.max(EDGE_MARGIN, vh - ORB_SIZE - 28),
            side: 'right',
          };
        }
        const clampedY = Math.min(
          Math.max(EDGE_MARGIN, prev.y),
          Math.max(EDGE_MARGIN, vh - ORB_SIZE - EDGE_MARGIN),
        );
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
    }
    if (!d.moved) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const nextX = Math.min(Math.max(EDGE_MARGIN, d.origX + dx), vw - ORB_SIZE - EDGE_MARGIN);
    const nextY = Math.min(Math.max(EDGE_MARGIN, d.origY + dy), vh - ORB_SIZE - EDGE_MARGIN);
    setPos((prev) => ({ ...prev, x: nextX, y: nextY }));
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;

    if (d.moved) {
      setDragging(false);
      const vw = window.innerWidth;
      const isLeft = pos.x + ORB_SIZE / 2 < vw / 2;
      const snapX = isLeft ? EDGE_MARGIN : Math.max(EDGE_MARGIN, vw - ORB_SIZE - EDGE_MARGIN);
      setPos((prev) => ({
        ...prev,
        x: snapX,
        side: isLeft ? 'left' : 'right',
      }));
      return;
    }

    play('click', state.muted);
    setOpen((prev) => !prev);
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
      const aiMsg: AdvisorMessage = { role: 'assistant', text: res.reply };
      setMessages((prev) => [...prev, aiMsg]);
      if (voiceReply && !state.muted) {
        speakIndonesian(res.reply);
      }
    } catch {
      const fallback = localAdvisorReply(payload);
      const aiMsg: AdvisorMessage = { role: 'assistant', text: fallback.reply };
      setMessages((prev) => [...prev, aiMsg]);
      if (voiceReply && !state.muted) {
        speakIndonesian(fallback.reply);
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleVoiceInput() {
    play('click', state.muted);
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

  const prompts = quickPromptsFor(state.round, Boolean(state.leader));

  return (
    <div
      className={`assist${open ? ' assist--open' : ''}${dragging ? ' assist--drag' : ''} assist--${pos.side}`}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
    >
      <button
        type="button"
        className="assist__orb"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-expanded={open}
        aria-label={open ? 'Tutup Staf Ahli AI' : 'Buka Staf Ahli AI (bisa digeser)'}
        title="TARA — Staf Ahli AI (Geser atau klik)"
      >
        <span className="assist__ring" aria-hidden="true">
          <span className="assist__core">
            <Bot size={24} strokeWidth={2.4} />
          </span>
        </span>
        <span className="assist__badge" aria-hidden="true">
          AI
        </span>
      </button>

      {open && (
        <section className="assist__panel" aria-label="Asisten AI Ecopolis">
          <header className="assist__head">
            <div className="assist__identity">
              <span className="assist__avatar" aria-hidden="true">
                <Sparkles size={18} strokeWidth={2.4} />
              </span>
              <div>
                <b className="assist__title">TARA · Staf Ahli AI</b>
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
                  if (!next) stopSpeaking();
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
                  setOpen(false);
                }}
                title="Tutup panel AI"
                aria-label="Tutup panel AI"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          <div className="assist__log" ref={logRef} aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`assist__msg assist__msg--${m.role}`}>
                <p>{m.text}</p>
                {m.role === 'assistant' && (
                  <button
                    type="button"
                    className="assist__speak"
                    onClick={() => speakIndonesian(m.text)}
                  >
                    <Volume2 size={13} /> Dengarkan
                  </button>
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
            {prompts.map((p) => (
              <button
                key={p}
                type="button"
                className="assist__chip"
                disabled={loading}
                onClick={() => {
                  play('click', state.muted);
                  void ask(p);
                }}
              >
                {p}
              </button>
            ))}
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

            <input
              className="assist__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? 'Mendengarkan suara Anda...' : 'Tanya strategi kota...'}
              disabled={loading}
              aria-label="Pertanyaan untuk Staf Ahli AI"
            />

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
