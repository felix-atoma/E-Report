import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { classesService } from '../../../services/classesService';
import { gradesService } from '../../../services/gradesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Tabs from '../../../components/common/Tabs/Tabs';
import Table from '../../../components/common/Table/Table';
import Avatar from '../../../components/common/Avatar/Avatar';
import Loading from '../../../components/common/Loading/Loading';
import './ClassDetailPage.css';

const TERM_OPTIONS = [
  { value: 1, label: '1er Trimestre' },
  { value: 2, label: '2ème Trimestre' },
  { value: 3, label: '3ème Trimestre' },
];

function ClassDetailPage() {
  const { id } = useParams();
  const [selectedTerm, setSelectedTerm] = useState(1);

  const { data: cls, isLoading } = useQuery({
    queryKey: ['class', id],
    queryFn: () => classesService.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const academicYear = cls?.academicYear ?? '';
  const termName = TERM_OPTIONS.find((t) => t.value === selectedTerm)?.label ?? `${selectedTerm}er Trimestre`;

  const { data: fichesStatus = [] } = useQuery({
    queryKey: ['fiches-status', id, academicYear, selectedTerm],
    queryFn: () =>
      gradesService.listFiches(id, academicYear, selectedTerm).then((r) => r.data),
    enabled: !!id && !!academicYear,
  });

  if (isLoading) return <AppShell title="Classe"><Loading /></AppShell>;
  if (!cls) return <AppShell title="Classe"><p className="class-detail__error">Classe introuvable.</p></AppShell>;

  const students = cls.students ?? [];
  const subjects  = cls.subjects  ?? [];

  // Build a map subjectId → fiche status
  const ficheMap = new Map(fichesStatus.map((f) => [f.subjectId, f]));
  const signedCount = fichesStatus.filter((f) => f.isSigned).length;
  const allSigned = fichesStatus.length > 0 && signedCount === fichesStatus.length;

  const studentColumns = [
    {
      key: 'name',
      label: 'Élève',
      render: (cs) => {
        const s = cs.student ?? cs;
        const name = s.user?.name ?? s.admissionNumber;
        return (
          <div className="class-detail__student">
            <Avatar name={name} size="sm" />
            <div>
              <div className="class-detail__student-name">{name}</div>
              {s.admissionNumber && <div className="class-detail__student-sub">{s.admissionNumber}</div>}
            </div>
          </div>
        );
      },
    },
    {
      key: 'dob',
      label: 'Date de naissance',
      render: (cs) => {
        const s = cs.student ?? cs;
        return s.dateOfBirth
          ? new Date(s.dateOfBirth).toLocaleDateString('fr-FR')
          : '—';
      },
    },
    {
      key: 'actions',
      label: '',
      render: (cs) => {
        const s = cs.student ?? cs;
        return (
          <Link to={`/teacher/students/${s.id}`} className="class-detail__profile-link">
            Profil →
          </Link>
        );
      },
    },
  ];

  const subjectColumns = [
    {
      key: 'name',
      label: 'Matière',
      render: (s) => (
        <div>
          <div className="class-detail__subject-name">{s.subject?.nameFr ?? s.nameFr}</div>
          {(s.subject?.code ?? s.code) && (
            <div className="class-detail__subject-code">{s.subject?.code ?? s.code}</div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Catégorie',
      render: (s) => (s.subject?.category ?? s.category) ?? <span className="class-detail__empty">—</span>,
    },
    {
      key: 'fiche',
      label: 'Fiche de notes',
      render: (s) => {
        const subjectId = s.subject?.id ?? s.subjectId ?? s.id;
        const fiche = ficheMap.get(subjectId);
        if (fiche?.isSigned) {
          return (
            <span className="class-detail__fiche-badge class-detail__fiche-badge--signed">
              ✅ Signé — {fiche.signedByName}
            </span>
          );
        }
        return <span className="class-detail__fiche-badge class-detail__fiche-badge--unsigned">⬜ Non signé</span>;
      },
    },
    {
      key: 'actions',
      label: '',
      render: (s) => {
        const subjectId = s.subject?.id ?? s.subjectId ?? s.id;
        return (
          <Link
            to={`/teacher/classes/${cls.id}/grades/${subjectId}?academicYear=${encodeURIComponent(academicYear)}&termNumber=${selectedTerm}&termName=${encodeURIComponent(termName)}`}
            className="class-detail__grade-link"
          >
            ✏️ Saisir / voir les notes
          </Link>
        );
      },
    },
  ];

  const subjectsContent = (
    <div>
      {/* Term selector */}
      <div className="class-detail__term-bar">
        <span className="class-detail__term-label">Trimestre :</span>
        <div className="class-detail__term-tabs">
          {TERM_OPTIONS.map((t) => (
            <button
              key={t.value}
              className={`class-detail__term-btn${selectedTerm === t.value ? ' class-detail__term-btn--active' : ''}`}
              onClick={() => setSelectedTerm(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className={`class-detail__fiche-summary${allSigned ? ' class-detail__fiche-summary--done' : ''}`}>
          {allSigned
            ? '✅ Toutes les fiches sont signées'
            : `${signedCount}/${fichesStatus.length} fiche${fichesStatus.length !== 1 ? 's' : ''} signée${signedCount !== 1 ? 's' : ''}`}
        </span>
      </div>

      <Table
        columns={subjectColumns}
        rows={subjects}
        emptyMessage="Aucune matière assignée"
      />
    </div>
  );

  const tabs = [
    {
      key: 'subjects',
      label: `Matières (${subjects.length})`,
      content: subjectsContent,
    },
    {
      key: 'students',
      label: `Élèves (${students.length})`,
      content: (
        <Table
          columns={studentColumns}
          rows={students}
          emptyMessage="Aucun élève dans cette classe"
        />
      ),
    },
  ];

  return (
    <AppShell title={cls.name}>
      <PageHeader
        title={cls.name}
        subtitle={`${cls.level ?? ''} — ${academicYear}`}
      />

      <div className="class-detail__meta">
        <span className="class-detail__meta-item">
          🎒 <strong>{students.length}</strong> élève{students.length !== 1 ? 's' : ''}
        </span>
        <span className="class-detail__meta-item">
          📚 <strong>{subjects.length}</strong> matière{subjects.length !== 1 ? 's' : ''}
        </span>
        {cls.teacher && (
          <span className="class-detail__meta-item">
            👩‍🏫 Prof titulaire : <strong>{cls.teacher.name}</strong>
          </span>
        )}
        {cls.room && (
          <span className="class-detail__meta-item">🏫 Salle : <strong>{cls.room}</strong></span>
        )}
      </div>

      <Tabs tabs={tabs} defaultTab="subjects" />
    </AppShell>
  );
}

export default ClassDetailPage;
