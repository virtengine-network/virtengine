/* ─────────────────────────────────────────────────────────────
 *  Component: Chat View — ChatGPT-style message interface
 * ────────────────────────────────────────────────────────────── */
import { h } from "preact";
import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import htm from "htm";
import { apiFetch } from "../modules/api.js";
import { showToast } from "../modules/state.js";
import { formatRelative, truncate } from "../modules/utils.js";
import {
  sessionMessages,
  loadSessionMessages,
  selectedSessionId,
  sessionsData,
} from "./session-list.js";

const html = htm.bind(h);

/* ─── Code block copy button ─── */
function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  }, [code]);

  return html`
    <div class="chat-code-block">
      <button class="chat-code-copy" onClick=${handleCopy}>
        ${copied ? "✓" : "📋"}
      </button>
      <pre><code>${code}</code></pre>
    </div>
  `;
}

/* ─── Render message content with code block support ─── */
function MessageContent({ text }) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return html`${parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3, -3).replace(/^\w+\n/, "");
      return html`<${CodeBlock} key=${i} code=${code} />`;
    }
    return html`<span key=${i}>${part}</span>`;
  })}`;
}

/* ─── Chat View component ─── */
export function ChatView({ sessionId }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const messages = sessionMessages.value || [];

  const session = (sessionsData.value || []).find((s) => s.id === sessionId);
  const isActive =
    session?.status === "active" || session?.status === "running";

  /* Load messages on mount and poll while active */
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    setLoading(true);
    loadSessionMessages(sessionId).finally(() => {
      if (active) setLoading(false);
    });

    const interval = setInterval(() => {
      if (active) loadSessionMessages(sessionId);
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [sessionId]);

  /* Auto-scroll to bottom */
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    /* Optimistically add user message */
    const optimistic = {
      id: `opt-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    sessionMessages.value = [...sessionMessages.value, optimistic];
    setInput("");
    setSending(true);

    try {
      await apiFetch(`/api/sessions/${sessionId}/message`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      await loadSessionMessages(sessionId);
    } catch {
      showToast("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  }, [input, sending, sessionId]);

  const handleResume = useCallback(async () => {
    try {
      await apiFetch(`/api/sessions/${sessionId}/resume`, { method: "POST" });
      showToast("Session resumed", "success");
      await loadSessionMessages(sessionId);
    } catch {
      showToast("Failed to resume session", "error");
    }
  }, [sessionId]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (!sessionId) {
    return html`
      <div class="chat-view chat-empty-state">
        <div class="session-empty-icon">💬</div>
        <div class="session-empty-text">Select a session to view messages</div>
      </div>
    `;
  }

  return html`
    <div class="chat-view">
      <div class="chat-header">
        <div class="chat-header-title">
          ${session?.title || session?.taskId || "Session"}
        </div>
        <div class="chat-header-meta">
          ${session?.type || "manual"} · ${session?.status || "unknown"}
        </div>
      </div>

      <div class="chat-messages" ref=${messagesRef}>
        ${loading && messages.length === 0 && html`
          <div class="chat-loading">Loading messages…</div>
        `}
        ${messages.map(
          (msg) => html`
            <div
              key=${msg.id || msg.timestamp}
              class="chat-bubble ${msg.role === "user"
                ? "user"
                : msg.role === "system"
                  ? "system"
                  : "assistant"}"
            >
              ${msg.role === "system"
                ? html`<div class="chat-system-text">${msg.content}</div>`
                : html`
                    <div class="chat-bubble-content">
                      <${MessageContent} text=${msg.content} />
                    </div>
                    <div class="chat-bubble-time">
                      ${formatRelative(msg.timestamp)}
                    </div>
                  `}
            </div>
          `,
        )}
        ${sending && html`
          <div class="chat-bubble assistant">
            <div class="chat-typing">
              <span class="chat-typing-dot"></span>
              <span class="chat-typing-dot"></span>
              <span class="chat-typing-dot"></span>
            </div>
          </div>
        `}
      </div>

      <div class="chat-input-bar">
        ${!isActive && session?.status &&
        html`
          <button class="btn btn-primary btn-sm chat-resume-btn" onClick=${handleResume}>
            ▶ Resume Session
          </button>
        `}
        <div class="chat-input-row">
          <textarea
            ref=${inputRef}
            class="input chat-input"
            placeholder="Send a message…"
            rows="1"
            value=${input}
            onInput=${(e) => setInput(e.target.value)}
            onKeyDown=${handleKeyDown}
          />
          <button
            class="btn btn-primary chat-send-btn"
            disabled=${!input.trim() || sending}
            onClick=${handleSend}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  `;
}
