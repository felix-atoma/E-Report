import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesService } from '../../../services/classesService';
import { timetablesService } from '../../../services/timetablesService';
import { gradesService } from '../../../services/gradesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import Avatar from '../../../components/common/Avatar/Avatar';
import Badge from '../../../components/common/Badge/Badge';
import Loading from '../../../components/common/Loading/Loading';
import './ClassDetailPage.css';

const SEX_LABEL   = { M: 'Garçon', F: 'Fille' };
const SEX_VARIANT = { M: 'info',   F: 'danger' };

const TERM_OPTIONS = [
  { value: 1, label: '1er Trimestre' },
  { value: 2, label: '2ème Trimestre' },
  { value: 3, label: '3ème Trimestre' },
];

const DAYS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
const DAY_LABELS = { LUNDI: 'Lundi', MARDI: 'Mardi', MERCREDI: 'Mercredi', JEUDI: 'Jeudi', VENDREDI: 'Vendredi', SAMEDI: 'Samedi' };

const DEFAULT_SLOT = { subjectId: '', teacherId: '', dayOfWeek: 'LUNDI', startTime: '08:00', endTime: '09:00', room: '' };

function TimetableGrid({ slots }) {
  if (!slots.length) return <p className="acd__empty" style={{ padding: '1.5rem 0' }}>Aucun créneau défini.</p>;

  const byDay = {};
  DAYS.forEach((d) => { byDay[d] = []; });
  slots.forEach((s) => { if (byDay[s.dayOfWeek]) byDay[s.dayOfWeek].push(s); });
  DAYS.forEach((d) => byDay[d].sort((a, b) => a.startTime.localeCompare(b.startTime)));

  const activeDays = DAYS.filter((d) => byDay[d].length > 0);

  return (
    <div className="acd__tt-grid">
      {activeDays.map((day) => (
        <div key={day} className="acd__tt-day">
          <div className="acd__tt-day-header">{DAY_LABELS[day]}</div>
          {byDay[day].map((slot) => (
            <div key={slot.id} className="acd__tt-slot">
              <div className="acd__tt-time">{slot.startTime} – {slot.endTime}</div>
              <div className="acd__tt-subject">{slot.subject?.nameFr ?? '—'}</div>
              {slot.teacher && <div className="acd__tt-teacher">{slot.teacher.name}</div>}
              {slot.room && <div className="acd__tt-room">🏫 {slot.room}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SlotRow({ slot, index, subjects, teachers, onChange, onRemove }) {
  const set = (field) => (e) => onChange(index, { ...slot, [field]: e.target.value });
  return (
    <div className="acd__tt-row">
      <select className="acd__tt-input" value={slot.dayOfWeek} onChange={set('dayOfWeek')}>
        {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
      </select>
      <input className="acd__tt-input" type="time" value={slot.startTime} onChange={set('startTime')} />
      <input className="acd__tt-input" type="time" value={slot.endTime} onChange={set('endTime')} />
      <select className="acd__tt-input acd__tt-input--wide" value={slot.subjectId} onChange={set('subjectId')}>
        <option value="">— Matière —</option>
        {subjects.map((s) => <option key={s.subject?.id ?? s.id} value={s.subject?.id ?? s.id}>{s.subject?.nameFr ?? s.nameFr}</option>)}
      </select>
      <select className="acd__tt-input acd__tt-input--wide" value={slot.teacherId} onChange={set('teacherId')}>
        <option value="">— Enseignant —</option>
        {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <input className="acd__tt-input" placeholder="Salle" value={slot.room} onChange={set('room')} />
      <button type="button" className="acd__tt-remove" onClick={() => onRemove(index)} title="Supprimer">✕</button>
    </div>
  );
}

function TimetableEditor({ cls, academicYear, slots, onSaved }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState(
    slots.length > 0
      ? slots.map((s) => ({ subjectId: s.subjectId ?? s.subject?.id, teacherId: s.teacherId ?? s.teacher?.id ?? '', dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, room: s.room ?? '' }))
      : []
  );
  const [error, setError] = useState('');

  const subjects = cls.subjects ?? [];
  const teachers = [...new Map(
    subjects.filter((s) => s.teacher).map((s) => [s.teacher.id, s.teacher])
  ).values()];

  const mutation = useMutation({
    mutationFn: () => timetablesService.save(cls.id, { academicYear, slots: rows.filter((r) => r.subjectId) }),
    onSuccess: () => {
      qc.invalidateQueries(['timetable', cls.id]);
      onSaved();
    },
    onError: (err) => setError(err.response?.data?.message ?? 'Erreur lors de la sauvegarde.'),
  });

  const handleChange = (idx, updated) => setRows((r) => r.map((s, i) => i === idx ? updated : s));
  const handleRemove = (idx) => setRows((r) => r.filter((_, i) => i !== idx));
  const handleAdd = () => setRows((r) => [...r, { ...DEFAULT_SLOT }]);

  return (
    <div className="acd__tt-editor">
      <div className="acd__tt-header-row">
        <span className="acd__tt-col-label">Jour</span>
        <span className="acd__tt-col-label">Début</span>
        <span className="acd__tt-col-label">Fin</span>
        <span className="acd__tt-col-label acd__tt-col-label--wide">Matière</span>
        <span className="acd__tt-col-label acd__tt-col-label--wide">Enseignant</span>
        <span className="acd__tt-col-label">Salle</span>
        <span />
      </div>
      {rows.map((row, i) => (
        <SlotRow
          key={i}
          index={i}
          slot={row}
          subjects={subjects}
          teachers={teachers}
          onChange={handleChange}
          onRemove={handleRemove}
        />
      ))}
      <div className="acd__tt-actions">
        <button type="button" className="acd__tt-add-btn" onClick={handleAdd}>+ Ajouter un créneau</button>
      </div>
      {error && <p className="acd__tt-error">{error}</p>}
      <div className="acd__tt-save-row">
        <button type="button" className="acd__tt-save-btn" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? 'Sauvegarde…' : '💾 Enregistrer l\'emploi du temps'}
        </button>
        <button type="button" className="acd__tt-cancel-btn" onClick={onSaved}>Annuler</button>
      </div>
    </div>
  );
}

function FichesPanel({ classId, academicYear }) {
  const qc = useQueryClient();
  const [term, setTerm] = useState(1);
  const [verifyingAll, setVerifyingAll] = useState(false);

  const { data: fiches = [], isLoading } = useQuery({
    queryKey: ['admin-fiches', classId, academicYear, term],
    queryFn: () => gradesService.listFiches(classId, academicYear, term).then((r) => r.data),
    enabled: !!classId && !!academicYear,
  });

  const verifyMutation = useMutation({
    mutationFn: ({ subjectId }) => gradesService.signFiche(classId, subjectId, academicYear, term, undefined),
    onSuccess: () => qc.invalidateQueries(['admin-fiches', classId, academicYear, term]),
  });

  const unverifyMutation = useMutation({
    mutationFn: ({ subjectId }) => gradesService.unsignFiche(classId, subjectId, academicYear, term),
    onSuccess: () => qc.invalidateQueries(['admin-fiches', classId, academicYear, term]),
  });

  const verifyAll = async () => {
    const unsigned = fiches.filter((f) => !f.isSigned);
    if (!unsigned.length) return;
    setVerifyingAll(true);
    for (const f of unsigned) {
      await gradesService.signFiche(classId, f.subjectId, academicYear, term, undefined).catch(() => {});
    }
    qc.invalidateQueries(['admin-fiches', classId, academicYear, term]);
    setVerifyingAll(false);
  };

  const signedCount = fiches.filter((f) => f.isSigned).length;
  const allSigned = fiches.length > 0 && signedCount === fiches.length;

  return (
    <div>
      <div className="acd__fiche-bar">
        <div className="acd__term-tabs">
          {TERM_OPTIONS.map((t) => (
            <button
              key={t.value}
              className={`acd__term-btn${term === t.value ? ' acd__term-btn--active' : ''}`}
              onClick={() => setTerm(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="acd__fiche-bar-right">
          <span className={`acd__fiche-summary${allSigned ? ' acd__fiche-summary--done' : ''}`}>
            {fiches.length === 0
              ? 'Aucune fiche'
              : allSigned
              ? '✅ Toutes vérifiées'
              : `${signedCount}/${fiches.length} vérifiée${signedCount !== 1 ? 's' : ''}`}
          </span>
          {!allSigned && fiches.length > 0 && (
            <button className="acd__verify-all-btn" onClick={verifyAll} disabled={verifyingAll}>
              {verifyingAll ? 'Vérification…' : `✅ Tout vérifier (${fiches.length - signedCount})`}
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Loading />
      ) : fiches.length === 0 ? (
        <p className="acd__empty" style={{ padding: '0.5rem 0' }}>Aucune fiche enregistrée pour ce trimestre.</p>
      ) : (
        <div className="acd__fiche-list">
          {fiches.map((f) => (
            <div key={f.subjectId} className={`acd__fiche-row${f.isSigned ? ' acd__fiche-row--signed' : ''}`}>
              <div className="acd__fiche-subject">
                <span className="acd__fiche-name">{f.subject?.nameFr ?? '—'}</span>
                {f.subject?.code && <span className="acd__fiche-code">{f.subject.code}</span>}
              </div>
              <div className="acd__fiche-status">
                {f.isSigned ? (
                  <span className="acd__fiche-badge acd__fiche-badge--signed">
                    ✅ {f.signedByName}
                    {f.signedAt && (
                      <span className="acd__fiche-date"> · {new Date(f.signedAt).toLocaleDateString('fr-FR')}</span>
                    )}
                  </span>
                ) : (
                  <span className="acd__fiche-badge acd__fiche-badge--unsigned">⬜ Non vérifiée</span>
                )}
              </div>
              <div className="acd__fiche-actions">
                {f.isSigned ? (
                  <button
                    className="acd__fiche-btn acd__fiche-btn--unsign"
                    onClick={() => unverifyMutation.mutate({ subjectId: f.subjectId })}
                    disabled={unverifyMutation.isPending}
                  >
                    🔓 Annuler
                  </button>
                ) : (
                  <button
                    className="acd__fiche-btn acd__fiche-btn--verify"
                    onClick={() => verifyMutation.mutate({ subjectId: f.subjectId })}
                    disabled={verifyMutation.isPending}
                  >
                    ✅ Vérifier
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassDetailPage() {
  const { id } = useParams();
  const [editingTimetable, setEditingTimetable] = useState(false);

  const { data: cls, isLoading } = useQuery({
    queryKey: ['class', id],
    queryFn: () => classesService.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const academicYear = cls?.academicYear ?? '';

  const { data: timetableSlots = [] } = useQuery({
    queryKey: ['timetable', id, academicYear],
    queryFn: () => timetablesService.list(id, academicYear).then((r) => r.data),
    enabled: !!id && !!academicYear,
  });

  if (isLoading) return <AppShell title="Classe"><Loading /></AppShell>;
  if (!cls) return (
    <AppShell title="Classe">
      <p className="acd__error">Classe introuvable.</p>
    </AppShell>
  );

  const students = [...(cls.students ?? [])].sort((a, b) => {
    const na = a.student?.user?.name ?? a.student?.admissionNumber ?? '';
    const nb = b.student?.user?.name ?? b.student?.admissionNumber ?? '';
    return na.localeCompare(nb, 'fr');
  });

  const subjects = cls.subjects ?? [];
  const boys  = students.filter((cs) => cs.student?.sex === 'M').length;
  const girls = students.filter((cs) => cs.student?.sex === 'F').length;

  const studentColumns = [
    {
      key: 'rank',
      label: 'N°',
      style: { width: '40px', color: 'var(--color-text-muted, #6b7280)', fontSize: '0.8rem' },
      render: (_, idx) => idx + 1,
    },
    {
      key: 'name',
      label: 'Élève',
      render: (cs) => {
        const s = cs.student;
        const name = s?.user?.name ?? s?.admissionNumber ?? '—';
        return (
          <div className="acd__student-cell">
            <Avatar name={name} src={s?.user?.profileImage} size="sm" />
            <div>
              <div className="acd__student-name">{name}</div>
              <div className="acd__student-sub">{s?.admissionNumber}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'sex',
      label: 'Sexe',
      render: (cs) => {
        const sex = cs.student?.sex;
        if (!sex) return <span className="acd__empty">—</span>;
        return <Badge variant={SEX_VARIANT[sex] ?? 'default'}>{SEX_LABEL[sex] ?? sex}</Badge>;
      },
    },
    {
      key: 'dob',
      label: 'Date de naissance',
      render: (cs) =>
        cs.student?.dateOfBirth
          ? new Date(cs.student.dateOfBirth).toLocaleDateString('fr-FR')
          : <span className="acd__empty">—</span>,
    },
  ];

  const subjectColumns = [
    {
      key: 'subject',
      label: 'Matière',
      render: (cs) => (
        <div>
          <div className="acd__subject-name">{cs.subject?.nameFr ?? '—'}</div>
          {cs.subject?.code && <div className="acd__subject-code">{cs.subject.code}</div>}
        </div>
      ),
    },
    {
      key: 'teacher',
      label: 'Enseignant',
      render: (cs) =>
        cs.teacher
          ? <span className="acd__teacher">{cs.teacher.name}</span>
          : <span className="acd__empty">Non assigné</span>,
    },
  ];

  return (
    <AppShell title={cls.name}>
      <PageHeader
        title={cls.name}
        subtitle={`${cls.level ?? ''} — ${cls.academicYear ?? ''}`}
        actions={
          <Link to="/admin/classes" className="acd__back-btn">
            ← Classes
          </Link>
        }
      />

      {/* Meta strip */}
      <div className="acd__meta">
        <div className="acd__meta-item">
          <span className="acd__meta-label">Élèves</span>
          <span className="acd__meta-value">{students.length}</span>
        </div>
        <div className="acd__meta-item">
          <span className="acd__meta-label">Garçons</span>
          <span className="acd__meta-value acd__meta-value--m">{boys}</span>
        </div>
        <div className="acd__meta-item">
          <span className="acd__meta-label">Filles</span>
          <span className="acd__meta-value acd__meta-value--f">{girls}</span>
        </div>
        <div className="acd__meta-item">
          <span className="acd__meta-label">Matières</span>
          <span className="acd__meta-value">{subjects.length}</span>
        </div>
        {cls.teacher && (
          <div className="acd__meta-item">
            <span className="acd__meta-label">Prof. principal</span>
            <span className="acd__meta-value">{cls.teacher.name}</span>
          </div>
        )}
        {cls.room && (
          <div className="acd__meta-item">
            <span className="acd__meta-label">Salle</span>
            <span className="acd__meta-value">{cls.room}</span>
          </div>
        )}
      </div>

      {/* Students table */}
      <section className="acd__section">
        <h2 className="acd__section-title">
          Liste des élèves
          <span className="acd__section-count">{students.length}</span>
        </h2>
        <Table
          columns={studentColumns}
          rows={students}
          emptyMessage="Aucun élève inscrit dans cette classe"
        />
      </section>

      {/* Subjects table */}
      <section className="acd__section">
        <h2 className="acd__section-title">
          Matières enseignées
          <span className="acd__section-count">{subjects.length}</span>
        </h2>
        <Table
          columns={subjectColumns}
          rows={subjects}
          emptyMessage="Aucune matière assignée à cette classe"
        />
      </section>

      {/* Timetable section */}
      <section className="acd__section">
        <div className="acd__section-title-row">
          <h2 className="acd__section-title">
            Emploi du temps
            <span className="acd__section-count">{timetableSlots.length} créneau{timetableSlots.length !== 1 ? 'x' : ''}</span>
          </h2>
          {!editingTimetable && (
            <button className="acd__tt-edit-btn" onClick={() => setEditingTimetable(true)}>
              ✏️ {timetableSlots.length > 0 ? 'Modifier' : 'Créer'}
            </button>
          )}
        </div>

        {editingTimetable ? (
          <TimetableEditor
            cls={cls}
            academicYear={academicYear}
            slots={timetableSlots}
            onSaved={() => setEditingTimetable(false)}
          />
        ) : (
          <TimetableGrid slots={timetableSlots} />
        )}
      </section>

      {/* Fiches de notes */}
      <section className="acd__section">
        <h2 className="acd__section-title">Fiches de notes</h2>
        <FichesPanel classId={id} academicYear={academicYear} />
      </section>
    </AppShell>
  );
}

export default ClassDetailPage;
