import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Loading from '../../../components/common/Loading/Loading';
import { classesService } from '../../../services/classesService';
import { gradesService } from '../../../services/gradesService';
import './FichesPage.css';

const TERM_VALUES = [1, 2, 3];

function ClassFicheCard({ cls, term, termLabel }) {
  const { t } = useTranslation();

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
            {t('fiches.signed', { count: signedCount, total: fiches.length })}
          </span>
        )}
      </div>

      {!isLoading && fiches.length > 0 && (
        <div className="fp__progress-bar-wrap">
          <div className="fp__progress-track">
            <div
              className={`fp__progress-fill${allSigned ? ' fp__progress-fill--done' : ''}`}
              style={{ width: `${Math.round((signedCount / fiches.length) * 100)}%` }}
            />
          </div>
          <div className="fp__progress-label">
            <span>{t('fiches.signed', { count: signedCount, total: fiches.length })}</span>
            <span>{Math.round((signedCount / fiches.length) * 100)}%</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="fp__row-placeholder">{t('action.loading')}</div>
      ) : fiches.length === 0 ? (
        <div className="fp__row-placeholder">{t('fiches.noSubjects')}</div>
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
                {f.isSigned ? `✅ ${t('grades.signed')}` : t('fiches.enter')}
              </span>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}

export default function FichesPage() {
  const { t } = useTranslation();
  const [term, setTerm] = useState(1);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  if (isLoading) return <AppShell title={t('fiches.title')}><Loading /></AppShell>;

  const termLabel = t(`fees.terms.TRIMESTRE_${term}`);

  return (
    <AppShell title={t('fiches.title')}>
      <PageHeader
        title={t('fiches.title')}
        subtitle={t('fiches.subtitle')}
      />

      <div className="fp__term-bar">
        {TERM_VALUES.map((v) => (
          <button
            key={v}
            className={`fp__term-btn${term === v ? ' fp__term-btn--active' : ''}`}
            onClick={() => setTerm(v)}
          >
            {t(`fees.terms.TRIMESTRE_${v}`)}
          </button>
        ))}
      </div>

      {classes.length === 0 ? (
        <p className="fp__empty-state">{t('myClasses.empty')}</p>
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
