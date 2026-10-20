import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Loading from '../../../components/common/Loading/Loading';
import { classesService } from '../../../services/classesService';
import { FichesPanel } from '../ClassDetailPage/ClassDetailPage';
import '../ClassDetailPage/ClassDetailPage.css';
import './AdminFichesPage.css';

/**
 * Fiches de notes de l'établissement (administrateur) : choisir une classe et un trimestre, voir quelles
 * fiches sont signées, les ouvrir et corriger notes ou coefficient — même une fiche déjà signée.
 */
export default function AdminFichesPage() {
  const { t } = useTranslation();
  const [classId, setClassId] = useState('');
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });
  const sorted = [...classes].sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));
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
          ) : sorted.length > 0 && <p className="afp-empty">👆 Choisissez une classe.</p>}
        </>
      )}
    </AppShell>
  );
}
