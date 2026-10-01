import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import Button from '../../../components/common/Button/Button';
import Select from '../../../components/common/Select/Select';
import { classesService } from '../../../services/classesService';
import { subjectsService } from '../../../services/subjectsService';
import {
  examPapersService, EXAM_PAPER_KINDS, kindLabel, apiErrorMessage, saveBlobResponse,
} from '../../../services/examPapersService';
import { StatusBadge } from '../ExamPapersPage/ExamPapersPage';
import './ExamPaperEditorPage.css';

// Symboles fréquents dans les sujets (maths, physique, chimie)
const SYMBOLS = ['×', '÷', '±', '≤', '≥', '≠', '≈', '√', 'π', '∞', '∈', '∉', '⊂', '∪', '∩', '→', '⇒', '⇔', '°', 'α', 'β', 'θ', 'Δ', 'Ω', 'λ', 'µ'];

/* Mise en forme dans la zone d'édition : commandes du navigateur (gras, listes, titres…) */
function exec(cmd, value) {
  document.execCommand(cmd, false, value);
}

function Toolbar({ onAction }) {
  const btn = (label, title, fn, cls = '') => (
    <button type="button" className={`epe-tool ${cls}`} title={title}
      onMouseDown={(e) => { e.preventDefault(); fn(); onAction?.(); }}>{label}</button>
  );
  return (
    <div className="epe-toolbar" role="toolbar" aria-label="Mise en forme">
      {btn(<b>G</b>, 'Gras', () => exec('bold'))}
      {btn(<i>I</i>, 'Italique', () => exec('italic'))}
      {btn(<u>S</u>, 'Souligné', () => exec('underline'))}
      {btn(<span>x<sup>2</sup></span>, 'Exposant', () => exec('superscript'))}
      {btn(<span>x<sub>2</sub></span>, 'Indice', () => exec('subscript'))}
      <span className="epe-tool-sep" />
      {btn('Titre', 'Titre d’exercice', () => exec('formatBlock', '<h2>'))}
      {btn('Sous-titre', 'Sous-titre', () => exec('formatBlock', '<h3>'))}
      {btn('¶', 'Paragraphe normal', () => exec('formatBlock', '<p>'))}
      {btn('1.', 'Liste numérotée', () => exec('insertOrderedList'))}
      {btn('•', 'Liste à puces', () => exec('insertUnorderedList'))}
      <span className="epe-tool-sep" />
      {SYMBOLS.map((s) => btn(s, `Insérer ${s}`, () => exec('insertText', s), 'epe-tool--sym'))}
    </div>
  );
}

/** En-tête de l'épreuve, identique au document Word (tableau 2 × 4 à double bordure) */
function PaperHeader({ paper, editable, fields, setField, classes, subjects }) {
  const school = paper.institution?.name ?? '';
  const address = paper.institution?.address ?? '';
  const inp = (key, placeholder, cls = '') => (editable
    ? <input className={`epe-h-input ${cls}`} value={fields[key] ?? ''} placeholder={placeholder} onChange={(e) => setField(key, e.target.value)} />
    : <span>{fields[key] || '—'}</span>);
  const className = classes.find((c) => c.id === fields.classId)?.name ?? paper.className ?? '';
  const subjectName = subjects.find((s) => s.id === fields.subjectId)?.nameFr ?? paper.subjectName ?? '';
  return (
    <table className="epe-header">
      <tbody>
        <tr>
          <td>{school}</td>
          <td>{inp('title', 'Devoir du deuxième trimestre', 'epe-h-input--wide')}</td>
          <td>Année Scolaire : {inp('academicYear', '2024-2025')}</td>
          <td>Classe : {editable
            ? (
              <select className="epe-h-input" value={fields.classId ?? ''} onChange={(e) => setField('classId', e.target.value)}>
                <option value="">{paper.className || '—'}</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : <span>{className || '—'}</span>}
          </td>
        </tr>
        <tr>
          <td>{address}</td>
          <td>Épreuve de {editable
            ? (
              <select className="epe-h-input" value={fields.subjectId ?? ''} onChange={(e) => setField('subjectId', e.target.value)}>
                <option value="">{paper.subjectName || '—'}</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.nameFr}</option>)}
              </select>
            ) : <span>{subjectName || '—'}</span>}
          </td>
          <td>Heures : {inp('duration', '3h', 'epe-h-input--short')}</td>
          <td>Coeff : {inp('coefficient', '3', 'epe-h-input--short')}</td>
        </tr>
      </tbody>
    </table>
  );
}

export default function ExamPaperEditorPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const bodyRef = useRef(null);

  const { data: paper, isLoading, isError, refetch } = useQuery({
    queryKey: ['exam-paper', id],
    queryFn: () => examPapersService.get(id).then((r) => r.data),
  });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => classesService.list().then((r) => r.data) });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => subjectsService.list().then((r) => r.data) });

  const isAuthor = paper && paper.authorId === user?.id;
  const editable = !!(isAuthor && (paper.status === 'DRAFT' || paper.status === 'RETURNED'));

  const [fields, setFields] = useState({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);           // { type: 'ok' | 'error', text }
  const [returnComment, setReturnComment] = useState('');
  const [showReturn, setShowReturn] = useState(false);
  const aiInfo = location.state;                           // résultat de l'import (erreur ou passages à vérifier)

  // Chargement : champs de l'en-tête + corps dans la zone d'édition
  useEffect(() => {
    if (!paper) return;
    setFields({
      kind: paper.kind, title: paper.title ?? '', academicYear: paper.academicYear ?? '',
      duration: paper.duration ?? '', coefficient: paper.coefficient ?? '',
      classId: paper.classId ?? '', subjectId: paper.subjectId ?? '',
    });
    if (bodyRef.current) bodyRef.current.innerHTML = paper.content || '';
    setDirty(false);
  }, [paper]);

  // Quitter la page avec des modifications non enregistrées : avertissement du navigateur
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const setField = (k, v) => { setFields((p) => ({ ...p, [k]: v })); setDirty(true); };

  const save = async () => {
    await examPapersService.update(id, { ...fields, content: bodyRef.current?.innerHTML ?? '' });
    setDirty(false);
  };

  const run = async (key, fn, okText) => {
    setBusy(key);
    setMessage(null);
    try {
      await fn();
      if (okText) setMessage({ type: 'ok', text: okText });
      qc.invalidateQueries({ queryKey: ['exam-papers'] });
      await refetch();
    } catch (err) {
      setMessage({ type: 'error', text: apiErrorMessage(err) });
    } finally {
      setBusy('');
    }
  };

  const download = async () => {
    setBusy('docx');
    try {
      if (editable && dirty) await save();
      const res = await examPapersService.downloadDocx(id);
      saveBlobResponse(res, `epreuve-${(paper.subjectName ?? 'sujet').replace(/\s+/g, '-')}.docx`);
    } catch (err) {
      setMessage({ type: 'error', text: apiErrorMessage(err, 'Le téléchargement a échoué.') });
    } finally {
      setBusy('');
    }
  };

  if (isLoading) return <AppShell title="Épreuve"><div className="epe-empty">Chargement…</div></AppShell>;
  if (isError || !paper) return <AppShell title="Épreuve"><div className="epe-empty">Épreuve introuvable.</div></AppShell>;

  return (
    <AppShell title={paper.title}>
      <div className="epe-page">
        <div className="epe-top">
          <Link to={isAdmin ? '/admin/epreuves' : '/teacher/epreuves'} className="epe-back">← Épreuves</Link>
          <div className="epe-top__title">
            <h1>{paper.title}</h1>
            <StatusBadge status={paper.status} />
          </div>
          <div className="epe-top__meta">
            {editable ? (
              <Select value={fields.kind ?? paper.kind} options={EXAM_PAPER_KINDS} onChange={(e) => setField('kind', e.target.value)} />
            ) : <span>{kindLabel(paper.kind)}</span>}
            <span>👤 {paper.author?.name}</span>
            {paper.reviewedByName && <span>Traité par {paper.reviewedByName}</span>}
          </div>
        </div>

        {/* Messages */}
        {aiInfo?.aiError && editable && (
          <div className="epe-alert epe-alert--warn">⚠️ {aiInfo.aiError} Vous pouvez saisir ou coller le sujet ci-dessous.</div>
        )}
        {aiInfo?.warnings && editable && (
          <div className="epe-alert epe-alert--warn">🔎 À vérifier : {aiInfo.warnings}</div>
        )}
        {!aiInfo?.aiError && aiInfo && editable && (
          <div className="epe-alert epe-alert--info">✨ Sujet transcrit par l’IA. Relisez-le attentivement et corrigez les éventuelles erreurs avant de le soumettre.</div>
        )}
        {paper.status === 'RETURNED' && paper.adminComment && (
          <div className="epe-alert epe-alert--warn">💬 Renvoyée par l’administration : « {paper.adminComment} »</div>
        )}
        {paper.status === 'SUBMITTED' && isAuthor && (
          <div className="epe-alert epe-alert--info">Épreuve soumise à l’administration : elle ne peut plus être modifiée, sauf si elle vous est renvoyée.</div>
        )}
        {message && <div className={`epe-alert epe-alert--${message.type === 'ok' ? 'ok' : 'error'}`}>{message.text}</div>}

        {/* Feuille : en-tête + sujet */}
        <div className="epe-sheet">
          <PaperHeader paper={paper} editable={editable} fields={fields} setField={setField} classes={classes} subjects={subjects} />
          {editable && <Toolbar onAction={() => setDirty(true)} />}
          <div
            ref={bodyRef}
            className={`epe-body${editable ? ' epe-body--editable' : ''}`}
            contentEditable={editable}
            suppressContentEditableWarning
            onInput={() => setDirty(true)}
            data-placeholder={editable ? 'Saisissez ou collez le sujet ici…' : ''}
          />
        </div>

        {/* Fichiers d'origine */}
        {Array.isArray(paper.sourceFiles) && paper.sourceFiles.length > 0 && (
          <div className="epe-sources">
            <strong>Fichiers d’origine :</strong>
            {paper.sourceFiles.map((f, i) => (f.url
              ? <a key={i} href={f.url} target="_blank" rel="noreferrer">📎 {f.name}</a>
              : <span key={i}>📎 {f.name}</span>))}
          </div>
        )}

        {/* Actions */}
        <div className="epe-actions">
          <Button variant="ghost" onClick={download} disabled={!!busy}>{busy === 'docx' ? 'Préparation…' : '⬇️ Télécharger en Word'}</Button>

          {editable && (
            <>
              <Button variant="ghost" onClick={() => run('save', save, 'Modifications enregistrées.')} disabled={!!busy}>
                {busy === 'save' ? 'Enregistrement…' : dirty ? '💾 Enregistrer' : '💾 Enregistré'}
              </Button>
              <Button
                onClick={() => {
                  if (!window.confirm('Soumettre l’épreuve à l’administration ? Vous ne pourrez plus la modifier, sauf si elle vous est renvoyée.')) return;
                  run('submit', async () => { await save(); await examPapersService.submit(id); }, 'Épreuve soumise à l’administration.');
                }}
                disabled={!!busy}
              >
                {busy === 'submit' ? 'Envoi…' : '📤 Soumettre à l’administration'}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (!window.confirm('Supprimer définitivement cette épreuve ?')) return;
                  run('delete', async () => { await examPapersService.delete(id); setDirty(false); navigate(isAdmin ? '/admin/epreuves' : '/teacher/epreuves'); });
                }}
                disabled={!!busy}
              >
                Supprimer
              </Button>
            </>
          )}

          {isAdmin && paper.status === 'SUBMITTED' && (
            <>
              <Button onClick={() => run('printed', () => examPapersService.markPrinted(id), 'Épreuve marquée comme imprimée.')} disabled={!!busy}>
                🖨️ Marquer comme imprimée
              </Button>
              <Button variant="ghost" onClick={() => setShowReturn((v) => !v)} disabled={!!busy}>↩️ Renvoyer au professeur</Button>
            </>
          )}
        </div>

        {showReturn && (
          <div className="epe-return">
            <label htmlFor="return-comment">Ce que le professeur doit corriger</label>
            <textarea id="return-comment" rows={3} value={returnComment} onChange={(e) => setReturnComment(e.target.value)}
              placeholder="ex. Exercice 2 : la question b) est incomplète. Ajouter le barème." />
            <Button
              onClick={() => run('return', async () => {
                await examPapersService.returnToAuthor(id, returnComment);
                setShowReturn(false);
                setReturnComment('');
              }, 'Épreuve renvoyée au professeur.')}
              disabled={!!busy || !returnComment.trim()}
            >
              Renvoyer
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
