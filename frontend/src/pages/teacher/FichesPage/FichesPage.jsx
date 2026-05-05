import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Loading from '../../../components/common/Loading/Loading';
import { classesService } from '../../../services/classesService';
import { gradesService } from '../../../services/gradesService';
import './FichesPage.css';

const TERMS = [
  { value: 1, label: '1er Trimestre' },
  { value: 2, label: '2ème Trimestre' },
  { value: 3, label: '3ème Trimestre' },
];

function ClassFicheCard({ cls, term, termLabel }) {
  const { data: fiches = [], isLoading } = useQuery({
    queryKey: ['fiches', cls.id, cls.academicYear, term],
    queryFn: () => gradesService.listFiches(cls.id, cls.academicYear, term).then((r) => r.data),
    enabled: !!cls.id && !!cls.academicYear,
  });

  const signedCount = fiches.filter((f) => f.isSigned).length;
  const allSigned = fiches.length > 0 && signedCount === fiches.length;

  return (
    <div className="fp__card">
      <div className="fp__card-header">
        <div>
          <div className="fp__class-name">{cls.name}</div>
          <div className="fp__class-meta">{cls.academicYear}</div>
        </div>
        {!isLoading && fiches.length > 0 && (
          <span className={`fp__progress${allSigned ? ' fp__progress--done' : ''}`}>
            {signedCount}/{fiches.length} signées
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="fp__row-placeholder">Chargement…</div>
      ) : fiches.length === 0 ? (
        <div className="fp__row-placeholder">Aucune matière assignée</div>
      ) : (
        fiches.map((f) => (
          <Link
            key={f.subjectId}
            to={`/teacher/classes/${cls.id}/grades/${f.subjectId}?academicYear=${encodeURIComponent(cls.academicYear)}&termNumber=${term}&termName=${encodeURIComponent(termLabel)}`}
            className={`fp__subject-row${f.isSigned ? ' fp__subject-row--signed' : ''}`}
          >
            <div className="fp__subject-info">
              <span className="fp__subject-name">{f.subject.nameFr}</span>
              {f.subject.code && <span className="fp__subject-code">{f.subject.code}</span>}
            </div>
            <div className="fp__subject-right">
              {f.signedAt && (
                <span className="fp__signed-date">
                  {new Date(f.signedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </span>
              )}
              <span className={`fp__badge${f.isSigned ? ' fp__badge--signed' : ' fp__badge--pending'}`}>
                {f.isSigned ? '✅ Signée' : 'Saisir →'}
              </span>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}

export default function FichesPage() {
  const [term, setTerm] = useState(1);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  if (isLoading) return <AppShell title="Fiches de notes"><Loading /></AppShell>;

  const termLabel = TERMS.find((t) => t.value === term).label;

  return (
    <AppShell title="Fiches de notes">
      <PageHeader
        title="Fiches de notes"
        subtitle="Saisissez les notes par matière et par classe. Cliquez sur une matière pour commencer la saisie."
      />

      <div className="fp__term-bar">
        {TERMS.map((t) => (
          <button
            key={t.value}
            className={`fp__term-btn${term === t.value ? ' fp__term-btn--active' : ''}`}
            onClick={() => setTerm(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {classes.length === 0 ? (
        <p className="fp__empty-state">Aucune classe ne vous est assignée.</p>
      ) : (
        <div className="fp__grid">
          {classes.map((cls) => (
            <ClassFicheCard key={cls.id} cls={cls} term={term} termLabel={termLabel} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
