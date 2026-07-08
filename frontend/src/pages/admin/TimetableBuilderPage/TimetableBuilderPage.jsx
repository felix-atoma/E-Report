import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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

const DAY_KEYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

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
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { institution } = useInstitution();
  const currentYear = institution?.academicSettings?.currentYear ?? '';

  const [classId, setClassId]     = useState('');
  const [year, setYear]           = useState(currentYear);
  const [editingSlot, setEditing] = useState(null);

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
      toast.success(t('timetable.toast.saved'));
      setEditing(null);
    },
    onError: () => toast.error(t('timetable.toast.error')),
  });

  const [localSlots, setLocalSlots] = useState(null);
  const displaySlots = localSlots ?? slots;

  const [slotForm, setSlotForm] = useState({ subjectId: '', teacherId: '', startTime: '08:00', duration: 60, room: '' });

  const days = useMemo(() => DAY_KEYS.map((k) => ({ key: k, label: t(`timetable.days.${k}`) })), [t]);

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

  function toMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  function applySlot() {
    if (!slotForm.subjectId) { toast.error(t('timetable.errors.subjectRequired')); return; }
    const endTime = addMinutes(slotForm.startTime, slotForm.duration);

    // Conflict detection: same teacher, same day, overlapping time
    if (slotForm.teacherId) {
      const newStart = toMinutes(slotForm.startTime);
      const newEnd   = toMinutes(endTime);
      const current  = (localSlots ?? slots).filter(
        (s) => !(s.dayOfWeek === editingSlot.dayOfWeek && s.startTime === editingSlot.startTime)
      );
      const conflict = current.find((s) => {
        if (s.dayOfWeek !== editingSlot.dayOfWeek) return false;
        if (s.teacherId !== slotForm.teacherId) return false;
        const sStart = toMinutes(s.startTime);
        const sEnd   = toMinutes(s.endTime);
        return newStart < sEnd && newEnd > sStart;
      });
      if (conflict) {
        const teacher = teachers.find((tc) => tc.id === slotForm.teacherId);
        toast.error(t('timetable.errors.teacherConflict', {
          teacher: teacher?.name ?? '',
          time: conflict.startTime,
          subject: conflict.subject?.nameFr ?? '',
        }));
        return;
      }
    }

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
      teacher:    teachers.find((tc) => tc.id === slotForm.teacherId),
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
  const teacherOptions = [{ value: '', label: t('timetable.noTeacher') }, ...teachers.map((tc) => ({ value: tc.id, label: tc.name }))];
  const hasChanges     = localSlots !== null;

  const editingDayLabel = editingSlot
    ? (days.find((d) => d.key === editingSlot.dayOfWeek)?.label ?? editingSlot.dayOfWeek)
    : '';

  return (
    <AppShell>
      <PageHeader
        title={t('timetable.title')}
        subtitle={t('timetable.subtitle')}
        actions={
          hasChanges && (
            <Button size="sm" onClick={saveAll} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t('action.saving') : t('action.save')}
            </Button>
          )
        }
      />

      <Card className="ttb-filters">
        <div className="ttb-filters__row">
          <Select
            id="ttb-class"
            label={t('timetable.classLabel')}
            value={classId}
            placeholder={t('timetable.classPlaceholder')}
            options={classOptions}
            onChange={(e) => { setClassId(e.target.value); setLocalSlots(null); }}
          />
          <div className="form-field">
            <label className="form-field__label">{t('timetable.yearLabel')}</label>
            <input className="ttb-year-input" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024-2025" />
          </div>
        </div>
      </Card>

      {!classId ? (
        <Card><div className="ttb-empty"><span>📅</span><p>{t('timetable.empty')}</p></div></Card>
      ) : isLoading ? (
        <Card><div className="ttb-empty"><p>{t('timetable.loading')}</p></div></Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'auto' }}>
          <table className="ttb-grid">
            <thead>
              <tr>
                <th className="ttb-grid__time-col">{t('timetable.timeCol')}</th>
                {days.map((d) => <th key={d.key}>{d.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.slice(0, -1).map((time) => (
                <tr key={time}>
                  <td className="ttb-grid__time">{time}</td>
                  {days.map((d) => {
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
                            <button className="ttb-slot__del" onClick={(e) => { e.stopPropagation(); removeSlot(d.key, time); }} title="×">×</button>
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

      {editingSlot && (
        <div className="ttb-overlay" onClick={() => setEditing(null)}>
          <div className="ttb-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ttb-modal__title">{editingDayLabel} — {editingSlot.startTime}</h3>
            <div className="ttb-modal__fields">
              <Select
                id="ttb-subject"
                label={t('timetable.subjectLabel')}
                value={slotForm.subjectId}
                placeholder={t('timetable.subjectPlaceholder')}
                options={subjectOptions}
                onChange={(e) => setSlotForm((f) => ({ ...f, subjectId: e.target.value }))}
              />
              <Select
                id="ttb-teacher"
                label={t('timetable.teacherLabel')}
                value={slotForm.teacherId}
                options={teacherOptions}
                onChange={(e) => setSlotForm((f) => ({ ...f, teacherId: e.target.value }))}
              />
              <div className="form-field">
                <label className="form-field__label">{t('timetable.duration')}</label>
                <select className="ttb-select" value={slotForm.duration}
                  onChange={(e) => setSlotForm((f) => ({ ...f, duration: Number(e.target.value) }))}>
                  {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-field__label">{t('timetable.room')}</label>
                <input
                  className="ttb-input"
                  value={slotForm.room}
                  onChange={(e) => setSlotForm((f) => ({ ...f, room: e.target.value }))}
                  placeholder={t('timetable.roomPlaceholder')}
                />
              </div>
            </div>
            <div className="ttb-modal__actions">
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>{t('action.cancel')}</Button>
              <Button size="sm" onClick={applySlot}>{t('timetable.addEdit')}</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
