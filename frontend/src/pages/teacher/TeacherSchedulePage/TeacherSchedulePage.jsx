import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { timetablesService } from '../../../services/timetablesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Loading from '../../../components/common/Loading/Loading';
import './TeacherSchedulePage.css';

const DAY_ORDER  = ['LUNDI','MARDI','MERCREDI','JEUDI','VENDREDI','SAMEDI'];
const DAY_LABELS = { LUNDI:'Lundi', MARDI:'Mardi', MERCREDI:'Mercredi', JEUDI:'Jeudi', VENDREDI:'Vendredi', SAMEDI:'Samedi' };
const TODAY_MAP  = { 1:'LUNDI', 2:'MARDI', 3:'MERCREDI', 4:'JEUDI', 5:'VENDREDI', 6:'SAMEDI' };
const SLOT_COLORS = ['#dbeafe','#dcfce7','#fce7f3','#fef3c7','#ede9fe','#ccfbf1','#fee2e2','#e0f2fe','#fdf4ff','#f0fdf4'];

function currentAcademicYear() {
  const y = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  return `${y}-${y + 1}`;
}

function TeacherSchedulePage() {
  const [year, setYear] = useState(currentAcademicYear);

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['my-schedule', year],
    queryFn: () => timetablesService.getMySchedule(year).then(r => r.data),
    enabled: !!year,
  });

  const today = TODAY_MAP[new Date().getDay()];

  const byDay = DAY_ORDER.reduce((acc, day) => {
    acc[day] = slots.filter(s => s.dayOfWeek === day);
    return acc;
  }, {});

  const subjectIds = [...new Set(slots.map(s => s.subjectId))];
  const subjectColor = Object.fromEntries(subjectIds.map((id, i) => [id, SLOT_COLORS[i % SLOT_COLORS.length]]));

  const activeDays = DAY_ORDER.filter(d => byDay[d].length > 0);
  const totalPeriods = slots.length;
  const todaySlots = byDay[today] ?? [];

  return (
    <AppShell title="Tableau de service">
      <PageHeader
        title="Mon tableau de service"
        subtitle="Emploi du temps personnel — classes et créneaux assignés"
      />

      <div className="teacher-sched__toolbar">
        <label className="teacher-sched__year-label">Année scolaire :</label>
        <input
          type="text"
          value={year}
          onChange={e => setYear(e.target.value)}
          className="teacher-sched__year-input"
        />
        {!isLoading && slots.length > 0 && (
          <span className="teacher-sched__meta">
            {activeDays.length} jour{activeDays.length > 1 ? 's' : ''} · {totalPeriods} cours/semaine
          </span>
        )}
      </div>

      {isLoading ? (
        <Loading />
      ) : slots.length === 0 ? (
        <Card>
          <div className="teacher-sched__empty">
            <span className="teacher-sched__empty-icon">📅</span>
            <p>Aucun créneau assigné pour l'année {year}.</p>
            <p className="teacher-sched__empty-sub">L'administrateur doit configurer l'emploi du temps et vous y assigner.</p>
          </div>
        </Card>
      ) : (
        <>
          {todaySlots.length > 0 && (
            <div className="teacher-sched__today-banner">
              <span className="teacher-sched__today-icon">📌</span>
              <div>
                <strong>Aujourd'hui</strong>
                <span className="teacher-sched__today-list">
                  {todaySlots.map(s => `${s.subject?.nameFr} (${s.class?.name}) ${s.startTime}–${s.endTime}`).join(' · ')}
                </span>
              </div>
            </div>
          )}

          <div className="teacher-sched__grid">
            {DAY_ORDER.map(day => {
              const daySlots = byDay[day];
              if (daySlots.length === 0) return null;
              const isToday = day === today;
              return (
                <div key={day} className={`teacher-sched__day${isToday ? ' teacher-sched__day--today' : ''}`}>
                  <div className="teacher-sched__day-header">
                    <span className="teacher-sched__day-name">{DAY_LABELS[day]}</span>
                    {isToday && <span className="teacher-sched__today-badge">Aujourd'hui</span>}
                    <span className="teacher-sched__day-count">{daySlots.length} cours</span>
                  </div>
                  <div className="teacher-sched__slots">
                    {daySlots.map(slot => (
                      <div
                        key={slot.id}
                        className="teacher-sched__slot"
                        style={{ background: subjectColor[slot.subjectId] }}
                      >
                        <div className="teacher-sched__slot-time">
                          {slot.startTime} – {slot.endTime}
                        </div>
                        <div className="teacher-sched__slot-subject">{slot.subject?.nameFr ?? '—'}</div>
                        <div className="teacher-sched__slot-meta">
                          <span className="teacher-sched__slot-class">{slot.class?.name ?? '—'}</span>
                          {slot.room && (
                            <span className="teacher-sched__slot-room">📍 {slot.room}</span>
                          )}
                        </div>
                        <Link
                          to={`/teacher/classes/${slot.classId}/grades/${slot.subjectId}`}
                          className="teacher-sched__slot-link"
                        >
                          Saisir les notes →
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </AppShell>
  );
}

export default TeacherSchedulePage;
