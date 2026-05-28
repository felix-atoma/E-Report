import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import { studentsService } from '../../../services/studentsService';
import { usersService } from '../../../services/usersService';
import { classesService } from '../../../services/classesService';
import './AdminImportPage.css';

// ── Minimal CSV parser — handles commas inside quotes ─────────────────────────
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    });
}

function toStudentRow(raw) {
  return {
    name:            raw.nom           || raw.name            || '',
    dateOfBirth:     raw.date_naissance || raw.date_of_birth   || raw.dob || '',
    sex:             (raw.sexe || raw.sex || '').toUpperCase() || undefined,
    admissionNumber: raw.numero_admission || raw.admission_number || undefined,
    email:           raw.email           || undefined,
    className:       raw.classe          || raw.class_name     || raw.class || undefined,
  };
}

function toTeacherRow(raw) {
  return {
    name:  raw.nom  || raw.name  || '',
    email: raw.email || '',
    phone: raw.telephone || raw.phone || undefined,
  };
}

// ── File drop zone ────────────────────────────────────────────────────────────
function DropZone({ onFile }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={`imp-drop${dragging ? ' imp-drop--active' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      onClick={() => inputRef.current?.click()}
    >
      <div className="imp-drop__icon">📂</div>
      <div className="imp-drop__text">Glisser un fichier CSV ici ou cliquer pour choisir</div>
      <input ref={inputRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </div>
  );
}

// ── Import result display ─────────────────────────────────────────────────────
function ImportResult({ result }) {
  if (!result) return null;
  const failures = result.results?.filter((r) => !r.success) ?? [];
  return (
    <div className="imp-result">
      <div className="imp-result__summary">
        <span className="imp-result__ok">✅ {result.created} créé{result.created !== 1 ? 's' : ''}</span>
        {result.failed > 0 && (
          <span className="imp-result__err">⚠️ {result.failed} échec{result.failed !== 1 ? 's' : ''}</span>
        )}
      </div>
      {failures.map((r, i) => (
        <div key={i} className="imp-result__row imp-result__row--fail">
          <strong>{r.name}</strong> — {r.error}
        </div>
      ))}
      {result.created > 0 && failures.length === 0 && (
        <div className="imp-result__row imp-result__row--ok">
          Importation terminée sans erreur.
        </div>
      )}
    </div>
  );
}

// ── Student import ────────────────────────────────────────────────────────────
function StudentImport() {
  const [rows, setRows]     = useState(null);
  const [result, setResult] = useState(null);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-list'],
    queryFn: () => classesService.list().then((r) => r.data),
  });
  const classNames = classes.map((c) => c.name).sort();

  const { mutate, isPending } = useMutation({
    mutationFn: () => studentsService.bulkImport(rows).then((r) => r.data),
    onSuccess: (data) => { setResult(data); setRows(null); },
    onError: (e) => setResult({ created: 0, failed: rows?.length ?? 0,
      results: [{ success: false, name: '—', error: e.response?.data?.message ?? e.message }] }),
  });

  const handleFile = (file) => {
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result).map(toStudentRow)
        .filter((r) => r.name && r.dateOfBirth);
      setRows(parsed.length ? parsed : null);
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="imp-section">
      <div className="imp-section__head">
        <div className="imp-section__icon">🎓</div>
        <div>
          <div className="imp-section__title">Importer des élèves</div>
          <div className="imp-section__sub">
            Colonnes CSV : <code>nom, date_naissance (AAAA-MM-JJ), sexe (M/F), classe, numero_admission, email</code>
          </div>
        </div>
      </div>

      <div className="imp-template">
        <strong>Exemple :</strong>
        <pre>{`nom,date_naissance,sexe,classe,numero_admission,email
Kofi Mensah,2010-05-15,M,6ème A,,
Ama Dzo,2011-03-22,F,5ème B,,ama@example.tg`}</pre>
        {classNames.length > 0 && (
          <div className="imp-classes-hint">
            <strong>Classes disponibles :</strong>{' '}
            {classNames.slice(0, 12).join(', ')}{classNames.length > 12 ? ` … (+${classNames.length - 12})` : ''}
          </div>
        )}
      </div>

      <div className="imp-rules">
        <div className="imp-rule">
          <span className="imp-rule__icon">🔢</span>
          <span>Si <strong>numero_admission</strong> est vide, le système en génère un automatiquement.</span>
        </div>
        <div className="imp-rule">
          <span className="imp-rule__icon">🏫</span>
          <span>Le nom de la <strong>classe</strong> doit correspondre exactement à une classe existante (casse non sensible).</span>
        </div>
      </div>

      <DropZone onFile={handleFile} />

      {rows && (
        <>
          <div className="imp-preview">
            <div className="imp-preview__title">{rows.length} ligne{rows.length !== 1 ? 's' : ''} prête{rows.length !== 1 ? 's' : ''}</div>
            <table className="imp-table">
              <thead>
                <tr><th>Nom</th><th>Date naiss.</th><th>Sexe</th><th>Classe</th><th>N° Adm.</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 12).map((r, i) => (
                  <tr key={i} className={!r.dateOfBirth ? 'imp-table__row--warn' : ''}>
                    <td className="imp-td--name">{r.name}</td>
                    <td>{r.dateOfBirth || <span className="imp-warn">manquant !</span>}</td>
                    <td>{r.sex || '—'}</td>
                    <td>
                      {r.className
                        ? classNames.map(c => c.toLowerCase()).includes(r.className.toLowerCase())
                          ? <span className="imp-ok">{r.className}</span>
                          : <span className="imp-warn">{r.className} ⚠️</span>
                        : <span className="imp-muted">—</span>}
                    </td>
                    <td>{r.admissionNumber || <span className="imp-muted">auto</span>}</td>
                  </tr>
                ))}
                {rows.length > 12 && (
                  <tr><td colSpan={5} className="imp-more">… et {rows.length - 12} autres</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <button className="imp-btn" onClick={() => mutate()} disabled={isPending}>
            {isPending ? 'Importation…' : `Importer ${rows.length} élève${rows.length !== 1 ? 's' : ''}`}
          </button>
        </>
      )}

      <ImportResult result={result} />
    </div>
  );
}

// ── Teacher import ────────────────────────────────────────────────────────────
function TeacherImport() {
  const [rows, setRows]     = useState(null);
  const [result, setResult] = useState(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => usersService.bulkImportTeachers(rows).then((r) => r.data),
    onSuccess: (data) => { setResult(data); setRows(null); },
    onError: (e) => setResult({ created: 0, failed: rows?.length ?? 0,
      results: [{ success: false, name: '—', error: e.response?.data?.message ?? e.message }] }),
  });

  const handleFile = (file) => {
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result).map(toTeacherRow)
        .filter((r) => r.name && r.email);
      setRows(parsed.length ? parsed : null);
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="imp-section">
      <div className="imp-section__head">
        <div className="imp-section__icon">👨‍🏫</div>
        <div>
          <div className="imp-section__title">Importer des professeurs</div>
          <div className="imp-section__sub">
            Colonnes CSV : <code>nom, email, telephone</code>
          </div>
        </div>
      </div>

      <div className="imp-template">
        <strong>Exemple :</strong>
        <pre>{`nom,email,telephone
Jean Dupont,jean@ecole.tg,+228 90 00 00 01
Marie Martin,marie@ecole.tg,`}</pre>
      </div>

      <div className="imp-rules">
        <div className="imp-rule">
          <span className="imp-rule__icon">🔑</span>
          <span>Un mot de passe temporaire est généré automatiquement. Le professeur devra le changer à la première connexion.</span>
        </div>
        <div className="imp-rule">
          <span className="imp-rule__icon">📧</span>
          <span>L'<strong>email</strong> doit être unique. Les doublons sont signalés comme erreurs.</span>
        </div>
      </div>

      <DropZone onFile={handleFile} />

      {rows && (
        <>
          <div className="imp-preview">
            <div className="imp-preview__title">{rows.length} ligne{rows.length !== 1 ? 's' : ''} prête{rows.length !== 1 ? 's' : ''}</div>
            <table className="imp-table">
              <thead>
                <tr><th>Nom</th><th>Email</th><th>Téléphone</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 12).map((r, i) => (
                  <tr key={i} className={!r.email ? 'imp-table__row--warn' : ''}>
                    <td className="imp-td--name">{r.name}</td>
                    <td>{r.email || <span className="imp-warn">manquant !</span>}</td>
                    <td>{r.phone || <span className="imp-muted">—</span>}</td>
                  </tr>
                ))}
                {rows.length > 12 && (
                  <tr><td colSpan={3} className="imp-more">… et {rows.length - 12} autres</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <button className="imp-btn imp-btn--teacher" onClick={() => mutate()} disabled={isPending}>
            {isPending ? 'Importation…' : `Importer ${rows.length} professeur${rows.length !== 1 ? 's' : ''}`}
          </button>
        </>
      )}

      <ImportResult result={result} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminImportPage() {
  return (
    <AppShell title="Importation en masse">
      <PageHeader
        title="Importation en masse"
        subtitle="Ajoutez plusieurs élèves ou professeurs à la fois depuis un fichier CSV"
      />
      <div className="imp-page">
        <StudentImport />
        <TeacherImport />
      </div>
    </AppShell>
  );
}
