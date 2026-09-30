/**
 * chatbotService.js
 * =================
 * API client for the ChatBot Flask microservice (port 5002).
 * All requests include the JWT from localStorage automatically.
 */

const CHATBOT_BASE = 'http://localhost:5002';

function _headers(extra = {}) {
  const token = localStorage.getItem('access_token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// ── Chat ──────────────────────────────────────────────────────────────────────

/**
 * Fetch meetings metadata the user is allowed to select.
 * @returns {Promise<Array<{id, title, start_at, status, description}>>}
 */
export async function getChatMeetings() {
  const res = await fetch(`${CHATBOT_BASE}/api/chat/meetings`, {
    headers: _headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch chatbot meetings (${res.status})`);
  }
  return res.json();
}

/**
 * Send a chat message and get the full response.
 * @param {string} message
 * @param {number|null} conversationId
 * @param {Array<string>|null} meetingIds
 * @returns {Promise<{conversation_id, response, dashboard_config, sources, intent}>}
 */
export async function sendMessage(message, conversationId = null, meetingIds = null) {
  const res = await fetch(`${CHATBOT_BASE}/api/chat`, {
    method: 'POST',
    headers: _headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ message, conversation_id: conversationId, meeting_ids: meetingIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Chat request failed (${res.status})`);
  }
  return res.json();
}

/**
 * Stream a chat response via SSE.
 * @param {string} message
 * @param {number|null} conversationId
 * @param {object} callbacks — { onToken, onDashboard, onSources, onMeta, onDone, onError }
 * @param {Array<string>|null} meetingIds
 * @returns {function} abort controller
 */
export function streamMessage(message, conversationId, callbacks = {}, meetingIds = null) {
  const controller = new AbortController();

  fetch(`${CHATBOT_BASE}/api/chat/stream`, {
    method: 'POST',
    headers: _headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ message, conversation_id: conversationId, meeting_ids: meetingIds }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Chat stream failed (${res.status})`);
      }

      if (!res.body) {
        throw new Error('Streaming unavailable: empty server response');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            switch (data.type) {
              case 'token':
                callbacks.onToken?.(data.content);
                break;
              case 'dashboard':
                callbacks.onDashboard?.(data.config);
                break;
              case 'sources':
                callbacks.onSources?.(data.sources);
                break;
              case 'meta':
                callbacks.onMeta?.(data);
                break;
              case 'done':
                callbacks.onDone?.();
                break;
              case 'error':
                callbacks.onError?.(data.error);
                break;
              default:
                if (data.error) callbacks.onError?.(data.error);
                break;
            }
          } catch { /* skip unparseable lines */ }
        }
      }

      callbacks.onDone?.();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') callbacks.onError?.(err.message);
    });

  return () => controller.abort();
}

// ── Voice ─────────────────────────────────────────────────────────────────────

/**
 * Send audio to Whisper STT.
 * @param {Blob} audioBlob
 * @param {string|null} language
 * @returns {Promise<{text, language, segments}>}
 */
export async function sendAudio(audioBlob, language = null) {
  const form = new FormData();
  form.append('audio', audioBlob, 'recording.webm');
  if (language) form.append('language', language);

  const res = await fetch(`${CHATBOT_BASE}/api/stt`, {
    method: 'POST',
    headers: _headers(),
    body: form,
  });
  if (!res.ok) throw new Error(`STT failed (${res.status})`);
  return res.json();
}

/**
 * Request TTS for a text.
 * @param {string} text
 * @param {string} language
 * @returns {Promise<Blob>} WAV audio blob
 */
export async function getTTS(text, language = 'fr') {
  const res = await fetch(`${CHATBOT_BASE}/api/tts`, {
    method: 'POST',
    headers: _headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ text, language }),
  });
  if (!res.ok) throw new Error(`TTS failed (${res.status})`);
  return res.blob();
}

// ── History ───────────────────────────────────────────────────────────────────

export async function getHistory() {
  const res = await fetch(`${CHATBOT_BASE}/api/chat/history`, {
    headers: _headers(),
  });
  if (!res.ok) throw new Error(`History failed (${res.status})`);
  return res.json();
}

export async function getConversation(convId) {
  const res = await fetch(`${CHATBOT_BASE}/api/chat/${convId}`, {
    headers: _headers(),
  });
  if (!res.ok) throw new Error(`Conversation fetch failed (${res.status})`);
  return res.json();
}

export async function deleteConversation(convId) {
  const res = await fetch(`${CHATBOT_BASE}/api/chat/${convId}`, {
    method: 'DELETE',
    headers: _headers(),
  });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
  return res.json();
}
