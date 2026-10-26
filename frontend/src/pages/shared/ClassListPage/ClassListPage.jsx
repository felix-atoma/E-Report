import { useContext, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { classesService } from '../../../services/classesService';
import { AuthContext } from '../../../context/AuthContext';
import { useInstitution } from '../../../context/InstitutionContext';
import Loading from '../../../components/common/Loading/Loading';
import './ClassListPage.css';

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '');

/**
 * Liste de classe à imprimer (A4) pour les enseignants : élèves par ordre alphabétique avec matricule,
 * sexe et date de naissance, effectif garçons / filles, et colonnes vides au choix (appel, notes à la main).
 */
export default function ClassListPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { institution } = useInstitution() ?? {};
  const [extra, setExtra] = useState(5);          // colonnes vides
  const [extraTitle, setExtraTitle] = useState('');
  const [downloading, setDownloading] = useState(false);

  const { data: cls, isLoading, isError } = useQuery({
    queryKey: ['class', id],
    queryFn: () => classesService.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const students = useMemo(() => {
    if (!cls) return [];
    const year = cls.academicYear;
    const seen = new Set();
    return (cls.students ?? [])
      .filter((cs) => !cs.academicYear || cs.academicYear === year)
      .map((cs) => cs.student)
      .filter((s) => s && !seen.has(s.id) && seen.add(s.id))
      .map((s) => ({ ...s, name: (s.user?.name ?? s.admissionNumber ?? '').trim() }))
      .sort((a, b) => collator.compare(a.name, b.name));
  }, [cls]);

  if (isLoading) return <div className="clist-loading"><Loading /></div>;
  if (isError || !cls) {
    return <div className="clist-loading"><p>Classe introuvable.</p><button type="button" onClick={() => navigate(-1)}>← Retour</button></div>;
  }

  const boys = students.filter((s) => s.sex === 'M').length;
  const girls = students.filter((s) => s.sex === 'F').length;
  const back = user?.role === 'ADMIN' ? `/admin/classes/${cls.id}` : `/teacher/classes/${cls.id}`;
  const cols = Array.from({ length: extra }, (_, i) => i);

  // PDF préparé par le serveur (même présentation), téléchargé directement — pratique sur téléphone
  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/classes/${cls.id}/list-pdf`, { params: { extra, title: extraTitle || undefined }, responseType: 'blob' });
      const name = /filename="([^"]+)"/.exec(res.headers?.['content-disposition'] ?? '')?.[1] ?? `liste-${cls.name.trim()}.pdf`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      toast.error('Le PDF n'a pas pu être préparé. Réessayez.');
    } finally {
      setDownloading(false);
    }
  };

  const exportCsv = () => {
    const head = ['N°', 'Nom et prénoms', 'Matricule', 'Sexe', 'Date de naissance'];
    const lines = students.map((s, i) => [i + 1, s.name, s.admissionNumber ?? '', s.sex ?? '', fmtDate(s.dateOfBirth)]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `liste-${cls.name.trim()}-${cls.academicYear}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="clist-screen">
      <div className="clist-toolbar no-print">
        <Link to={back} className="clist-toolbar__back">← Retour à la classe</Link>
        <label className="clist-toolbar__field">
          Colonnes vides
          <select value={extra} onChange={(e) => setExtra(Number(e.target.value))}>
            {[0, 3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="clist-toolbar__field">
          Titre des colonnes
          <input value={extraTitle} placeholder="ex. Appel, Interrogations…" onChange={(e) => setExtraTitle(e.target.value)} />
        </label>
        <button type="button" className="clist-toolbar__btn clist-toolbar__btn--ghost" onClick={exportCsv}>⬇️ Excel</button>
        <button type="button" className="clist-toolbar__btn clist-toolbar__btn--ghost" onClick={downloadPdf} disabled={downloading}>{downloading ? 'Préparation…' : '📄 Télécharger en PDF'}</button>
        <button type="button" className="clist-toolbar__btn" onClick={() => window.print()}>🖨️ Imprimer</button>
      </div>

      <div className="clist-page">
        <header className="clist-head">
          {(institution?.logo || institution?.crest) && <img src={institution.logo || institution.crest} alt="" className="clist-head__logo" />}
          <div className="clist-head__text">
            <div className="clist-head__school">{institution?.name ?? ''}</div>
            {institution?.address && <div className="clist-head__line">{institution.address}</div>}
          </div>
        </header>

        <h1 className="clist-title">LISTE DE CLASSE</h1>
        <div className="clist-meta">
          <span><b>Classe :</b> {cls.name.trim()}</span>
          <span><b>Année scolaire :</b> {cls.academicYear}</span>
          <span><b>Titulaire :</b> {cls.teacher?.name ?? '……………………'}</span>
        </div>
        <div className="clist-meta">
          <span><b>Effectif :</b> {students.length}</span>
          <span><b>Garçons :</b> {boys}</span>
          <span><b>Filles :</b> {girls}</span>
        </div>

        <table className="clist-table">
          <thead>
            {extra > 0 && extraTitle && (
              <tr>
                <th colSpan={5} className="clist-th-empty" />
                <th colSpan={extra} className="clist-th-group">{extraTitle}</th>
              </tr>
            )}
            <tr>
              <th className="clist-c-num">N°</th>
              <th className="clist-c-name">Nom et prénoms</th>
              <th>Matricule</th>
              <th className="clist-c-sex">Sexe</th>
              <th>Date de naissance</th>
              {cols.map((i) => <th key={i} className="clist-c-blank" />)}
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id}>
                <td className="clist-c-num">{i + 1}</td>
                <td className="clist-c-name">{s.name}</td>
                <td>{s.admissionNumber ?? ''}</td>
                <td className="clist-c-sex">{s.sex ?? ''}</td>
                <td>{fmtDate(s.dateOfBirth)}</td>
                {cols.map((c) => <td key={c} className="clist-c-blank" />)}
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={5 + extra} className="clist-empty">Aucun élève inscrit dans cette classe pour {cls.academicYear}.</td></tr>
            )}
          </tbody>
        </table>

        <div className="clist-foot">
          <span>Imprimé le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          <span>Signature : ……………………………</span>
        </div>
      </div>
    </div>
  );
}
