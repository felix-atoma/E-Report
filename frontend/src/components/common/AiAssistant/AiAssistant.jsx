import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import api from '../../../services/api';
import './AiAssistant.css';

const WELCOME = "Bonjour ! 👋 Je suis l'assistant NovaBulletin. Posez-moi n'importe quelle question sur la plateforme — notes, bulletins, frais, utilisateurs, etc.";

const SUGGESTIONS = [
  "Comment ajouter un élève ?",
  "Comment générer les bulletins ?",
  "Comment enregistrer un paiement ?",
  "Comment créer une classe ?",
  "Comment assigner un enseignant ?",
  "Comment voir les frais impayés ?",
];

function AiAssistant() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: WELCOME },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const question = text ?? input.trim();
    if (!question || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', {
        message: question,
        context: location.pathname,
      });
      setMessages((m) => [...m, { role: 'assistant', text: res.data.answer }]);
    } catch {
      setMessages((m) => [...m, {
        role: 'assistant',
        text: "Désolé, je n'ai pas pu répondre. Vérifiez votre connexion et réessayez.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const panel = open && (
    <div className="ai-panel">
          {/* Header */}
          <div className="ai-panel__header">
            <div className="ai-panel__header-left">
              <div className="ai-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <div className="ai-panel__title">Assistant NovaBulletin</div>
                <div className="ai-panel__subtitle">
                  <span className="ai-online-dot" /> En ligne
                </div>
              </div>
            </div>
            <button
              type="button"
              className="ai-panel__close"
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              aria-label="Fermer"
            >✕</button>
          </div>

          {/* Messages */}
          <div className="ai-panel__messages">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ai-msg--${m.role}`}>
                {m.role === 'assistant' && (
                  <div className="ai-msg__avatar">N</div>
                )}
                <div className="ai-msg__bubble">
                  {m.text.split('\n').map((line, j) => (
                    <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-msg ai-msg--assistant">
                <div className="ai-msg__avatar">N</div>
                <div className="ai-msg__bubble ai-msg__bubble--typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only when 1 message = welcome) */}
          {messages.length === 1 && !loading && (
            <div className="ai-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="ai-suggestion" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="ai-panel__input-wrap">
            <textarea
              ref={inputRef}
              className="ai-panel__input"
              placeholder="Posez votre question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading}
            />
            <button
              className="ai-panel__send"
              onClick={() => send()}
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
  );

  return (
    <>
      {createPortal(panel, document.body)}

      <button
        type="button"
        className={`side-btn side-btn--ai${open ? ' side-btn--ai-active' : ''}`}
        title="Centre d'aide"
        aria-label="Centre d'aide"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </button>
    </>
  );
}

export default AiAssistant;
