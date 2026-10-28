import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Loading from '../../../components/common/Loading/Loading';
import api from '../../../services/api';
import { classesService } from '../../../services/classesService';
import '../AdminFichesPage/AdminFichesPage.css';
import './ParentContactsPage.css';

/** Lit un CSV « ; » ou « , » (Excel en français) : tableau de lignes. */
function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const sep = (lines[0] ?? '').includes(';') ? ';' : ',';
  return lines.map((l) => l.split(sep).map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim()));
}

/**
 * Contacts des parents, classe par classe : nom, téléphone (WhatsApp / SMS) et e-mail. Enregistrer crée
 * ou met à jour le compte parent de chaque élève : bulletins publiés, reçus de paiement et rappels lui
 * sont alors envoyés. Import possible depuis Excel (modèle pré-rempli avec les élèves de la classe).
 */
export default function ParentContactsPage() {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [classId, setClassId] = useState('');
  const [rows, setRows] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: classes = [], isLoading } = useQuery({ queryKey: ['classes'], queryFn: () => classesService.list().then((r) => r.data) });
  const { data, isFetching } = useQuery({
    queryKey: ['parent-contacts', classId],
    queryFn: () => api.get('/students/parent-contacts', { params: { classId } }).then((r) => r.data),
    enabled: !!classId,
  });
  useEffect(() => { if (data) { setRows(data.rows.map((r) => ({ ...r }))); setDirty(false); } }, [data]);

  const setField = (i, k, v) => { setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r))); setDirty(true); };
  const filled = rows.filter((r) => String(r.phone ?? '').replace(/\D/g, '').length >= 8).length;

  const choose = (id) => {
    if (dirty && !window.confirm('Des modifications ne sont pas enregistrées. Changer de classe quand même ?')) return;
    setClassId(id);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = rows.map((r) => ({ studentId: r.studentId, parentName: r.parentName || undefined, phone: r.phone || undefined, email: r.email || undefined }));
      const { data: res } = await api.post('/students/parent-contacts', { rows: payload });
      const parts = [res.created && `${res.created} compte(s) parent créé(s)`, res.updated && `${res.updated} mis à jour`, res.linked && `${res.linked} relié(s) à un parent existant (frère / sœur)`].filter(Boolean);
      toast.success(parts.length ? `${parts.join(', ')}.` : 'Rien à enregistrer.', { duration: 6000 });
      if (res.errors?.length) toast.error(res.errors.slice(0, 3).join(' · '), { duration: 8000 });
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['parent-contacts', classId] });
      qc.invalidateQueries({ queryKey: ['students-status'] });
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "L'enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  };

  // Modèle Excel pré-rempli : Matricule ; Élève ; Nom du parent ; Téléphone ; E-mail
  const downloadTemplate = () => {
    const head = ['Matricule', 'Élève', 'Nom du parent', 'Téléphone (WhatsApp)', 'E-mail'];
    const lines = rows.map((r) => [r.admissionNumber, r.name, r.parentName ?? '', r.phone ?? '', r.email ?? '']
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `contacts-parents-${data?.class?.name ?? 'classe'}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const table = parseCsv(await file.text());
    const byMatricule = new Map(table.slice(1).map((c) => [String(c[0] ?? '').trim().toLowerCase(), c]));
    let matched = 0;
    setRows((rs) => rs.map((r) => {
      const c = byMatricule.get(String(r.admissionNumber).toLowerCase());
      if (!c) return r;
      matched++;
      return { ...r, parentName: c[2] || r.parentName, phone: c[3] || r.phone, email: c[4] || r.email };
    }));
    setDirty(true);
    setTimeout(() => toast(`${matched} élève(s) complété(s) depuis le fichier. Vérifiez puis cliquez sur « Enregistrer ».`, { icon: '📥', duration: 6000 }), 0);
  };

  return (
    <AppShell title="Contacts des parents">
      <PageHeader
        title="Contacts des parents"
        subtitle="Numéro WhatsApp / SMS (et e-mail) du parent de chaque élève : les bulletins publiés, les reçus et les rappels de paiement lui sont envoyés."
      />
      {isLoading ? <Loading /> : (
        <div className="afp-classes">
          {classes.map((c) => (
            <button key={c.id} type="button" className={`afp-class${c.id === classId ? ' afp-class--on' : ''}`} onClick={() => choose(c.id)}>{c.name}</button>
          ))}
        </div>
      )}

      {!classId ? <p className="afp-empty">👆 Choisissez une classe.</p> : isFetching && !rows.length ? <Loading /> : (
        <>
          <div className="pc-bar">
            <span className="pc-count"><b>{filled}</b> / {rows.length} élève(s) avec un numéro</span>
            <button type="button" className="pc-btn pc-btn--ghost" onClick={downloadTemplate}>⬇️ Modèle Excel</button>
            <button type="button" className="pc-btn pc-btn--ghost" onClick={() => fileRef.current?.click()}>📥 Importer le fichier</button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={importFile} />
            <button type="button" className="pc-btn" onClick={save} disabled={saving || !dirty}>{saving ? 'Enregistrement…' : '💾 Enregistrer'}</button>
          </div>
          <div className="pc-table-wrap">
            <table className="pc-table">
              <thead><tr><th>Élève</th><th>Nom du parent</th><th>Téléphone (WhatsApp / SMS)</th><th>E-mail (facultatif)</th><th /></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.studentId}>
                    <td><b>{r.name}</b><div className="pc-sub">{r.admissionNumber}</div></td>
                    <td><input value={r.parentName ?? ''} placeholder="ex. MENSAH Paul" onChange={(e) => setField(i, 'parentName', e.target.value)} /></td>
                    <td><input value={r.phone ?? ''} inputMode="tel" placeholder="ex. 024 123 4567" onChange={(e) => setField(i, 'phone', e.target.value)} /></td>
                    <td><input value={r.email ?? ''} inputMode="email" placeholder="parent@exemple.com" onChange={(e) => setField(i, 'email', e.target.value)} /></td>
                    <td>{r.hasAccount ? <span className="pc-ok" title="Compte parent relié">✓</span> : ''}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="afp-empty">Aucun élève inscrit dans cette classe.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="afp-hint">
            Frères et sœurs : mettez le même numéro, ils seront rattachés au même parent. Le fichier Excel se remplit avec
            les colonnes Matricule ; Élève ; Nom du parent ; Téléphone ; E-mail.
          </p>
        </>
      )}
    </AppShell>
  );
}
