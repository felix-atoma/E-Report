import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Button from '../../../components/common/Button/Button';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import { lmsService } from '../../../services/lmsService';
import './StudentLMSPage.css';

const TABS = [
  { key: 'announcements', label: 'Annonces' },
  { key: 'materials',     label: 'Cours' },
  { key: 'assignments',   label: 'Devoirs' },
  { key: 'quizzes',       label: 'Quiz' },
];

function fmt(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Badge({ status }) {
  return <span className={`slms__badge slms__badge--${status?.toLowerCase()}`}>{status}</span>;
}

// ── Announcements ─────────────────────────────────────────────────────────────
function AnnouncementsSection() {
  const { data: items = [] } = useQuery({
    queryKey: ['lms-announcements-student'],
    queryFn: () => lmsService.announcements.list().then((r) => r.data),
  });

  return items.length === 0 ? (
    <div className="slms__empty">Aucune annonce pour le moment.</div>
  ) : (
    <div className="slms__grid">
      {items.map((a) => (
        <div key={a.id} className="slms__card">
          <div className="slms__card-title">{a.isPinned ? '📌 ' : ''}{a.title}</div>
          <div className="slms__card-body">{a.body}</div>
          <div className="slms__card-meta">
            <span>Par {a.author?.name}</span>
            {a.publishedAt && <span>· {fmt(a.publishedAt)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Materials ─────────────────────────────────────────────────────────────────
function MaterialsSection() {
  const { data: items = [] } = useQuery({
    queryKey: ['lms-materials-student'],
    queryFn: () => lmsService.materials.list({}).then((r) => r.data),
  });

  return items.length === 0 ? (
    <div className="slms__empty">Aucune ressource disponible.</div>
  ) : (
    <div className="slms__grid">
      {items.map((m) => (
        <div key={m.id} className="slms__card">
          <div className="slms__card-title">{m.title}</div>
          {m.description && <div className="slms__card-body">{m.description}</div>}
          <div className="slms__card-meta">
            <span>{m.class?.name}</span> · <span>{m.subject?.nameFr}</span> · <span>{m.type}</span>
          </div>
          <div className="slms__card-actions">
            <a href={m.url} target="_blank" rel="noreferrer">
              <Button size="sm">Ouvrir la ressource</Button>
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Assignments ───────────────────────────────────────────────────────────────
function AssignmentsSection() {
  const qc = useQueryClient();
  const [active, setActive] = useState(null); // assignment being submitted
  const [content, setContent] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  const { data: items = [] } = useQuery({
    queryKey: ['lms-assignments-student'],
    queryFn: () => lmsService.assignments.list({}).then((r) => r.data),
  });

  const { data: mySubmission } = useQuery({
    queryKey: ['lms-my-submission', active?.id],
    queryFn: () => lmsService.assignments.mySubmission(active.id).then((r) => r.data),
    enabled: !!active?.id,
  });

  const submitMut = useMutation({
    mutationFn: () => lmsService.assignments.submit(active.id, { content, attachmentUrl: attachmentUrl || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms-my-submission', active?.id] });
      qc.invalidateQueries({ queryKey: ['lms-assignments-student'] });
      toast.success('Devoir soumis !');
      setContent('');
      setAttachmentUrl('');
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  function openAssignment(a) {
    setActive(a);
    setContent('');
    setAttachmentUrl('');
  }

  return (
    <>
      {items.length === 0 ? (
        <div className="slms__empty">Aucun devoir assigné pour le moment.</div>
      ) : (
        <div className="slms__grid">
          {items.map((a) => (
            <div key={a.id} className="slms__card">
              <div className="slms__card-title">{a.title}</div>
              <div className="slms__card-meta">
                <span>{a.class?.name}</span> · <span>{a.subject?.nameFr}</span>
                {a.dueDate && <span>· à rendre le <strong>{fmt(a.dueDate)}</strong></span>}
                · <span>Note sur {a.maxScore}</span>
              </div>
              {a.instructions && <div className="slms__card-body" style={{ WebkitLineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>{a.instructions}</div>}
              <div className="slms__card-actions">
                <Button size="sm" onClick={() => openAssignment(a)}>Voir / Soumettre</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <OffCanvas
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.title ?? ''}
        size="md"
        footer={
          mySubmission ? null : (
            <><Button variant="ghost" onClick={() => setActive(null)}>Fermer</Button>
              <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending || (!content && !attachmentUrl)}>
                {submitMut.isPending ? 'Envoi…' : 'Soumettre'}
              </Button></>
          )
        }
      >
        {active && (
          <div className="slms__submit-form">
            <div className="slms__card-meta">
              <span>{active.class?.name}</span> · <span>{active.subject?.nameFr}</span>
              {active.dueDate && <span>· à rendre le {fmt(active.dueDate)}</span>}
            </div>
            {active.instructions && (
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '0.75rem', fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {active.instructions}
              </div>
            )}
            {mySubmission ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '1rem' }}>
                <strong style={{ color: '#15803d' }}>✔ Devoir soumis le {fmt(mySubmission.submittedAt)}</strong>
                {mySubmission.score != null && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    Note : <strong>{mySubmission.score} / {active.maxScore}</strong>
                    {mySubmission.feedback && <p style={{ marginTop: '0.4rem', color: '#374151' }}>{mySubmission.feedback}</p>}
                  </div>
                )}
                {mySubmission.content && <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#374151', whiteSpace: 'pre-wrap' }}>{mySubmission.content}</p>}
                <Badge status={mySubmission.status} />
              </div>
            ) : (
              <>
                <label className="slms__label">Votre réponse
                  <textarea className="slms__textarea" rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Écrivez votre réponse ici…" />
                </label>
                <label className="slms__label">Lien de pièce jointe (optionnel)
                  <input style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem' }}
                    value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="https://…" />
                </label>
              </>
            )}
          </div>
        )}
      </OffCanvas>
    </>
  );
}

// ── Quizzes ───────────────────────────────────────────────────────────────────
function QuizzesSection() {
  const qc = useQueryClient();
  const [active, setActive]     = useState(null); // quiz being taken
  const [attempt, setAttempt]   = useState(null); // current attempt
  const [answers, setAnswers]   = useState({});   // questionId -> {selectedOptionId?, textAnswer?}
  const [result, setResult]     = useState(null); // submitted attempt result

  const { data: items = [] } = useQuery({
    queryKey: ['lms-quizzes-student'],
    queryFn: () => lmsService.quizzes.list({}).then((r) => r.data),
  });

  const { data: quizDetail } = useQuery({
    queryKey: ['lms-quiz-take', active?.id],
    queryFn: () => lmsService.quizzes.get(active.id).then((r) => r.data),
    enabled: !!active?.id,
  });

  const { data: myAttempts = [] } = useQuery({
    queryKey: ['lms-my-attempts', active?.id],
    queryFn: () => lmsService.quizzes.myAttempts(active.id).then((r) => r.data),
    enabled: !!active?.id,
  });

  const startMut = useMutation({
    mutationFn: () => lmsService.quizzes.startAttempt(active.id),
    onSuccess: (r) => { setAttempt(r.data); setAnswers({}); setResult(null); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const submitMut = useMutation({
    mutationFn: () => lmsService.quizzes.submitAttempt(active.id, attempt.id, {
      answers: Object.entries(answers).map(([questionId, a]) => ({ questionId, ...a })),
    }),
    onSuccess: (r) => {
      setResult(r.data);
      setAttempt(null);
      qc.invalidateQueries({ queryKey: ['lms-my-attempts', active?.id] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  function setAnswer(questionId, key, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], [key]: value } }));
  }

  const questions = quizDetail?.questions ?? [];
  const prevDone  = myAttempts.filter((a) => a.submittedAt);

  return (
    <>
      {items.length === 0 ? (
        <div className="slms__empty">Aucun quiz disponible pour le moment.</div>
      ) : (
        <div className="slms__grid">
          {items.map((q) => (
            <div key={q.id} className="slms__card">
              <div className="slms__card-title">{q.title}</div>
              <div className="slms__card-meta">
                <span>{q.class?.name}</span> · <span>{q.subject?.nameFr}</span>
                <span>· {q._count?.questions ?? 0} question{q._count?.questions !== 1 ? 's' : ''}</span>
                {q.durationMinutes && <span>· {q.durationMinutes} min</span>}
              </div>
              {q.description && <div className="slms__card-body">{q.description}</div>}
              <div className="slms__card-actions">
                <Button size="sm" onClick={() => { setActive(q); setAttempt(null); setResult(null); setAnswers({}); }}>
                  Ouvrir le quiz
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <OffCanvas
        open={!!active}
        onClose={() => { setActive(null); setAttempt(null); setResult(null); setAnswers({}); }}
        title={active?.title ?? ''}
        size="lg"
        footer={
          attempt ? (
            <><Button variant="ghost" onClick={() => setAttempt(null)}>Annuler</Button>
              <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending}>
                {submitMut.isPending ? 'Envoi…' : 'Soumettre le quiz'}
              </Button></>
          ) : null
        }
      >
        {active && !attempt && !result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {active.description && <p style={{ fontSize: '0.875rem', color: '#374151' }}>{active.description}</p>}
            <div className="slms__card-meta">
              <span>Durée : {active.durationMinutes ? `${active.durationMinutes} min` : 'Illimitée'}</span>
              <span>· Tentatives max : {active.maxAttempts}</span>
              <span>· Tentatives effectuées : {prevDone.length}</span>
            </div>
            {prevDone.length > 0 && (
              <div>
                <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>Mes tentatives précédentes</strong>
                {prevDone.map((a) => (
                  <div key={a.id} style={{ fontSize: '0.85rem', padding: '0.4rem 0', borderBottom: '1px solid #f3f4f6' }}>
                    {fmt(a.submittedAt)} — Score : {a.score ?? '—'} / {a.maxScore ?? '—'}
                  </div>
                ))}
              </div>
            )}
            {prevDone.length < active.maxAttempts && (
              <Button onClick={() => startMut.mutate()} disabled={startMut.isPending}>
                {startMut.isPending ? 'Démarrage…' : 'Commencer le quiz'}
              </Button>
            )}
          </div>
        )}

        {attempt && questions.length > 0 && (
          <div className="slms__quiz-wrap">
            {questions.map((q, i) => (
              <div key={q.id} className="slms__question">
                <div className="slms__question-text">Q{i + 1}. {q.text} <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '0.8rem' }}>({q.points} pt{q.points > 1 ? 's' : ''})</span></div>
                {q.type === 'SHORT_ANSWER' ? (
                  <textarea className="slms__textarea"
                    value={answers[q.id]?.textAnswer ?? ''}
                    onChange={(e) => setAnswer(q.id, 'textAnswer', e.target.value)}
                    placeholder="Votre réponse…" />
                ) : (
                  <div className="slms__options">
                    {q.options?.map((o) => (
                      <label key={o.id} className={`slms__option${answers[q.id]?.selectedOptionId === o.id ? ' slms__option--selected' : ''}`}>
                        <input type="radio" name={q.id}
                          checked={answers[q.id]?.selectedOptionId === o.id}
                          onChange={() => setAnswer(q.id, 'selectedOptionId', o.id)} />
                        {o.text}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {active.showResults !== false && result.score != null && (
              <div className="slms__result">
                <div className="slms__result-score">{result.score} / {result.maxScore}</div>
                <div className="slms__result-label">
                  {result.maxScore ? `${Math.round((result.score / result.maxScore) * 100)}%` : ''}
                </div>
              </div>
            )}
            <p style={{ textAlign: 'center', color: '#374151', fontSize: '0.9rem' }}>Quiz soumis avec succès !</p>
            <Button variant="ghost" onClick={() => { setResult(null); }}>Retour à la liste</Button>
          </div>
        )}
      </OffCanvas>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StudentLMSPage() {
  const [tab, setTab] = useState('announcements');

  return (
    <AppShell title="Espace d'apprentissage">
      <PageHeader title="Espace d'apprentissage" subtitle="Vos cours, devoirs et quiz" />
      <div className="slms">
        <div className="slms__tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`slms__tab${tab === t.key ? ' slms__tab--active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'announcements' && <AnnouncementsSection />}
        {tab === 'materials'     && <MaterialsSection />}
        {tab === 'assignments'   && <AssignmentsSection />}
        {tab === 'quizzes'       && <QuizzesSection />}
      </div>
    </AppShell>
  );
}
