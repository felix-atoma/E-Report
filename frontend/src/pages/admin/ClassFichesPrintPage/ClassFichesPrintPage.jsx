import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import Loading from '../../../components/common/Loading/Loading';
import PrintFormatPicker from '../../../components/common/PrintFormatPicker/PrintFormatPicker';
import { classesService } from '../../../services/classesService';
import { gradesService } from '../../../services/gradesService';
import { institutionsService } from '../../../services/institutionsService';
import { FicheSheet } from '../../shared/FicheDeNotesPrintPage/FicheDeNotesPrintPage';
import '../../shared/FicheDeNotesPrintPage/FicheDeNotesPrintPage.css';
import './ClassFichesPrintPage.css';

/**
 * Administration : toutes les fiches de notes d'une classe pour un trimestre, une matière par page, à
 * imprimer ou enregistrer en PDF pour les remettre aux professeurs — nom du professeur, matière,
 * coefficient et liste des élèves. Vierges (à remplir à la main) ou avec les notes déjà saisies,
 * pour tous les professeurs ou un seul.
 */
export default function ClassFichesPrintPage() {
  const { classId } = useParams();
  const [params] = useSearchParams();
  const termNumber = parseInt(params.get('termNumber') ?? '1', 10);
  const termName = `${termNumber === 1 ? '1er' : `${termNumber}e`} Trimestre`;
  const [blank, setBlank] = useState(params.get('blank') !== '0');
  const [teacherId, setTeacherId] = useState('');

  const { data: cls, isLoading } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => classesService.get(classId).then((r) => r.data),
  });
  const { data: institution } = useQuery({
    queryKey: ['institution-me'],
    queryFn: () => institutionsService.me().then((r) => r.data),
    staleTime: 24 * 3600 * 1000,
  });

  const academicYear = params.get('academicYear') || cls?.academicYear || '';
  const subjects = cls?.subjects ?? [];
  const sheets = useQueries({
    queries: subjects.map((cs) => ({
      queryKey: ['fiche-print', classId, cs.subjectId, academicYear, termNumber],
      queryFn: () => gradesService.getForClassSubject(classId, cs.subjectId, academicYear, termNumber).then((r) => r.data),
      enabled: !!academicYear,
    })),
  });

  // Professeurs de la classe (matières sans professeur : « Non attribuée »)
  const teachers = useMemo(() => {
    const map = new Map();
    for (const cs of subjects) if (cs.teacher) map.set(cs.teacher.id, cs.teacher.name);
    return [...map].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [subjects]);

  if (isLoading) return <Loading fullPage label="Chargement des fiches…" />;
  if (!cls) return <div className="fdnp__error">Classe introuvable.</div>;

  const loading = sheets.some((q) => q.isLoading);
  const failed = sheets.filter((q) => q.isError).length;
  const shown = subjects
    .map((cs, i) => ({ cs, data: sheets[i]?.data }))
    .filter(({ cs, data }) => data && (!teacherId || (teacherId === 'none' ? !cs.teacher : cs.teacher?.id === teacherId)));

  function saveAsPdf() {
    const prev = document.title;
    const who = teacherId && teacherId !== 'none' ? `_${teachers.find(([id]) => id === teacherId)?.[1] ?? ''}` : '';
    document.title = `Fiches_${cls.name}_${termName}${who}_${academicYear}${blank ? '_vierges' : ''}`.replace(/\s+/g, '_');
    window.print();
    document.title = prev;
  }

  return (
    <div className="fdnp__page">
      <div className="fdnp__toolbar no-print cfp__toolbar">
        <div className="cfp__title">
          <strong>Fiches de notes — {cls.name}</strong>
          <span>{termName} · {academicYear} · {shown.length} fiche{shown.length > 1 ? 's' : ''}</span>
        </div>

        <div className="cfp__modes" role="group" aria-label="Contenu des fiches">
          <button type="button" className={`cfp__mode${blank ? ' cfp__mode--on' : ''}`} onClick={() => setBlank(true)}>
            Vierges (à remplir)
          </button>
          <button type="button" className={`cfp__mode${!blank ? ' cfp__mode--on' : ''}`} onClick={() => setBlank(false)}>
            Avec les notes saisies
          </button>
        </div>

        <label className="cfp__teacher">
          Professeur
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">Tous les professeurs</option>
            {teachers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            {subjects.some((cs) => !cs.teacher) && <option value="none">Matières sans professeur</option>}
          </select>
        </label>

        <PrintFormatPicker defaultFormat="A4 paysage" />
        <button className="fdnp__btn fdnp__btn--print" onClick={() => window.print()} disabled={loading || !shown.length}>
          🖨 Imprimer
        </button>
        <button className="fdnp__btn fdnp__btn--download" onClick={saveAsPdf} disabled={loading || !shown.length}>
          ⬇ Télécharger PDF
        </button>
        <button className="fdnp__btn fdnp__btn--close" onClick={() => window.close()}>✕ Fermer</button>
        <span className="fdnp__pdf-hint">
          Une matière par page. Pour un PDF : <strong>Enregistrer en PDF</strong> dans la boîte d'impression.
        </span>
      </div>

      {loading && <Loading label="Préparation des fiches…" />}
      {failed > 0 && <div className="fdnp__error no-print">{failed} fiche(s) n'ont pas pu être chargées. Rechargez la page.</div>}
      {!loading && !subjects.length && (
        <div className="fdnp__error">Aucune matière n'est attribuée à cette classe (Classes → Matières).</div>
      )}

      {shown.map(({ cs, data }) => (
        <FicheSheet
          key={cs.subjectId}
          source={data}
          institution={institution}
          className={cls.name}
          termName={termName}
          academicYear={academicYear}
          blank={blank}
        />
      ))}
    </div>
  );
}
