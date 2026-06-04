import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useInstitution } from '../../../context/InstitutionContext';
import { timetablesService } from '../../../services/timetablesService';
import { classesService } from '../../../services/classesService';
import { subjectsService } from '../../../services/subjectsService';
import { usersService } from '../../../services/usersService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import './TimetableBuilderPage.css';

const DAYS = [
  { key: 'MONDAY',    label: 'Lundi'    },
  { key: 'TUESDAY',   label: 'Mardi'    },
  { key: 'WEDNESDAY', label: 'Mercredi' },
  { key: 'THURSDAY',  label: 'Jeudi'    },
  { key: 'FRIDAY',    label: 'Vendredi' },
  { key: 'SATURDAY',  label: 'Samedi'   },
];

const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00',
];

const DURATIONS = [30, 60, 90, 120];

const SLOT_COLORS = [
  '#dbeafe', '#dcfce7', '#fef3c7', '#fce7f3', '#ede9fe', '#ffedd5', '#f0fdf4', '#ecfeff',
];

function slotColor(subjectId, subjects) {
  const idx = subjects.findIndex((s) => s.id === subjectId);
  return SLOT_COLORS[idx % SLOT_COLORS.length] ?? SLOT_COLORS[0];
}

export default function TimetableBuilderPage() {
  const qc = useQueryClient();
  const { institution } = useInstitution();
  const currentYear = institution?.academicSettings?.currentYear ?? '';

  const [classId, setClassId]     = useState('');
  const [year, setYear]           = useState(currentYear);
  const [editingSlot, setEditing] = useState(null); // { dayOfWeek, startTime } | null

  const { data: classes = [] }   = useQuery({ queryKey: ['classes'], queryFn: () => classesService.list().then((r) => r.data) });
  const { data: subjects = [] }  = useQuery({ queryKey: ['subjects'], queryFn: () => subjectsService.list().then((r) => r.data) });
  const { data: teachers = [] }  = useQuery({ queryKey: ['users', 'teachers'], queryFn: () => usersService.listTeachers().then((r) => r.data) });

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['timetable', classId, year],
    queryFn: () => timetablesService.list(classId, year).then((r) => r.data),
    enabled: !!(classId && year),
  });

  const saveMutation = useMutation({
    mutationFn: (newSlots) => timetablesService.save(classId, { academicYear: year, slots: newSlots }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetable', classId, year] });
      toast.success('Emploi du temps enregistré');
      setEditing(null);
    },
    onError: () => toast.error('Impossible d\'enregistrer'),
  });

  // Local state for in-progress edits
  const [localSlots, setLocalSlots] = useState(null);
  const displaySlots = localSlots ?? slots;

  // Slot form state
  const [slotForm, setSlotForm] = useState({ subjectId: '', teacherId: '', startTime: '08:00', duration: 60, room: '' });

  function openEdit(day, time) {
    const existing = displaySlots.find((s) => s.dayOfWeek === day && s.startTime === time);
    if (existing) {
      setSlotForm({
        subjectId: existing.subjectId ?? '',
        teacherId: existing.teacherId ?? '',
        startTime: existing.startTime,
        duration: diffMinutes(existing.startTime, existing.endTime),
        room: existing.room ?? '',
      });
    } else {
      setSlotForm((f) => ({ ...f, startTime: time }));
    }
    setEditing({ dayOfWeek: day, startTime: time });
  }

  function diffMinutes(start, end) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }

  function addMinutes(time, mins) {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function applySlot() {
    if (!slotForm.subjectId) { toast.error('Choisissez une matière'); return; }
    const endTime = addMinutes(slotForm.startTime, slotForm.duration);
    const updated = (localSlots ?? slots).filter(
      (s) => !(s.dayOfWeek === editingSlot.dayOfWeek && s.startTime === editingSlot.startTime)
    );
    updated.push({
      dayOfWeek:  editingSlot.dayOfWeek,
      startTime:  slotForm.startTime,
      endTime,
      subjectId:  slotForm.subjectId,
      teacherId:  slotForm.teacherId || undefined,
      room:       slotForm.room || undefined,
      subject:    subjects.find((s) => s.id === slotForm.subjectId),
      teacher:    teachers.find((t) => t.id === slotForm.teacherId),
    });
    setLocalSlots(updated);
    setEditing(null);
  }

  function removeSlot(day, time) {
    setLocalSlots((prev) => (prev ?? slots).filter(
      (s) => !(s.dayOfWeek === day && s.startTime === time)
    ));
  }

  function saveAll() {
    saveMutation.mutate(
      displaySlots.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime:   s.endTime,
        subjectId: s.subjectId,
        teacherId: s.teacherId ?? undefined,
        room:      s.room ?? undefined,
      }))
    );
  }

  const classOptions   = classes.map((c) => ({ value: c.id, label: c.name }));
  const subjectOptions = subjects.map((s) => ({ value: s.id, label: s.nameFr }));
  const teacherOptions = [{ value: '', label: '— Aucun —' }, ...teachers.map((t) => ({ value: t.id, label: t.name }))];
  const hasChanges     = localSlots !== null;

  return (
    <AppShell>
      <PageHeader
        title="Emploi du temps"
        subtitle="Créez et modifiez les emplois du temps par classe"
        actions={
          hasChanges && (
            <Button size="sm" onClick={saveAll} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          )
        }
      />

      {/* Filters */}
      <Card className="ttb-filters">
        <div className="ttb-filters__row">
          <Select id="ttb-class" label="Classe" value={classId} placeholder="Sélectionner une classe"
            options={classOptions} onChange={(e) => { setClassId(e.target.value); setLocalSlots(null); }} />
          <div className="form-field">
            <label className="form-field__label">Année scolaire</label>
            <input className="ttb-year-input" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024-2025" />
          </div>
        </div>
      </Card>

      {!classId ? (
        <Card><div className="ttb-empty"><span>📅</span><p>Sélectionnez une classe pour afficher ou créer son emploi du temps.</p></div></Card>
      ) : isLoading ? (
        <Card><div className="ttb-empty"><p>Chargement…</p></div></Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'auto' }}>
          <table className="ttb-grid">
            <thead>
              <tr>
                <th className="ttb-grid__time-col">Heure</th>
                {DAYS.map((d) => <th key={d.key}>{d.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.slice(0, -1).map((time) => (
                <tr key={time}>
                  <td className="ttb-grid__time">{time}</td>
                  {DAYS.map((d) => {
                    const slot = displaySlots.find((s) => s.dayOfWeek === d.key && s.startTime === time);
                    return (
                      <td
                        key={d.key}
                        className={`ttb-grid__cell ${slot ? 'ttb-grid__cell--filled' : 'ttb-grid__cell--empty'}`}
                        style={slot ? { background: slotColor(slot.subjectId, subjects) } : {}}
                        onClick={() => openEdit(d.key, time)}
                      >
                        {slot ? (
                          <div className="ttb-slot">
                            <span className="ttb-slot__subject">{slot.subject?.nameFr ?? '—'}</span>
                            {slot.teacher && <span className="ttb-slot__teacher">{slot.teacher.name}</span>}
                            {slot.room && <span className="ttb-slot__room">{slot.room}</span>}
                            <button className="ttb-slot__del" onClick={(e) => { e.stopPropagation(); removeSlot(d.key, time); }} title="Supprimer">×</button>
                          </div>
                        ) : (
                          <span className="ttb-add-icon">+</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Edit modal */}
      {editingSlot && (
        <div className="ttb-overlay" onClick={() => setEditing(null)}>
          <div className="ttb-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ttb-modal__title">
              {DAYS.find((d) => d.key === editingSlot.dayOfWeek)?.label} — {editingSlot.startTime}
            </h3>
            <div className="ttb-modal__fields">
              <Select id="ttb-subject" label="Matière *" value={slotForm.subjectId}
                placeholder="Choisir une matière" options={subjectOptions}
                onChange={(e) => setSlotForm((f) => ({ ...f, subjectId: e.target.value }))} />
              <Select id="ttb-teacher" label="Enseignant" value={slotForm.teacherId}
                options={teacherOptions}
                onChange={(e) => setSlotForm((f) => ({ ...f, teacherId: e.target.value }))} />
              <div className="form-field">
                <label className="form-field__label">Durée</label>
                <select className="ttb-select" value={slotForm.duration}
                  onChange={(e) => setSlotForm((f) => ({ ...f, duration: Number(e.target.value) }))}>
                  {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-field__label">Salle (optionnel)</label>
                <input className="ttb-input" value={slotForm.room}
                  onChange={(e) => setSlotForm((f) => ({ ...f, room: e.target.value }))}
                  placeholder="ex: Salle A1" />
              </div>
            </div>
            <div className="ttb-modal__actions">
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Annuler</Button>
              <Button size="sm" onClick={applySlot}>Ajouter / Modifier</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
