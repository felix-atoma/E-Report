import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { timetablesService } from '../../../services/timetablesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Loading from '../../../components/common/Loading/Loading';
import './TeacherSchedulePage.css';

const DAY_ORDER = ['LUNDI','MARDI','MERCREDI','JEUDI','VENDREDI','SAMEDI'];
const TODAY_MAP = { 1:'LUNDI', 2:'MARDI', 3:'MERCREDI', 4:'JEUDI', 5:'VENDREDI', 6:'SAMEDI' };
const SLOT_COLORS = ['#dbeafe','#dcfce7','#fce7f3','#fef3c7','#ede9fe','#ccfbf1','#fee2e2','#e0f2fe','#fdf4ff','#f0fdf4'];

function currentAcademicYear() {
  const y = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  return `${y}-${y + 1}`;
}

function TeacherSchedulePage() {
  const { t } = useTranslation();
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
    <AppShell title={t('teacherSchedule.title')}>
      <PageHeader
        title={t('teacherSchedule.title')}
        subtitle={t('teacherSchedule.subtitle')}
      />

      <div className="teacher-sched__toolbar">
        <label className="teacher-sched__year-label">{t('teacherSchedule.yearLabel')}</label>
        <input
          type="text"
          value={year}
          onChange={e => setYear(e.target.value)}
          className="teacher-sched__year-input"
        />
        {!isLoading && slots.length > 0 && (
          <span className="teacher-sched__meta">
            {t('teacherSchedule.meta', { count: activeDays.length, periods: totalPeriods })}
          </span>
        )}
      </div>

      {isLoading ? (
        <Loading />
      ) : slots.length === 0 ? (
        <Card>
          <div className="teacher-sched__empty">
            <span className="teacher-sched__empty-icon">📅</span>
            <p>{t('teacherSchedule.empty', { year })}</p>
            <p className="teacher-sched__empty-sub">{t('teacherSchedule.emptySub')}</p>
          </div>
        </Card>
      ) : (
        <>
          {todaySlots.length > 0 && (
            <div className="teacher-sched__today-banner">
              <span className="teacher-sched__today-icon">📌</span>
              <div>
                <strong>{t('teacherSchedule.today')}</strong>
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
                    <span className="teacher-sched__day-name">{t(`teacherSchedule.days.${day}`, day)}</span>
                    {isToday && <span className="teacher-sched__today-badge">{t('teacherSchedule.todayBadge')}</span>}
                    <span className="teacher-sched__day-count">{daySlots.length} {t('teacherSchedule.courses')}</span>
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
                          {t('teacherSchedule.enterGrades')}
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
