import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Loading from '../../../components/common/Loading/Loading';
import { Link } from 'react-router-dom';
import { classesService } from '../../../services/classesService';
import { mockExamsService } from '../../../services/mockExamsService';
import { FichesPanel } from '../ClassDetailPage/ClassDetailPage';
import '../ClassDetailPage/ClassDetailPage.css';
import './AdminFichesPage.css';

/**
 * Fiches de notes de l'établissement (administrateur) : choisir une classe et un trimestre, voir quelles
 * fiches sont signées, les ouvrir et corriger notes ou coefficient — même une fiche déjà signée.
 */
const EXAM_KIND = {
  DEVOIR_SURVEILLE: 'Devoir surveillé', COMPOSITION_MENSUELLE: 'Composition mensuelle', COMPOSITION_ANGLAIS: "Composition d'anglais",
  BLANC: 'Examen blanc', CEPE: 'CEPE blanc', BEPC: 'BEPC blanc', BAC1: 'BAC I blanc', BAC2: 'BAC II blanc',
};

/** DS, compositions mensuelles / d'anglais et examens blancs de la classe : fiches à ouvrir et corriger (notes, coefficients). */
function ClassExams({ classId }) {
  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['mock-exams', 'class', classId],
    queryFn: () => mockExamsService.list({ classId }).then((r) => r.data),
  });
  if (isLoading) return null;
  return (
    <section className="acd__section">
      <h2 className="acd__section-title">Devoirs surveillés, compositions et examens blancs</h2>
      {exams.length === 0 ? <p className="afp-empty">Aucune session pour cette classe.</p> : (
        <div className="afp-exams">
          {exams.map((e) => (
            <div key={e.id} className="afp-exam">
              <div>
                <div className="afp-exam__kind">{EXAM_KIND[e.examType] ?? e.examType}{e.status === 'PUBLISHED' ? ' · publié' : ''}</div>
                <div className="afp-exam__label">{e.label}</div>
              </div>
              <Link to={`/mock-exams/${e.id}/fiche`} className="acd__fiche-btn acd__fiche-btn--open">✏️ Corriger</Link>
            </div>
          ))}
        </div>
      )}
      <p className="afp-hint">Sur chaque matière : « ✏️ Corriger (admin) » pour modifier les notes ou le coefficient, même si la fiche est signée ou la session publiée.</p>
    </section>
  );
}

export default function AdminFichesPage() {
  const { t } = useTranslation();
  const [classId, setClassId] = useState('');
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });
  // Déjà dans l'ordre croissant des niveaux (CI, CP… Terminale), fourni par le serveur
  const sorted = classes;
  const cls = sorted.find((c) => c.id === classId);

  return (
    <AppShell title="Fiches de notes">
      <PageHeader
        title="Fiches de notes — vérifier et corriger"
        subtitle="Choisissez une classe : ouvrez une fiche avec « ✏️ Corriger » pour modifier un coefficient mal mis ou une note, même si la fiche est signée."
      />
      {isLoading ? <Loading /> : (
        <>
          <div className="afp-classes">
            {sorted.map((c) => (
              <button key={c.id} type="button" className={`afp-class${c.id === classId ? ' afp-class--on' : ''}`} onClick={() => setClassId(c.id)}>
                {c.name}
              </button>
            ))}
            {!sorted.length && <p className="afp-empty">Aucune classe.</p>}
          </div>
          {cls ? (
            <section className="acd__section">
              <h2 className="acd__section-title">{cls.name} · {cls.academicYear}</h2>
              <FichesPanel key={cls.id} classId={cls.id} academicYear={cls.academicYear} t={t} />
            </section>
          ) : null}
          {cls ? (
            <ClassExams key={'ex-' + cls.id} classId={cls.id} />
          ) : sorted.length > 0 && <p className="afp-empty">👆 Choisissez une classe.</p>}
        </>
      )}
    </AppShell>
  );
}
