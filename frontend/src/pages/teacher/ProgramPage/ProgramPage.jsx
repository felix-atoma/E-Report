import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { classesService } from '../../../services/classesService';
import { programsService } from '../../../services/programsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Button from '../../../components/common/Button/Button';
import Loading from '../../../components/common/Loading/Loading';
import './ProgramPage.css';

function makeChapter(order) {
  return { _key: Date.now() + order, order, title: '', plan: '', objectives: '', duration: '', isCompleted: false };
}

function ProgramPage() {
  const { classId, subjectId } = useParams();
  const qc = useQueryClient();

  const { data: cls, isLoading: loadingClass } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => classesService.get(classId).then((r) => r.data),
    enabled: !!classId,
  });

  const academicYear = cls?.academicYear ?? '';
  const subjectInfo = cls?.subjects?.find(
    (cs) => (cs.subject?.id ?? cs.subjectId) === subjectId
  )?.subject;

  const { data: program, isLoading: loadingProgram } = useQuery({
    queryKey: ['program', classId, subjectId, academicYear],
    queryFn: () => programsService.get(classId, subjectId, academicYear).then((r) => r.data),
    enabled: !!academicYear,
  });

  const [description, setDescription] = useState('');
  const [chapters, setChapters] = useState([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!program) return;
    setDescription(program.description ?? '');
    setChapters(
      (program.chapters ?? []).map((ch) => ({ ...ch, _key: ch.id }))
    );
    setDirty(false);
  }, [program]);

  const saveMutation = useMutation({
    mutationFn: () =>
      programsService.upsert(classId, subjectId, {
        academicYear,
        description: description || undefined,
        chapters: chapters.map((ch, i) => ({
          order:       i + 1,
          title:       ch.title,
          plan:        ch.plan || undefined,
          objectives:  ch.objectives || undefined,
          duration:    ch.duration || undefined,
          isCompleted: ch.isCompleted,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['program', classId, subjectId, academicYear] });
      toast.success('Programme enregistré');
      setDirty(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur de sauvegarde'),
  });

  function markDirty() { setDirty(true); }

  function addChapter() {
    setChapters((prev) => [...prev, makeChapter(prev.length + 1)]);
    markDirty();
  }

  function removeChapter(key) {
    setChapters((prev) => prev.filter((c) => c._key !== key));
    markDirty();
  }

  function updateChapter(key, field, value) {
    setChapters((prev) => prev.map((c) => c._key === key ? { ...c, [field]: value } : c));
    markDirty();
  }

  if (loadingClass || loadingProgram) {
    return <AppShell title="Programme"><Loading /></AppShell>;
  }

  const completedCount = chapters.filter((c) => c.isCompleted).length;

  return (
    <AppShell title="Programme">
      <PageHeader
        title={`Programme — ${subjectInfo?.nameFr ?? '…'}`}
        subtitle={`${cls?.name ?? ''} — ${academicYear}`}
        actions={
          <Link to={`/teacher/classes/${classId}`} className="program-page__back">
            ← Retour à la classe
          </Link>
        }
      />

      {/* Stats */}
      {chapters.length > 0 && (
        <div className="program-page__stats">
          <span><strong>{chapters.length}</strong> chapitre{chapters.length !== 1 ? 's' : ''}</span>
          <span><strong>{completedCount}</strong> complété{completedCount !== 1 ? 's' : ''}</span>
          <span>
            <strong>
              {chapters.length > 0 ? Math.round((completedCount / chapters.length) * 100) : 0}%
            </strong> du programme couvert
          </span>
        </div>
      )}

      {/* Program description */}
      <div className="program-page__description-wrap">
        <div className="program-page__description-label">Description générale du programme</div>
        <textarea
          className="program-page__description-input"
          rows={2}
          value={description}
          placeholder="Objectifs généraux, orientations pédagogiques…"
          onChange={(e) => { setDescription(e.target.value); markDirty(); }}
        />
      </div>

      {/* Chapters */}
      <div className="program-page__chapters">
        {chapters.map((ch, idx) => (
          <ChapterCard
            key={ch._key}
            chapter={ch}
            index={idx}
            onChange={(field, val) => updateChapter(ch._key, field, val)}
            onRemove={() => removeChapter(ch._key)}
          />
        ))}
      </div>

      <button className="program-page__add-btn" onClick={addChapter}>
        + Ajouter un chapitre
      </button>

      <div className="program-page__footer">
        <Button
          variant="ghost"
          onClick={() => {
            if (program) {
              setDescription(program.description ?? '');
              setChapters((program.chapters ?? []).map((ch) => ({ ...ch, _key: ch.id })));
              setDirty(false);
            }
          }}
          disabled={!dirty || saveMutation.isPending}
        >
          Annuler
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !dirty}
        >
          {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer le programme'}
        </Button>
      </div>
    </AppShell>
  );
}

function ChapterCard({ chapter, index, onChange, onRemove }) {
  const [open, setOpen] = useState(true);

  return (
    <div className={`program-page__chapter${chapter.isCompleted ? ' program-page__chapter--done' : ''}`}>
      <div className="program-page__chapter-header" onClick={() => setOpen((o) => !o)}>
        <span className="program-page__chapter-num">{index + 1}</span>
        <input
          className="program-page__chapter-title-input"
          value={chapter.title}
          placeholder={`Titre du chapitre ${index + 1}…`}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onChange('title', e.target.value)}
        />
        <button
          className={`program-page__chapter-done-btn${chapter.isCompleted ? ' program-page__chapter-done-btn--active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onChange('isCompleted', !chapter.isCompleted); }}
        >
          {chapter.isCompleted ? '✓ Complété' : 'Marquer complété'}
        </button>
        <button className="program-page__chapter-remove" onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Supprimer">
          ✕
        </button>
      </div>

      {open && (
        <div className="program-page__chapter-body">
          <div>
            <div className="program-page__field-label">
              Plan du chapitre
              <span className="program-page__field-hint"> — contenu, progression des séances</span>
            </div>
            <textarea
              className="program-page__textarea"
              rows={4}
              value={chapter.plan}
              placeholder="Ex: Séance 1 — Introduction…&#10;Séance 2 — Exercices d'application…"
              onChange={(e) => onChange('plan', e.target.value)}
            />
          </div>
          <div>
            <div className="program-page__field-label">
              Objectifs pédagogiques
              <span className="program-page__field-hint"> — ce que l'élève doit savoir/savoir-faire</span>
            </div>
            <textarea
              className="program-page__textarea"
              rows={4}
              value={chapter.objectives}
              placeholder="À la fin de ce chapitre, l'élève sera capable de…"
              onChange={(e) => onChange('objectives', e.target.value)}
            />
          </div>
          <div>
            <div className="program-page__field-label">Durée estimée</div>
            <input
              className="program-page__duration-input"
              value={chapter.duration}
              placeholder="ex: 3 semaines"
              onChange={(e) => onChange('duration', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgramPage;
