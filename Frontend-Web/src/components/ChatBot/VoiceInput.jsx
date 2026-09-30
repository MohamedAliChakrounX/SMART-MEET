import React, { useState, useRef, useCallback } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { sendAudio } from '../../services/chatbotService';

/**
 * VoiceInput — Microphone recording button.
 * Records audio via MediaRecorder, sends to Whisper STT,
 * and calls onTranscript with the recognized text.
 */
export default function VoiceInput({ onTranscript, disabled = false, darkMode = true }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let options = {};
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          options = { mimeType: 'audio/ogg;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
        }
      }

      const recorder = new MediaRecorder(stream, options);
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks.current, { type: mimeType });
        setProcessing(true);
        try {
          const result = await sendAudio(blob);
          if (result.text?.trim()) onTranscript?.(result.text.trim());
        } catch (err) {
          console.error('[VoiceInput] STT error:', err);
        } finally {
          setProcessing(false);
        }
      };

      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
    } catch (err) {
      console.error('[VoiceInput] Mic access denied or recording config error:', err);
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  }, []);

  const handleClick = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || processing}
      title={recording ? 'Arrêter l\'enregistrement' : 'Enregistrer un message vocal'}
      className={`
        relative p-2.5 rounded-xl transition-all duration-200 border
        ${recording
          ? 'bg-red-500/20 text-red-500 ring-2 ring-red-500/30 animate-pulse border-red-500/20'
          : darkMode
            ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
            : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-800'}
        ${(disabled || processing) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {processing ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <Mic size={20} />
      )}
      {recording && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
      )}
    </button>
  );
}
