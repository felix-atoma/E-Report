import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import { classesService } from '../../../services/classesService';
import { subjectsService } from '../../../services/subjectsService';
import {
  examPapersService, EXAM_PAPER_KINDS, EXAM_PAPER_STATUS, kindLabel, apiErrorMessage,
} from '../../../services/examPapersService';
import './ExamPapersPage.css';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.docx,application/pdf,image/*';
const MAX_FILES = 10;
const MAX_BYTES = 20 * 1024 * 1024;

function defaultYear() {
  const now = new Date();
  const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;   // année scolaire à partir d'août
  return `${y}-${y + 1}`;
}

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export function StatusBadge({ status }) {
  const s = EXAM_PAPER_STATUS[status] ?? { label: status, color: '#475569', bg: '#f1f5f9' };
  return <span className="ep-badge" style={{ color: s.color, background: s.bg, borderColor: s.color }}>{s.label}</span>;
}

/* ── Formulaire d'import ─────────────────────────────────────────────────── */
function ImportForm({ onClose }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    kind: 'DEVOIR_SURVEILLE', classId: '', subjectId: '', academicYear: defaultYear(),
    title: '', duration: '', coefficient: '',
  });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => classesService.list().then((r) => r.data) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => subjectsService.list().then((r) => r.data) });

  const addFiles = (list) => {
    const next = [...files, ...Array.from(list ?? [])].slice(0, MAX_FILES);
    setFiles(next);
    setError('');
  };
  const totalBytes = files.reduce((s, f) => s + f.size, 0);

  const handleSubmit = async () => {
    if (!files.length) { setError('Ajoutez le sujet : un PDF, des photos des pages ou un fichier Word.'); return; }
    if (totalBytes > MAX_BYTES) { setError('Fichiers trop lourds (20 Mo au total au maximum).'); return; }
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append('files', f));
      const { data } = await examPapersService.create(fd);
      navigate(`/epreuves/${data.paper.id}`, { state: { aiError: data.aiError, warnings: data.warnings } });
    } catch (err) {
      setError(apiErrorMessage(err, "L'import a échoué. Réessayez."));
      setBusy(false);
    }
  };

  return (
    <div className="ep-form">
      <p className="ep-form__intro">
        Importez votre sujet tel quel : l'IA le transcrit en document modifiable avec l'en-tête de
        l'établissement. Vous relisez, corrigez, puis soumettez à l'administration pour l'impression.
      </p>
      {error && <div className="ep-alert ep-alert--error">{error}</div>}

      <Select label="Type d'épreuve" required value={form.kind} options={EXAM_PAPER_KINDS} onChange={(e) => set('kind', e.target.value)} />
      <div className="ep-row">
        <Select
          label="Classe" placeholder="Choisir…" value={form.classId}
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(e) => set('classId', e.target.value)}
        />
        <Select
          label="Matière" placeholder="Choisir…" value={form.subjectId}
          options={subjects.map((s) => ({ value: s.id, label: s.nameFr }))}
          onChange={(e) => set('subjectId', e.target.value)}
        />
      </div>
      <div className="ep-row">
        <Input label="Année scolaire" required value={form.academicYear} onChange={(e) => set('academicYear', e.target.value)} />
        <Input label="Durée" placeholder="ex. 3h" value={form.duration} onChange={(e) => set('duration', e.target.value)} />
        <Input label="Coefficient" placeholder="ex. 3" value={form.coefficient} onChange={(e) => set('coefficient', e.target.value)} />
      </div>
      <Input
        label="Intitulé" placeholder="ex. Devoir du deuxième trimestre" value={form.title}
        hint="Laissés vides, l'intitulé, la durée et le coefficient sont lus sur le sujet par l'IA."
        onChange={(e) => set('title', e.target.value)}
      />

      <label className="ep-drop">
        <input type="file" multiple accept={ACCEPT} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} hidden />
        <span className="ep-drop__icon">📄</span>
        <strong>Choisir le sujet</strong>
        <span>PDF, photos des pages (JPG, PNG) ou Word (.docx) — jusqu'à {MAX_FILES} fichiers, 20 Mo</span>
        <span className="ep-drop__hint">Sur téléphone, vous pouvez prendre les pages en photo. Gardez-les dans l'ordre.</span>
      </label>
      {files.length > 0 && (
        <ol className="ep-files">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <span>{f.name}</span>
              <small>{(f.size / 1024 / 1024).toFixed(1)} Mo</small>
              <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Retirer">✕</button>
            </li>
          ))}
        </ol>
      )}

      <div className="ep-form__actions">
        <Button variant="ghost" onClick={onClose} disabled={busy}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={busy}>
          {busy ? "Transcription par l'IA… (jusqu'à 2 min)" : '✨ Transcrire avec l’IA'}
        </Button>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function ExamPapersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState(isAdmin ? 'SUBMITTED' : '');

  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['exam-papers', filter],
    queryFn: () => examPapersService.list(filter ? { status: filter } : {}).then((r) => r.data),
  });

  const tabs = useMemo(() => (isAdmin
    ? [['SUBMITTED', 'À imprimer'], ['PRINTED', 'Imprimées'], ['RETURNED', 'Renvoyées'], ['', 'Toutes']]
    : [['', 'Toutes'], ['DRAFT', 'Brouillons'], ['RETURNED', 'À corriger'], ['SUBMITTED', 'Soumises'], ['PRINTED', 'Imprimées']]), [isAdmin]);

  return (
    <AppShell title="Épreuves">
      <PageHeader
        title={isAdmin ? 'Épreuves à imprimer' : 'Mes épreuves'}
        subtitle={isAdmin
          ? 'Sujets soumis par les professeurs : relisez, téléchargez en Word, imprimez ou renvoyez pour correction.'
          : 'Importez un sujet (PDF, photo, Word) : l’IA le transforme en document Word à l’en-tête de l’école, que vous corrigez puis soumettez.'}
        actions={<Button onClick={() => setCreating(true)}>＋ Nouvelle épreuve</Button>}
      />

      <div className="ep-tabs">
        {tabs.map(([value, label]) => (
          <button key={label} type="button" className={`ep-tab${filter === value ? ' ep-tab--on' : ''}`} onClick={() => setFilter(value)}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="ep-empty">Chargement…</div>
      ) : papers.length === 0 ? (
        <div className="ep-empty">{isAdmin ? 'Aucune épreuve dans cette catégorie.' : 'Aucune épreuve. Cliquez sur « Nouvelle épreuve » pour importer un sujet.'}</div>
      ) : (
        <div className="ep-list">
          {papers.map((p) => (
            <Link key={p.id} to={`/epreuves/${p.id}`} className="ep-card">
              <div className="ep-card__main">
                <div className="ep-card__title">{p.title}</div>
                <div className="ep-card__meta">
                  <span>{kindLabel(p.kind)}</span>
                  {p.subjectName && <span>📘 {p.subjectName}</span>}
                  {p.className && <span>🏫 {p.className}</span>}
                  {isAdmin && <span>👤 {p.author?.name}</span>}
                  <span>📅 {fmtDate(p.submittedAt ?? p.updatedAt)}</span>
                </div>
                {p.status === 'RETURNED' && p.adminComment && <div className="ep-card__comment">💬 {p.adminComment}</div>}
              </div>
              <StatusBadge status={p.status} />
            </Link>
          ))}
        </div>
      )}

      <OffCanvas open={creating} onClose={() => setCreating(false)} title="Nouvelle épreuve" size="md">
        {creating && <ImportForm onClose={() => setCreating(false)} />}
      </OffCanvas>
    </AppShell>
  );
}
