import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { subjectsService } from '../../../services/subjectsService';
import { subjectHoursService } from '../../../services/subjectHoursService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Badge from '../../../components/common/Badge/Badge';
import Button from '../../../components/common/Button/Button';
import Modal from '../../../components/common/Modal/Modal';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Loading from '../../../components/common/Loading/Loading';
import './SubjectProfilePage.css';

const CATEGORY_LABEL = {
  SCIENCES: 'Sciences', LETTRES: 'Lettres', MATHS: 'Mathématiques',
  LANGUES: 'Langues', ARTS: 'Arts', EPS: 'EPS',
  TECHNIQUES: 'Techniques', AUTRE: 'Autre',
};

const CATEGORY_VARIANT = {
  SCIENCES: 'info', LETTRES: 'success', MATHS: 'warning',
  LANGUES: 'danger', ARTS: 'default', EPS: 'info',
  TECHNIQUES: 'warning', AUTRE: 'default',
};

const TERM_OPTIONS = [
  { value: '1', label: 'Trimestre 1' },
  { value: '2', label: 'Trimestre 2' },
  { value: '3', label: 'Trimestre 3' },
];

const EMPTY_HOURS_FORM = {
  classId: '', academicYear: '', termNumber: '1', termName: '',
  heuresPrevues: '', heuresEffectuees: '', absences: '', retards: '', notes: '',
};

function KpiCard({ icon, label, value, sub, colorClass }) {
  return (
    <Card className="spp-kpi">
      <span className={`spp-kpi__icon ${colorClass ?? ''}`}>{icon}</span>
      <div className="spp-kpi__body">
        <span className="spp-kpi__value">{value ?? '—'}</span>
        <span className="spp-kpi__label">{label}</span>
        {sub && <span className="spp-kpi__sub">{sub}</span>}
      </div>
    </Card>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="spp-detail-row">
      <dt className="spp-detail-row__label">{label}</dt>
      <dd className="spp-detail-row__value">{children ?? '—'}</dd>
    </div>
  );
}

function AdminSubjectProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [hoursModal, setHoursModal] = useState(false);
  const [hoursForm, setHoursForm]   = useState(EMPTY_HOURS_FORM);

  const { data: subject, isLoading } = useQuery({
    queryKey: ['subject', id],
    queryFn: () => subjectsService.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: hoursLogs = [] } = useQuery({
    queryKey: ['subject-hours', id],
    queryFn: () => subjectHoursService.list(id).then((r) => r.data),
    enabled: !!id,
  });

  const upsertMutation = useMutation({
    mutationFn: (data) => subjectHoursService.upsert(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subject-hours', id] });
      toast.success('Enregistré');
      setHoursModal(false);
      setHoursForm(EMPTY_HOURS_FORM);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  if (isLoading) return <AppShell title="Profil matière"><Loading /></AppShell>;

  const classSubjects = subject?.classSubjects ?? [];
  const classCount    = classSubjects.length;
  const teacherCount  = new Set(classSubjects.map((cs) => cs.teacher?.id).filter(Boolean)).size;

  const classOptions = classSubjects.map((cs) => ({
    value: cs.class.id,
    label: `${cs.class.name} (${cs.class.academicYear})`,
  }));

  function openHoursModal(prefill) {
    setHoursForm(prefill ?? EMPTY_HOURS_FORM);
    setHoursModal(true);
  }

  function handleHoursChange(field, value) {
    setHoursForm((f) => ({ ...f, [field]: value }));
  }

  function handleHoursSubmit() {
    if (!hoursForm.classId || !hoursForm.academicYear || !hoursForm.termNumber) {
      toast.error('Classe, année scolaire et trimestre requis');
      return;
    }
    const termLabel = TERM_OPTIONS.find((t) => t.value === hoursForm.termNumber)?.label ?? '';
    upsertMutation.mutate({
      classId:          hoursForm.classId,
      academicYear:     hoursForm.academicYear,
      termNumber:       Number(hoursForm.termNumber),
      termName:         hoursForm.termName || termLabel,
      heuresPrevues:    hoursForm.heuresPrevues    !== '' ? Number(hoursForm.heuresPrevues)    : undefined,
      heuresEffectuees: hoursForm.heuresEffectuees !== '' ? Number(hoursForm.heuresEffectuees) : undefined,
      absences:         hoursForm.absences         !== '' ? Number(hoursForm.absences)         : undefined,
      retards:          hoursForm.retards           !== '' ? Number(hoursForm.retards)           : undefined,
      notes:            hoursForm.notes || undefined,
    });
  }

  return (
    <AppShell title="Profil matière">
      <PageHeader
        title={subject?.nameFr ?? '—'}
        subtitle={subject?.code ? `Code : ${subject.code}` : ''}
        actions={
          <button className="spp-back-btn" onClick={() => navigate('/admin/subjects')}>
            ← Retour aux matières
          </button>
        }
      />

      <div className="spp-layout">

        {/* ── Identity card ── */}
        <Card className="spp-identity">
          <div className="spp-identity__icon-wrap">
            <span className="spp-identity__emoji">📚</span>
          </div>
          <div className="spp-identity__main">
            <h2 className="spp-identity__name">{subject?.nameFr ?? '—'}</h2>
            {subject?.nameEn && subject.nameEn !== subject.nameFr && (
              <p className="spp-identity__sub">{subject.nameEn}</p>
            )}
            <div className="spp-identity__badges">
              {subject?.code && <Badge variant="default">{subject.code}</Badge>}
              {subject?.category && (
                <Badge variant={CATEGORY_VARIANT[subject.category] ?? 'default'}>
                  {CATEGORY_LABEL[subject.category] ?? subject.category}
                </Badge>
              )}
              {subject?.isActive === false && <Badge variant="danger">Inactif</Badge>}
            </div>
          </div>
          <dl className="spp-identity__details">
            <DetailRow label="Département">{subject?.department}</DetailRow>
            <DetailRow label="Note de passage">
              {subject?.passMark != null ? `${subject.passMark} / 20` : null}
            </DetailRow>
            <DetailRow label="Description">{subject?.description}</DetailRow>
          </dl>
        </Card>

        {/* ── KPI row ── */}
        <div className="spp-kpis">
          <KpiCard
            icon="🏫"
            label="Classes assignées"
            value={classCount}
            sub="classes utilisant cette matière"
            colorClass="spp-kpi__icon--blue"
          />
          <KpiCard
            icon="👨‍🏫"
            label="Enseignants"
            value={teacherCount || '—'}
            sub="enseignants assignés"
            colorClass="spp-kpi__icon--purple"
          />
          <KpiCard
            icon="📝"
            label="Note de passage"
            value={subject?.passMark != null ? `${subject.passMark}/20` : '—'}
            sub="seuil de réussite"
            colorClass="spp-kpi__icon--gold"
          />
        </div>

        {/* ── Classes & teachers table ── */}
        <Card className="spp-section spp-section--full">
          <h3 className="spp-section__title">Classes &amp; Enseignants</h3>
          {classSubjects.length === 0 ? (
            <p className="spp-empty">Cette matière n'est assignée à aucune classe.</p>
          ) : (
            <div className="spp-table-wrap">
              <table className="spp-table">
                <thead>
                  <tr>
                    <th>Classe</th>
                    <th>Année scolaire</th>
                    <th>Enseignant</th>
                  </tr>
                </thead>
                <tbody>
                  {classSubjects.map((cs, i) => (
                    <tr key={cs.class?.id ?? i}>
                      <td>
                        <Link to={`/admin/classes/${cs.class?.id}`} className="spp-link">
                          {cs.class?.name ?? '—'}
                        </Link>
                      </td>
                      <td>{cs.class?.academicYear ?? '—'}</td>
                      <td>{cs.teacher?.name ?? <span className="spp-empty-inline">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ── Suivi des heures ── */}
        <Card className="spp-section spp-section--full">
          <div className="spp-section-header">
            <h3 className="spp-section__title">Suivi des heures &amp; absences</h3>
            <Button size="sm" icon="+" onClick={() => openHoursModal()}>
              Saisir
            </Button>
          </div>

          {hoursLogs.length === 0 ? (
            <p className="spp-empty">Aucune saisie pour le moment.</p>
          ) : (
            <div className="spp-table-wrap">
              <table className="spp-table">
                <thead>
                  <tr>
                    <th>Classe</th>
                    <th>Année</th>
                    <th>Période</th>
                    <th>H. prévues</th>
                    <th>H. effectuées</th>
                    <th>Absences</th>
                    <th>Retards</th>
                    <th>Observations</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {hoursLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.class?.name ?? '—'}</td>
                      <td>{log.academicYear}</td>
                      <td>{log.termName ?? `T${log.termNumber}`}</td>
                      <td>{log.heuresPrevues    ?? '—'}</td>
                      <td>
                        {log.heuresEffectuees != null && log.heuresPrevues != null ? (
                          <span className={log.heuresEffectuees < log.heuresPrevues ? 'spp-text--warn' : 'spp-text--ok'}>
                            {log.heuresEffectuees}
                          </span>
                        ) : (log.heuresEffectuees ?? '—')}
                      </td>
                      <td className={log.absences > 0 ? 'spp-text--warn' : ''}>
                        {log.absences ?? '—'}
                      </td>
                      <td className={log.retards > 0 ? 'spp-text--warn' : ''}>
                        {log.retards ?? '—'}
                      </td>
                      <td className="spp-notes-cell">{log.notes ?? '—'}</td>
                      <td>
                        <button
                          className="spp-edit-btn"
                          onClick={() => openHoursModal({
                            classId:          log.classId,
                            academicYear:     log.academicYear,
                            termNumber:       String(log.termNumber),
                            termName:         log.termName ?? '',
                            heuresPrevues:    log.heuresPrevues    != null ? String(log.heuresPrevues)    : '',
                            heuresEffectuees: log.heuresEffectuees != null ? String(log.heuresEffectuees) : '',
                            absences:         log.absences         != null ? String(log.absences)         : '',
                            retards:          log.retards          != null ? String(log.retards)          : '',
                            notes:            log.notes ?? '',
                          })}
                        >
                          Modifier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>

      {/* ── Hours modal ── */}
      <Modal
        open={hoursModal}
        onClose={() => { setHoursModal(false); setHoursForm(EMPTY_HOURS_FORM); }}
        title="Saisie des heures &amp; absences"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setHoursModal(false); setHoursForm(EMPTY_HOURS_FORM); }}>
              Annuler
            </Button>
            <Button onClick={handleHoursSubmit} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="spp-hours-form">
          <Select
            id="classId"
            label="Classe"
            required
            value={hoursForm.classId}
            placeholder="Sélectionner une classe"
            options={classOptions}
            onChange={(e) => handleHoursChange('classId', e.target.value)}
          />
          <div className="spp-hours-form__row">
            <Input
              id="academicYear"
              label="Année scolaire"
              required
              placeholder="ex: 2024-2025"
              value={hoursForm.academicYear}
              onChange={(e) => handleHoursChange('academicYear', e.target.value)}
            />
            <Select
              id="termNumber"
              label="Trimestre"
              required
              value={hoursForm.termNumber}
              options={TERM_OPTIONS}
              onChange={(e) => handleHoursChange('termNumber', e.target.value)}
            />
          </div>
          <div className="spp-hours-form__row">
            <Input
              id="heuresPrevues"
              label="Heures prévues"
              type="number"
              min="0"
              placeholder="ex: 30"
              value={hoursForm.heuresPrevues}
              onChange={(e) => handleHoursChange('heuresPrevues', e.target.value)}
            />
            <Input
              id="heuresEffectuees"
              label="Heures effectuées"
              type="number"
              min="0"
              placeholder="ex: 28"
              value={hoursForm.heuresEffectuees}
              onChange={(e) => handleHoursChange('heuresEffectuees', e.target.value)}
            />
          </div>
          <div className="spp-hours-form__row">
            <Input
              id="absences"
              label="Absences élèves"
              type="number"
              min="0"
              placeholder="ex: 5"
              value={hoursForm.absences}
              onChange={(e) => handleHoursChange('absences', e.target.value)}
            />
            <Input
              id="retards"
              label="Retards élèves"
              type="number"
              min="0"
              placeholder="ex: 3"
              value={hoursForm.retards}
              onChange={(e) => handleHoursChange('retards', e.target.value)}
            />
          </div>
          <Input
            id="notes"
            label="Observations"
            placeholder="Remarques libres du professeur…"
            value={hoursForm.notes}
            onChange={(e) => handleHoursChange('notes', e.target.value)}
          />
        </div>
      </Modal>
    </AppShell>
  );
}

export default AdminSubjectProfilePage;
