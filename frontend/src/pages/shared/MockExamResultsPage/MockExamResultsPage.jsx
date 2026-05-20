import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mockExamsService } from '../../../services/mockExamsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import './MockExamResultsPage.css';

const EXAM_TYPES = [
  { value: 'CEPE',  label: 'CEPE Blanc',         full: 'Certificat d\'Études Primaires Élémentaires', icon: '🎓', color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
  { value: 'BEPC',  label: 'BEPC Blanc',          full: 'Brevet d\'Études du Premier Cycle',           icon: '📘', color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' },
  { value: 'BAC1',  label: 'BAC 1ère Partie Blanc', full: 'Baccalauréat Première Partie',               icon: '📗', color: '#7e22ce', bg: '#fdf4ff', border: '#d8b4fe' },
  { value: 'BAC2',  label: 'BAC 2e Partie Blanc',  full: 'Baccalauréat Deuxième Partie',                icon: '🏆', color: '#c2410c', bg: '#fff7ed', border: '#fdba74' },
  { value: 'BLANC', label: 'Examen Blanc',         full: 'Examen Blanc (toutes classes)',               icon: '📝', color: '#374151', bg: '#f9fafb', border: '#d1d5db' },
];

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SessionRow({ exam }) {
  const gradeCount = exam._count?.grades ?? 0;
  return (
    <div className="mres-row">
      <div className="mres-row__info">
        <div className="mres-row__title">{exam.label}</div>
        <div className="mres-row__meta">
          <span>🏫 {exam.class?.name}</span>
          <span>📅 {fmtDate(exam.examDate)}</span>
          <span>📝 {gradeCount} note{gradeCount !== 1 ? 's' : ''}</span>
          <span className={`mres-status mres-status--${exam.status === 'PUBLISHED' ? 'pub' : 'draft'}`}>
            {exam.status === 'PUBLISHED' ? 'Publié' : 'Brouillon'}
          </span>
        </div>
      </div>
      <div className="mres-row__actions">
        <Link to={`/mock-exams/${exam.id}/fiche`} className="mres-btn mres-btn--fiche">
          📋 Fiches
        </Link>
        <Link to={`/mock-exams/${exam.id}/palmares`} className="mres-btn mres-btn--palmares">
          📊 Palmarès
        </Link>
        <Link to={`/mock-exams/${exam.id}/releve`} className="mres-btn mres-btn--releve">
          📄 Relevés
        </Link>
      </div>
    </div>
  );
}

function TypeSection({ typeCfg, exams }) {
  const typeExams = exams.filter((e) => e.examType === typeCfg.value);
  const [open, setOpen] = useState(true);
  if (typeExams.length === 0) return null;

  const published = typeExams.filter((e) => e.status === 'PUBLISHED').length;

  return (
    <div className="mres-section" style={{ '--type-color': typeCfg.color, '--type-bg': typeCfg.bg, '--type-border': typeCfg.border }}>
      <div className="mres-section__header" onClick={() => setOpen((v) => !v)}>
        <div className="mres-section__header-left">
          <span className="mres-section__icon">{typeCfg.icon}</span>
          <div>
            <div className="mres-section__title">{typeCfg.label}</div>
            <div className="mres-section__full">{typeCfg.full}</div>
          </div>
          <span className="mres-section__count">
            {typeExams.length} session{typeExams.length !== 1 ? 's' : ''}
          </span>
          {published > 0 && (
            <span className="mres-section__pub">{published} publié{published !== 1 ? 's' : ''}</span>
          )}
        </div>
        <span className="mres-section__toggle">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="mres-section__body">
          {typeExams.map((exam) => <SessionRow key={exam.id} exam={exam} />)}
        </div>
      )}
    </div>
  );
}

function MockExamResultsPage() {
  const { data: exams = [], isLoading, isError } = useQuery({
    queryKey: ['mock-exams'],
    queryFn: () => mockExamsService.list({}).then((r) => r.data),
  });

  const hasAny = exams.length > 0;

  return (
    <AppShell title="Résultats des examens blancs">
      <PageHeader
        title="Résultats des examens blancs"
        subtitle="Palmarès et relevés de notes par niveau · CEPE · BEPC · BAC 1 · BAC 2"
      />

      {isLoading && (
        <div className="mres-empty"><div className="mres-spinner" /> Chargement...</div>
      )}
      {isError && (
        <div className="mres-error">Erreur de chargement. Vérifiez votre connexion.</div>
      )}

      {!isLoading && (
        <div className="mres-levels">
          {EXAM_TYPES.map((typeCfg) => (
            <TypeSection key={typeCfg.value} typeCfg={typeCfg} exams={exams} />
          ))}
          {!hasAny && !isError && (
            <div className="mres-empty">
              Aucune session d'examen blanc créée.
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

export default MockExamResultsPage;
