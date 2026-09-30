import React, { useState, useRef } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { getTTS } from '../../services/chatbotService';

/**
 * VoiceOutput — Speaker button that plays TTS audio for a given text.
 */
export default function VoiceOutput({ text, language = 'fr' }) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const handlePlay = async () => {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    setLoading(true);
    try {
      const blob = await getTTS(text, language);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setPlaying(false);
        URL.revokeObjectURL(url);
      };

      await audio.play();
      setPlaying(true);
    } catch (err) {
      console.error('[VoiceOutput] TTS error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!text) return null;

  return (
    <button
      onClick={handlePlay}
      title="Écouter la réponse"
      className={`
        p-1.5 rounded-lg transition-all duration-200 border
        ${playing
          ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-450 border-indigo-500/25'
          : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-transparent text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10'}
      `}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Volume2 size={14} />
      )}
    </button>
  );
}
