import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import api from '../../../services/api';
import './AiAssistant.css';

const ROLE_GREETINGS = {
  SUPERADMIN: "Bonjour ! Je suis votre assistant NovaBulletin. Comment puis-je vous aider à gérer la plateforme ?",
  ADMIN:      "Bonjour ! Je suis votre assistant NovaBulletin. Comment puis-je vous aider à gérer votre établissement ?",
  TEACHER:    "Bonjour ! Je suis votre assistant NovaBulletin. Comment puis-je vous aider aujourd'hui ?",
  STUDENT:    "Bonjour ! Je suis votre assistant NovaBulletin. Posez-moi vos questions sur vos notes ou bulletins.",
  PARENT:     "Bonjour ! Je suis votre assistant NovaBulletin. Je peux vous aider à comprendre les résultats de votre enfant.",
};

function AiAssistant() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const greeting = ROLE_GREETINGS[user?.role] ?? ROLE_GREETINGS.STUDENT;

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/assistant/chat', {
        messages: next,
        page: location.pathname,
      });
      setMessages([...next, { role: 'assistant', content: res.data.reply }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: "Désolé, une erreur s'est produite. Veuillez réessayer." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {open && (
        <div className="ai-panel">
          <div className="ai-panel__header">
            <span className="ai-panel__title">
              <span className="ai-panel__icon">✦</span>
              Assistant NovaBulletin
            </span>
            <button className="ai-panel__close" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
          </div>

          <div className="ai-panel__messages">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ai-msg--${m.role}`}>
                {m.role === 'assistant' && <span className="ai-msg__avatar">✦</span>}
                <div className="ai-msg__bubble">{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="ai-msg ai-msg--assistant">
                <span className="ai-msg__avatar">✦</span>
                <div className="ai-msg__bubble ai-msg__bubble--typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="ai-panel__footer">
            <textarea
              ref={inputRef}
              className="ai-panel__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Posez votre question…"
              rows={1}
              disabled={loading}
            />
            <button
              className="ai-panel__send"
              onClick={send}
              disabled={!input.trim() || loading}
              aria-label="Envoyer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <button
        className={`side-btn side-btn--ai${open ? ' side-btn--ai-active' : ''}`}
        title="Assistant IA"
        aria-label="Assistant IA"
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/>
          <path d="M8 12h.01M12 12h.01M16 12h.01"/>
        </svg>
      </button>
    </>
  );
}

export default AiAssistant;
