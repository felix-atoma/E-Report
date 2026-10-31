import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { calendarService } from '../../../services/calendarService';
import Card from '../../../components/common/Card/Card';

// Évaluations programmées par l'administration dans le calendrier scolaire
const EVALUATION_TYPES = ['INTERROGATION', 'DEVOIR', 'COMPOSITION', 'EXAM'];
// Annoncée 7 jours avant, rappelée jusqu'à 14 jours après la date (fin) de l'évaluation
const DAYS_BEFORE = 7;
const DAYS_AFTER = 14;
const DISMISS_KEY = 'evalAlerts.dismissed';

const DAY_MS = 86400000;

function localToday() {
  const d = new Date();
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

// Dates du calendrier enregistrées à minuit UTC : on compare les jours, pas les heures
const dayOf = (iso) => Date.parse(String(iso).slice(0, 10));

function readDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'); } catch { return []; }
}

/**
 * Alerte du tableau de bord : « c'est le moment de saisir les notes » de l'interrogation, du devoir,
 * de la composition ou de l'examen programmé par l'administration (toutes classes ou une classe du professeur).
 */
function EvaluationAlerts({ classes }) {
  const { t, i18n } = useTranslation();
  const [dismissed, setDismissed] = useState(readDismissed);

  const { data: events = [] } = useQuery({
    queryKey: ['calendar'],
    queryFn: () => calendarService.list().then((r) => r.data),
  });

  const classIds = new Set(classes.map((c) => c.id));
  const className = Object.fromEntries(classes.map((c) => [c.id, c.name]));
  const today = localToday();

  const alerts = events
    .filter((ev) => EVALUATION_TYPES.includes(ev.type) && !dismissed.includes(ev.id))
    .filter((ev) => !ev.classId || classIds.has(ev.classId))
    .map((ev) => {
      const daysUntil = Math.round((dayOf(ev.startDate) - today) / DAY_MS);
      const daysSinceEnd = Math.round((today - dayOf(ev.endDate || ev.startDate)) / DAY_MS);
      return { ...ev, daysUntil, daysSinceEnd, due: daysUntil <= 0 };
    })
    .filter((ev) => ev.daysUntil <= DAYS_BEFORE && ev.daysSinceEnd <= DAYS_AFTER)
    .sort((a, b) => (b.due - a.due) || (a.daysUntil - b.daysUntil));

  if (!alerts.length) return null;

  function dismiss(id) {
    const next = [...dismissed, id];
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch { /* navigation privée */ }
  }

  const fmt = (iso) => new Date(iso).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });

  return (
    <Card className="teacher-dash__evals">
      <h3 className="teacher-dash__evals-title">🔔 {t('evalAlerts.title')}</h3>
      <div className="teacher-dash__evals-list">
        {alerts.map((ev) => (
          <div key={ev.id} className={`teacher-dash__eval ${ev.due ? 'teacher-dash__eval--due' : ''}`}>
            <div className="teacher-dash__eval-body">
              <div className="teacher-dash__eval-head">
                <span className="teacher-dash__eval-kind">{t(`calendar.types.${ev.type}`)}</span>
                <strong>{ev.title}</strong>
              </div>
              <div className="teacher-dash__eval-meta">
                📅 {fmt(ev.startDate)}
                {ev.endDate && dayOf(ev.endDate) !== dayOf(ev.startDate) && <> — {fmt(ev.endDate)}</>}
                {' · 🏫 '}{ev.classId ? className[ev.classId] : t('evalAlerts.allClasses')}
              </div>
              <div className="teacher-dash__eval-status">
                {ev.due
                  ? `⏰ ${t('evalAlerts.due')}`
                  : t('evalAlerts.upcoming', { count: ev.daysUntil })}
              </div>
            </div>
            <div className="teacher-dash__eval-actions">
              {ev.due && (
                <Link to="/teacher/fiches" className="teacher-dash__cm-link teacher-dash__cm-link--main">
                  {t('evalAlerts.enter')}
                </Link>
              )}
              <button type="button" className="teacher-dash__eval-hide" onClick={() => dismiss(ev.id)}>
                {t('evalAlerts.hide')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default EvaluationAlerts;
