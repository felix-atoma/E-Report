import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog';
import Button from '../../../components/common/Button/Button';
import { lmsService } from '../../../services/lmsService';
import { classesService } from '../../../services/classesService';
import { subjectsService } from '../../../services/subjectsService';
import './LMSPage.css';

const TABS = [
  { key: 'announcements', label: 'Annonces' },
  { key: 'materials',     label: 'Cours & Ressources' },
  { key: 'assignments',   label: 'Devoirs' },
  { key: 'quizzes',       label: 'Quiz' },
];

const AUDIENCE_OPTS = [
  { value: 'ALL',      label: 'Tout le monde' },
  { value: 'CLASS',    label: 'Classe spécifique' },
  { value: 'TEACHERS', label: 'Enseignants' },
  { value: 'STUDENTS', label: 'Élèves' },
  { value: 'PARENTS',  label: 'Parents' },
];

const MATERIAL_TYPES = [
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'VIDEO',    label: 'Vidéo' },
  { value: 'LINK',     label: 'Lien' },
  { value: 'IMAGE',    label: 'Image' },
];

function Badge({ variant, children }) {
  return <span className={`lms__badge lms__badge--${variant?.toLowerCase()}`}>{children}</span>;
}

function fmt(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Announcements tab ─────────────────────────────────────────────────────────

function AnnouncementsTab({ classes }) {
  const qc = useQueryClient();
  const [panel, setPanel]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm]     = useState({ title: '', body: '', audience: 'ALL', classId: '', isPinned: false });

  const { data: items = [] } = useQuery({
    queryKey: ['lms-announcements'],
    queryFn: () => lmsService.announcements.list().then((r) => r.data),
  });

  const upsert = useMutation({
    mutationFn: (data) => panel?.id
      ? lmsService.announcements.update(panel.id, data)
      : lmsService.announcements.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-announcements'] }); toast.success('Sauvegardé'); setPanel(null); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const del = useMutation({
    mutationFn: (id) => lmsService.announcements.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-announcements'] }); toast.success('Supprimé'); setConfirm(null); },
  });

  function openCreate() {
    setForm({ title: '', body: '', audience: 'ALL', classId: '', isPinned: false });
    setPanel({});
  }
  function openEdit(a) {
    setForm({ title: a.title, body: a.body, audience: a.audience, classId: a.classId ?? '', isPinned: a.isPinned });
    setPanel(a);
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <Button icon="+" onClick={openCreate}>Nouvelle annonce</Button>
      </div>

      {items.length === 0 ? (
        <div className="lms__empty">Aucune annonce pour le moment.</div>
      ) : (
        <div className="lms__grid">
          {items.map((a) => (
            <div key={a.id} className="lms__card">
              <div className="lms__card-header">
                <div className="lms__card-title">{a.title}</div>
                <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                  {a.isPinned && <Badge variant="pinned">📌 Épinglé</Badge>}
                  <Badge variant={a.audience}>{AUDIENCE_OPTS.find(o => o.value === a.audience)?.label ?? a.audience}</Badge>
                </div>
              </div>
              <div className="lms__card-body">{a.body}</div>
              <div className="lms__card-meta">
                <span>Par {a.author?.name}</span>
                {a.publishedAt && <span>· {fmt(a.publishedAt)}</span>}
                {a.expiresAt && <span>· expire {fmt(a.expiresAt)}</span>}
              </div>
              <div className="lms__card-actions">
                <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>Modifier</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(a)}>Supprimer</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <OffCanvas open={!!panel} onClose={() => setPanel(null)} title={panel?.id ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
        size="md"
        footer={<><Button variant="ghost" onClick={() => setPanel(null)}>Annuler</Button>
          <Button onClick={() => upsert.mutate(form)} disabled={upsert.isPending}>
            {upsert.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button></>}
      >
        <div className="lms__form">
          <label className="lms__label">Titre *
            <input className="lms__input" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
          </label>
          <label className="lms__label">Message *
            <textarea className="lms__textarea" rows={5} value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} />
          </label>
          <label className="lms__label">Audience
            <select className="lms__select" value={form.audience} onChange={(e) => setForm(f => ({ ...f, audience: e.target.value }))}>
              {AUDIENCE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          {form.audience === 'CLASS' && (
            <label className="lms__label">Classe
              <select className="lms__select" value={form.classId} onChange={(e) => setForm(f => ({ ...f, classId: e.target.value }))}>
                <option value="">— Choisir —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm(f => ({ ...f, isPinned: e.target.checked }))} />
            Épingler en haut
          </label>
        </div>
      </OffCanvas>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => del.mutate(confirm.id)} loading={del.isPending}
        title="Supprimer l'annonce" message={`Supprimer "${confirm?.title}" ?`}
        confirmLabel="Supprimer" variant="danger" />
    </>
  );
}

// ── Materials tab ─────────────────────────────────────────────────────────────

function MaterialsTab({ classes, subjects }) {
  const qc = useQueryClient();
  const [panel, setPanel]   = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [classId, setClassId]   = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [form, setForm] = useState({ title: '', description: '', type: 'DOCUMENT', url: '', classId: '', subjectId: '', academicYear: String(new Date().getFullYear()), termNumber: '' });

  const { data: items = [] } = useQuery({
    queryKey: ['lms-materials', classId, subjectId],
    queryFn: () => lmsService.materials.list({ classId: classId || undefined, subjectId: subjectId || undefined }).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data) => lmsService.materials.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-materials'] }); toast.success('Ressource ajoutée'); setPanel(false); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const del = useMutation({
    mutationFn: (id) => lmsService.materials.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-materials'] }); toast.success('Supprimé'); setConfirm(null); },
  });

  return (
    <>
      <div className="lms__filters">
        <select className="lms__filter-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Toutes les classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="lms__filter-select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">Toutes les matières</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.nameFr}</option>)}
        </select>
        <Button icon="+" onClick={() => setPanel(true)}>Ajouter une ressource</Button>
      </div>

      {items.length === 0 ? (
        <div className="lms__empty">Aucune ressource pour le moment.</div>
      ) : (
        <div className="lms__grid">
          {items.map((m) => (
            <div key={m.id} className="lms__card">
              <div className="lms__card-header">
                <div className="lms__card-title">{m.title}</div>
                <Badge variant={m.type}>{m.type}</Badge>
              </div>
              {m.description && <div className="lms__card-body">{m.description}</div>}
              <div className="lms__card-meta">
                <span>{m.class?.name}</span> · <span>{m.subject?.nameFr}</span> · <span>{m.academicYear}</span>
              </div>
              <div className="lms__card-actions">
                <a href={m.url} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost">Ouvrir</Button>
                </a>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(m)}>Supprimer</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <OffCanvas open={panel} onClose={() => setPanel(false)} title="Ajouter une ressource" size="md"
        footer={<><Button variant="ghost" onClick={() => setPanel(false)}>Annuler</Button>
          <Button onClick={() => create.mutate({ ...form, termNumber: form.termNumber ? Number(form.termNumber) : undefined })} disabled={create.isPending}>
            {create.isPending ? '…' : 'Enregistrer'}
          </Button></>}
      >
        <div className="lms__form">
          <label className="lms__label">Titre *<input className="lms__input" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} /></label>
          <label className="lms__label">Description<textarea className="lms__textarea" rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} /></label>
          <div className="lms__form-row">
            <label className="lms__label">Type
              <select className="lms__select" value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}>
                {MATERIAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="lms__label">Année scolaire<input className="lms__input" value={form.academicYear} onChange={(e) => setForm(f => ({ ...f, academicYear: e.target.value }))} /></label>
          </div>
          <label className="lms__label">URL / Lien *<input className="lms__input" placeholder="https://…" value={form.url} onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))} /></label>
          <div className="lms__form-row">
            <label className="lms__label">Classe *
              <select className="lms__select" value={form.classId} onChange={(e) => setForm(f => ({ ...f, classId: e.target.value }))}>
                <option value="">—</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="lms__label">Matière *
              <select className="lms__select" value={form.subjectId} onChange={(e) => setForm(f => ({ ...f, subjectId: e.target.value }))}>
                <option value="">—</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.nameFr}</option>)}
              </select>
            </label>
          </div>
        </div>
      </OffCanvas>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => del.mutate(confirm.id)} loading={del.isPending}
        title="Supprimer la ressource" message={`Supprimer "${confirm?.title}" ?`}
        confirmLabel="Supprimer" variant="danger" />
    </>
  );
}

// ── Assignments tab ───────────────────────────────────────────────────────────

function AssignmentsTab({ classes, subjects }) {
  const qc = useQueryClient();
  const [panel, setPanel]     = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [subPanel, setSubPanel] = useState(null); // submissions panel
  const [classId, setClassId] = useState('');
  const [grades, setGrades]   = useState({}); // submissionId -> score
  const [feedback, setFeedback] = useState({});
  const EMPTY = { title: '', instructions: '', dueDate: '', maxScore: 20, classId: '', subjectId: '', academicYear: String(new Date().getFullYear()), termNumber: '' };
  const [form, setForm]       = useState(EMPTY);

  const { data: items = [] } = useQuery({
    queryKey: ['lms-assignments', classId],
    queryFn: () => lmsService.assignments.list({ classId: classId || undefined }).then((r) => r.data),
  });

  const { data: submissions = [], refetch: refetchSubs } = useQuery({
    queryKey: ['lms-submissions', subPanel?.id],
    queryFn: () => lmsService.assignments.submissions(subPanel.id).then((r) => r.data),
    enabled: !!subPanel?.id,
  });

  const upsert = useMutation({
    mutationFn: (data) => panel?.id ? lmsService.assignments.update(panel.id, data) : lmsService.assignments.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-assignments'] }); toast.success('Sauvegardé'); setPanel(null); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const publishMut = useMutation({
    mutationFn: (id) => lmsService.assignments.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-assignments'] }); toast.success('Statut mis à jour'); },
  });

  const del = useMutation({
    mutationFn: (id) => lmsService.assignments.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-assignments'] }); toast.success('Supprimé'); setConfirm(null); },
  });

  const gradeMut = useMutation({
    mutationFn: ({ assignmentId, subId, score, fb }) => lmsService.assignments.grade(assignmentId, subId, { score: Number(score), feedback: fb }),
    onSuccess: () => { refetchSubs(); toast.success('Note enregistrée'); },
  });

  return (
    <>
      <div className="lms__filters">
        <select className="lms__filter-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Toutes les classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button icon="+" onClick={() => { setForm(EMPTY); setPanel({}); }}>Nouveau devoir</Button>
      </div>

      {items.length === 0 ? (
        <div className="lms__empty">Aucun devoir pour le moment.</div>
      ) : (
        <div className="lms__grid">
          {items.map((a) => (
            <div key={a.id} className="lms__card">
              <div className="lms__card-header">
                <div className="lms__card-title">{a.title}</div>
                <Badge variant={a.status.toLowerCase()}>{a.status}</Badge>
              </div>
              <div className="lms__card-meta">
                <span>{a.class?.name}</span> · <span>{a.subject?.nameFr}</span>
                {a.dueDate && <span>· à rendre le {fmt(a.dueDate)}</span>}
                <span>· {a._count?.submissions ?? 0} soumission{a._count?.submissions !== 1 ? 's' : ''}</span>
              </div>
              {a.instructions && <div className="lms__card-body" style={{ WebkitLineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>{a.instructions}</div>}
              <div className="lms__card-actions">
                <Button size="sm" variant="ghost" onClick={() => {
                  setForm({ title: a.title, instructions: a.instructions ?? '', dueDate: a.dueDate ? a.dueDate.slice(0,10) : '', maxScore: a.maxScore, classId: a.classId, subjectId: a.subjectId, academicYear: a.academicYear, termNumber: a.termNumber ?? '' });
                  setPanel(a);
                }}>Modifier</Button>
                <Button size="sm" variant="ghost" onClick={() => publishMut.mutate(a.id)}>
                  {a.status === 'PUBLISHED' ? 'Clôturer' : 'Publier'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSubPanel(a)}>Soumissions</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(a)}>Supprimer</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/edit panel */}
      <OffCanvas open={!!panel} onClose={() => setPanel(null)} title={panel?.id ? 'Modifier le devoir' : 'Nouveau devoir'} size="md"
        footer={<><Button variant="ghost" onClick={() => setPanel(null)}>Annuler</Button>
          <Button onClick={() => upsert.mutate({ ...form, termNumber: form.termNumber ? Number(form.termNumber) : undefined, maxScore: Number(form.maxScore) })} disabled={upsert.isPending}>
            {upsert.isPending ? '…' : 'Enregistrer'}
          </Button></>}
      >
        <div className="lms__form">
          <label className="lms__label">Titre *<input className="lms__input" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} /></label>
          <label className="lms__label">Consignes<textarea className="lms__textarea" rows={4} value={form.instructions} onChange={(e) => setForm(f => ({ ...f, instructions: e.target.value }))} /></label>
          <div className="lms__form-row">
            <label className="lms__label">Date limite<input type="date" className="lms__input" value={form.dueDate} onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))} /></label>
            <label className="lms__label">Note max<input type="number" className="lms__input" value={form.maxScore} onChange={(e) => setForm(f => ({ ...f, maxScore: e.target.value }))} /></label>
          </div>
          <div className="lms__form-row">
            <label className="lms__label">Classe *
              <select className="lms__select" value={form.classId} onChange={(e) => setForm(f => ({ ...f, classId: e.target.value }))}>
                <option value="">—</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="lms__label">Matière *
              <select className="lms__select" value={form.subjectId} onChange={(e) => setForm(f => ({ ...f, subjectId: e.target.value }))}>
                <option value="">—</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.nameFr}</option>)}
              </select>
            </label>
          </div>
          <label className="lms__label">Année scolaire<input className="lms__input" value={form.academicYear} onChange={(e) => setForm(f => ({ ...f, academicYear: e.target.value }))} /></label>
        </div>
      </OffCanvas>

      {/* Submissions panel */}
      <OffCanvas open={!!subPanel} onClose={() => setSubPanel(null)} title={`Soumissions — ${subPanel?.title ?? ''}`} size="lg">
        <div style={{ overflowX: 'auto' }}>
          {submissions.length === 0 ? (
            <div className="lms__empty">Aucune soumission encore.</div>
          ) : (
            <table className="lms__sub-table">
              <thead><tr><th>Élève</th><th>Statut</th><th>Soumis le</th><th>Travail</th><th>Note /{subPanel?.maxScore ?? 20}</th><th></th></tr></thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.student?.user?.name ?? s.student?.admissionNumber}</td>
                    <td><Badge variant={s.status.toLowerCase()}>{s.status}</Badge></td>
                    <td>{fmt(s.submittedAt)}</td>
                    <td style={{ maxWidth: 200, fontSize: '0.8rem' }}>
                      {s.content && <div style={{ whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>{s.content}</div>}
                      {s.attachmentUrl && <a href={s.attachmentUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '0.78rem' }}>Pièce jointe</a>}
                    </td>
                    <td>
                      <div className="lms__sub-score">
                        <input type="number" min={0} max={subPanel?.maxScore ?? 20} step={0.5}
                          value={grades[s.id] ?? s.score ?? ''}
                          onChange={(e) => setGrades(g => ({ ...g, [s.id]: e.target.value }))} />
                        <span style={{ color: '#6b7280', fontSize: '0.78rem' }}>/{subPanel?.maxScore ?? 20}</span>
                      </div>
                    </td>
                    <td>
                      <Button size="sm" onClick={() => gradeMut.mutate({ assignmentId: subPanel.id, subId: s.id, score: grades[s.id] ?? s.score, fb: feedback[s.id] ?? s.feedback })}>
                        Enregistrer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </OffCanvas>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => del.mutate(confirm.id)} loading={del.isPending}
        title="Supprimer le devoir" message={`Supprimer "${confirm?.title}" ?`}
        confirmLabel="Supprimer" variant="danger" />
    </>
  );
}

// ── Quizzes tab ───────────────────────────────────────────────────────────────

function QuizzesTab({ classes, subjects }) {
  const qc = useQueryClient();
  const [panel, setPanel]       = useState(null);
  const [confirm, setConfirm]   = useState(null);
  const [builderQuiz, setBuilderQuiz] = useState(null);
  const [resultsQuiz, setResultsQuiz] = useState(null);
  const [classId, setClassId]   = useState('');
  const EMPTY = { title: '', description: '', durationMinutes: '', maxAttempts: 1, classId: '', subjectId: '', academicYear: String(new Date().getFullYear()), termNumber: '', showResults: true };
  const [form, setForm]         = useState(EMPTY);
  const [qForm, setQForm]       = useState({ text: '', type: 'MCQ', points: 1, options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }] });

  const { data: items = [] } = useQuery({
    queryKey: ['lms-quizzes', classId],
    queryFn: () => lmsService.quizzes.list({ classId: classId || undefined }).then((r) => r.data),
  });

  const { data: builderData, refetch: refetchBuilder } = useQuery({
    queryKey: ['lms-quiz-detail', builderQuiz?.id],
    queryFn: () => lmsService.quizzes.get(builderQuiz.id).then((r) => r.data),
    enabled: !!builderQuiz?.id,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['lms-quiz-results', resultsQuiz?.id],
    queryFn: () => lmsService.quizzes.results(resultsQuiz.id).then((r) => r.data),
    enabled: !!resultsQuiz?.id,
  });

  const upsert = useMutation({
    mutationFn: (data) => panel?.id ? lmsService.quizzes.update(panel.id, data) : lmsService.quizzes.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-quizzes'] }); toast.success('Sauvegardé'); setPanel(null); },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Erreur'),
  });

  const publishMut = useMutation({
    mutationFn: (id) => lmsService.quizzes.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-quizzes'] }); toast.success('Statut mis à jour'); },
  });

  const del = useMutation({
    mutationFn: (id) => lmsService.quizzes.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms-quizzes'] }); toast.success('Supprimé'); setConfirm(null); },
  });

  const addQ = useMutation({
    mutationFn: (data) => lmsService.quizzes.addQuestion(builderQuiz.id, data),
    onSuccess: () => { refetchBuilder(); toast.success('Question ajoutée'); setQForm({ text: '', type: 'MCQ', points: 1, options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }] }); },
  });

  const delQ = useMutation({
    mutationFn: ({ qId }) => lmsService.quizzes.deleteQuestion(builderQuiz.id, qId),
    onSuccess: () => refetchBuilder(),
  });

  const questions = builderData?.questions ?? [];
  const hasShortAnswer = qForm.type === 'SHORT_ANSWER';

  return (
    <>
      <div className="lms__filters">
        <select className="lms__filter-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Toutes les classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button icon="+" onClick={() => { setForm(EMPTY); setPanel({}); }}>Nouveau quiz</Button>
      </div>

      {items.length === 0 ? (
        <div className="lms__empty">Aucun quiz pour le moment.</div>
      ) : (
        <div className="lms__grid">
          {items.map((q) => (
            <div key={q.id} className="lms__card">
              <div className="lms__card-header">
                <div className="lms__card-title">{q.title}</div>
                <Badge variant={q.status.toLowerCase()}>{q.status}</Badge>
              </div>
              <div className="lms__card-meta">
                <span>{q.class?.name}</span> · <span>{q.subject?.nameFr}</span>
                <span>· {q._count?.questions ?? 0} question{q._count?.questions !== 1 ? 's' : ''}</span>
                <span>· {q._count?.attempts ?? 0} tentative{q._count?.attempts !== 1 ? 's' : ''}</span>
                {q.durationMinutes && <span>· {q.durationMinutes} min</span>}
              </div>
              <div className="lms__card-actions">
                <Button size="sm" variant="ghost" onClick={() => {
                  setForm({ title: q.title, description: q.description ?? '', durationMinutes: q.durationMinutes ?? '', maxAttempts: q.maxAttempts, classId: q.classId, subjectId: q.subjectId, academicYear: q.academicYear, termNumber: q.termNumber ?? '', showResults: q.showResults });
                  setPanel(q);
                }}>Modifier</Button>
                <Button size="sm" variant="ghost" onClick={() => publishMut.mutate(q.id)}>
                  {q.status === 'OPEN' ? 'Fermer' : 'Ouvrir'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setBuilderQuiz(q)}>Questions</Button>
                <Button size="sm" variant="ghost" onClick={() => setResultsQuiz(q)}>Résultats</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(q)}>Supprimer</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/edit quiz */}
      <OffCanvas open={!!panel} onClose={() => setPanel(null)} title={panel?.id ? 'Modifier le quiz' : 'Nouveau quiz'} size="md"
        footer={<><Button variant="ghost" onClick={() => setPanel(null)}>Annuler</Button>
          <Button onClick={() => upsert.mutate({ ...form, durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined, maxAttempts: Number(form.maxAttempts), termNumber: form.termNumber ? Number(form.termNumber) : undefined })} disabled={upsert.isPending}>
            {upsert.isPending ? '…' : 'Enregistrer'}
          </Button></>}
      >
        <div className="lms__form">
          <label className="lms__label">Titre *<input className="lms__input" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} /></label>
          <label className="lms__label">Description<textarea className="lms__textarea" rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} /></label>
          <div className="lms__form-row">
            <label className="lms__label">Durée (min)<input type="number" className="lms__input" placeholder="Illimitée" value={form.durationMinutes} onChange={(e) => setForm(f => ({ ...f, durationMinutes: e.target.value }))} /></label>
            <label className="lms__label">Nb tentatives<input type="number" min={1} className="lms__input" value={form.maxAttempts} onChange={(e) => setForm(f => ({ ...f, maxAttempts: e.target.value }))} /></label>
          </div>
          <div className="lms__form-row">
            <label className="lms__label">Classe *
              <select className="lms__select" value={form.classId} onChange={(e) => setForm(f => ({ ...f, classId: e.target.value }))}>
                <option value="">—</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="lms__label">Matière *
              <select className="lms__select" value={form.subjectId} onChange={(e) => setForm(f => ({ ...f, subjectId: e.target.value }))}>
                <option value="">—</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.nameFr}</option>)}
              </select>
            </label>
          </div>
          <label className="lms__label">Année scolaire<input className="lms__input" value={form.academicYear} onChange={(e) => setForm(f => ({ ...f, academicYear: e.target.value }))} /></label>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.showResults} onChange={(e) => setForm(f => ({ ...f, showResults: e.target.checked }))} />
            Afficher le score à l'élève après soumission
          </label>
        </div>
      </OffCanvas>

      {/* Question builder */}
      <OffCanvas open={!!builderQuiz} onClose={() => setBuilderQuiz(null)} title={`Questions — ${builderQuiz?.title ?? ''}`} size="lg">
        <div className="lms__qbuilder">
          {questions.length === 0 && <div className="lms__empty">Aucune question. Ajoutez-en ci-dessous.</div>}
          {questions.map((q, i) => (
            <div key={q.id} className="lms__question-card">
              <div className="lms__question-card-header">
                <strong style={{ fontSize: '0.85rem' }}>Q{i + 1} · {q.type} · {q.points} pt{q.points > 1 ? 's' : ''}</strong>
                <Button size="sm" variant="ghost" onClick={() => delQ.mutate({ qId: q.id })}>Supprimer</Button>
              </div>
              <div style={{ fontSize: '0.9rem' }}>{q.text}</div>
              {q.options?.map((o) => (
                <div key={o.id} style={{ fontSize: '0.82rem', paddingLeft: '0.75rem', color: o.isCorrect ? '#15803d' : '#374151' }}>
                  {o.isCorrect ? '✔' : '○'} {o.text}
                </div>
              ))}
            </div>
          ))}

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
            <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.75rem' }}>Nouvelle question</strong>
            <div className="lms__form" style={{ gap: '0.75rem' }}>
              <label className="lms__label">Question *<textarea className="lms__textarea" rows={2} value={qForm.text} onChange={(e) => setQForm(f => ({ ...f, text: e.target.value }))} /></label>
              <div className="lms__form-row">
                <label className="lms__label">Type
                  <select className="lms__select" value={qForm.type} onChange={(e) => setQForm(f => ({ ...f, type: e.target.value, options: e.target.value === 'TRUE_FALSE' ? [{ text: 'Vrai', isCorrect: false }, { text: 'Faux', isCorrect: false }] : f.options }))}>
                    <option value="MCQ">QCM</option>
                    <option value="TRUE_FALSE">Vrai / Faux</option>
                    <option value="SHORT_ANSWER">Réponse courte</option>
                  </select>
                </label>
                <label className="lms__label">Points<input type="number" min={0.5} step={0.5} className="lms__input" value={qForm.points} onChange={(e) => setQForm(f => ({ ...f, points: Number(e.target.value) }))} /></label>
              </div>
              {!hasShortAnswer && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <strong style={{ fontSize: '0.8rem', color: '#374151' }}>Réponses (cocher la/les correcte(s))</strong>
                  {qForm.options.map((o, i) => (
                    <div key={i} className="lms__option-row">
                      <input type="checkbox" className="lms__correct-check" checked={o.isCorrect} onChange={(e) => setQForm(f => { const opts = [...f.options]; opts[i] = { ...opts[i], isCorrect: e.target.checked }; return { ...f, options: opts }; })} />
                      <input type="text" placeholder={`Option ${i + 1}`} value={o.text} onChange={(e) => setQForm(f => { const opts = [...f.options]; opts[i] = { ...opts[i], text: e.target.value }; return { ...f, options: opts }; })} />
                      {qForm.type === 'MCQ' && qForm.options.length > 2 && (
                        <Button size="sm" variant="ghost" onClick={() => setQForm(f => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}>✕</Button>
                      )}
                    </div>
                  ))}
                  {qForm.type === 'MCQ' && qForm.options.length < 6 && (
                    <Button size="sm" variant="ghost" onClick={() => setQForm(f => ({ ...f, options: [...f.options, { text: '', isCorrect: false }] }))}>+ Option</Button>
                  )}
                </div>
              )}
              <Button onClick={() => addQ.mutate({ text: qForm.text, type: qForm.type, points: qForm.points, options: hasShortAnswer ? undefined : qForm.options })} disabled={addQ.isPending || !qForm.text}>
                {addQ.isPending ? '…' : 'Ajouter la question'}
              </Button>
            </div>
          </div>
        </div>
      </OffCanvas>

      {/* Results panel */}
      <OffCanvas open={!!resultsQuiz} onClose={() => setResultsQuiz(null)} title={`Résultats — ${resultsQuiz?.title ?? ''}`} size="lg">
        {results.length === 0 ? (
          <div className="lms__empty">Aucune tentative encore.</div>
        ) : (
          <table className="lms__sub-table">
            <thead><tr><th>Élève</th><th>Score</th><th>/ Max</th><th>%</th><th>Soumis le</th></tr></thead>
            <tbody>
              {results.map((a) => (
                <tr key={a.id}>
                  <td>{a.student?.user?.name ?? a.student?.admissionNumber}</td>
                  <td style={{ fontWeight: 700 }}>{a.score ?? '—'}</td>
                  <td>{a.maxScore ?? '—'}</td>
                  <td>{a.score != null && a.maxScore ? `${Math.round((a.score / a.maxScore) * 100)}%` : '—'}</td>
                  <td>{fmt(a.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </OffCanvas>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => del.mutate(confirm.id)} loading={del.isPending}
        title="Supprimer le quiz" message={`Supprimer "${confirm?.title}" ?`}
        confirmLabel="Supprimer" variant="danger" />
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LMSPage() {
  const [tab, setTab] = useState('announcements');

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsService.list().then((r) => r.data),
  });

  return (
    <AppShell title="LMS — Espace d'apprentissage">
      <PageHeader title="Espace d'apprentissage" subtitle="Annonces · Cours · Devoirs · Quiz" />

      <div className="lms">
        <div className="lms__tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`lms__tab${tab === t.key ? ' lms__tab--active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'announcements' && <AnnouncementsTab classes={classes} />}
        {tab === 'materials'     && <MaterialsTab classes={classes} subjects={subjects} />}
        {tab === 'assignments'   && <AssignmentsTab classes={classes} subjects={subjects} />}
        {tab === 'quizzes'       && <QuizzesTab classes={classes} subjects={subjects} />}
      </div>
    </AppShell>
  );
}
