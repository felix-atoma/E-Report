import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mockExamsService } from '../../../services/mockExamsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import './MockExamFichesListPage.css';

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
    <div className="mfl-row">
      <div className="mfl-row__info">
        <div className="mfl-row__title">{exam.label}</div>
        <div className="mfl-row__meta">
          <span>🏫 {exam.class?.name}</span>
          <span>📅 {fmtDate(exam.examDate)}</span>
          <span>✏️ {gradeCount} note{gradeCount !== 1 ? 's' : ''} saisie{gradeCount !== 1 ? 's' : ''}</span>
          <span className={`mfl-status mfl-status--${exam.status === 'PUBLISHED' ? 'pub' : 'draft'}`}>
            {exam.status === 'PUBLISHED' ? 'Publié' : 'Brouillon'}
          </span>
        </div>
      </div>
      <Link to={`/mock-exams/${exam.id}/fiche`} className="mfl-row__btn">
        📋 Saisir les notes
      </Link>
    </div>
  );
}

function TypeSection({ typeCfg, exams }) {
  const typeExams = exams.filter((e) => e.examType === typeCfg.value);
  const [open, setOpen] = useState(true);
  if (typeExams.length === 0) return null;

  return (
    <div className="mfl-section" style={{ '--type-color': typeCfg.color, '--type-bg': typeCfg.bg, '--type-border': typeCfg.border }}>
      <div className="mfl-section__header" onClick={() => setOpen((v) => !v)}>
        <div className="mfl-section__header-left">
          <span className="mfl-section__icon">{typeCfg.icon}</span>
          <div>
            <div className="mfl-section__title">{typeCfg.label}</div>
            <div className="mfl-section__full">{typeCfg.full}</div>
          </div>
          <span className="mfl-section__count">
            {typeExams.length} session{typeExams.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="mfl-section__toggle">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="mfl-section__body">
          {typeExams.map((exam) => <SessionRow key={exam.id} exam={exam} />)}
        </div>
      )}
    </div>
  );
}

function MockExamFichesListPage() {
  const { data: exams = [], isLoading, isError } = useQuery({
    queryKey: ['mock-exams'],
    queryFn: () => mockExamsService.list({}).then((r) => r.data),
  });

  const hasAny = exams.length > 0;

  return (
    <AppShell title="Fiches de notes — Examens blancs">
      <PageHeader
        title="Fiches de notes — Examens blancs"
        subtitle="Saisie des notes par matière et par professeur · CEPE · BEPC · BAC 1 · BAC 2"
      />

      {isLoading && (
        <div className="mfl-empty"><div className="mfl-spinner" /> Chargement...</div>
      )}
      {isError && (
        <div className="mfl-error">Erreur de chargement. Vérifiez votre connexion.</div>
      )}

      {!isLoading && (
        <div className="mfl-levels">
          {EXAM_TYPES.map((typeCfg) => (
            <TypeSection key={typeCfg.value} typeCfg={typeCfg} exams={exams} />
          ))}
          {!hasAny && !isError && (
            <div className="mfl-empty">
              Aucune session d'examen blanc créée.
              <Link to="/teacher/mock-exams" className="mfl-empty__link">
                Créer une session
              </Link>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

export default MockExamFichesListPage;
