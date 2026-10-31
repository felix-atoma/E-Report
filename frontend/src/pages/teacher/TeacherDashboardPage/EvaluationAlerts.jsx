import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { calendarService } from '../../../services/calendarService';
import Card from '../../../components/common/Card/Card';

// Annoncée 7 jours avant, rappelée jusqu'à 30 jours après la date (fin) de l'évaluation ;
// notes toujours incomplètes 3 jours après : l'alerte passe en retard (rouge clignotant)
const DAYS_BEFORE = 7;
const OVERDUE_AFTER = 3;
const DAYS_AFTER = 30;
// Seules les évaluations à venir peuvent être masquées : ensuite l'alerte ne part qu'une fois les notes saisies
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

const COLUMN_LABEL = {
  noteInterro1: 'Interro 1', noteInterro2: 'Interro 2', noteInterro3: 'Interro 3', noteInterro4: 'Interro 4',
  noteDevoir: 'Devoir', noteComposition: 'Composition',
};

function ficheLink(f) {
  const termName = `Trimestre ${f.termNumber}`;
  return `/teacher/classes/${f.classId}/grades/${f.subjectId}?academicYear=${encodeURIComponent(f.academicYear)}`
    + `&termNumber=${f.termNumber}&termName=${encodeURIComponent(termName)}`;
}

/**
 * Alerte du tableau de bord : interrogation, devoir, composition ou examen programmé par l'administration.
 * Le serveur vérifie sur chaque fiche du professeur (classe × matière) si la colonne correspondante est
 * remplie pour tous les élèves (ou la fiche signée) : l'alerte disparaît d'elle-même une fois les notes saisies.
 */
function EvaluationAlerts() {
  const { t, i18n } = useTranslation();
  const [dismissed, setDismissed] = useState(readDismissed);

  const { data: events = [] } = useQuery({
    queryKey: ['my-evaluations'],
    queryFn: () => calendarService.myEvaluations().then((r) => r.data),
    // Relu à chaque retour sur le tableau de bord : l'alerte part dès que les notes sont enregistrées
    staleTime: 0,
  });

  const today = localToday();

  const alerts = events
    .filter((ev) => !ev.complete)
    .map((ev) => {
      const daysUntil = Math.round((dayOf(ev.startDate) - today) / DAY_MS);
      const daysSinceEnd = Math.round((today - dayOf(ev.endDate || ev.startDate)) / DAY_MS);
      return { ...ev, daysUntil, daysSinceEnd, due: daysUntil <= 0, overdue: daysSinceEnd >= OVERDUE_AFTER };
    })
    .filter((ev) => ev.daysUntil <= DAYS_BEFORE && ev.daysSinceEnd <= DAYS_AFTER)
    .filter((ev) => ev.due || !dismissed.includes(ev.id))
    .sort((a, b) => (b.overdue - a.overdue) || (b.due - a.due) || (a.daysUntil - b.daysUntil));

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
    <Card className={`teacher-dash__evals ${alerts.some((ev) => ev.overdue) ? 'teacher-dash__evals--overdue' : ''}`}>
      <h3 className="teacher-dash__evals-title">🔔 {t('evalAlerts.title')}</h3>
      <div className="teacher-dash__evals-list">
        {alerts.map((ev) => {
          const missing = ev.fiches.filter((f) => !f.complete);
          return (
            <div key={ev.id} className={`teacher-dash__eval ${ev.overdue ? 'teacher-dash__eval--overdue' : ev.due ? 'teacher-dash__eval--due' : ''}`}
              role={ev.overdue ? 'alert' : undefined}>
              <div className="teacher-dash__eval-body">
                <div className="teacher-dash__eval-head">
                  <span className="teacher-dash__eval-kind">{t(`calendar.types.${ev.type}`)}</span>
                  <strong>{ev.title}</strong>
                </div>
                <div className="teacher-dash__eval-meta">
                  📅 {fmt(ev.startDate)}
                  {ev.endDate && dayOf(ev.endDate) !== dayOf(ev.startDate) && <> — {fmt(ev.endDate)}</>}
                </div>
                <div className="teacher-dash__eval-status">
                  {ev.overdue
                    ? `⚠️ ${t('evalAlerts.overdue', { count: ev.daysSinceEnd })}`
                    : ev.due
                    ? `⏰ ${t('evalAlerts.due')}`
                    : t('evalAlerts.upcoming', { count: ev.daysUntil })}
                </div>
                {ev.due && (
                  <div className="teacher-dash__eval-fiches">
                    {missing.map((f) => (
                      <Link key={`${f.classId}-${f.subjectId}`} to={ficheLink(f)} className="teacher-dash__eval-fiche">
                        <span>🏫 {f.className} · {f.subjectName}</span>
                        <span className="teacher-dash__eval-col">{COLUMN_LABEL[f.column]}</span>
                        <span className="teacher-dash__eval-count">
                          {f.missing === 'SIGNATURE'
                            ? `✍️ ${t('evalAlerts.toSign')}`
                            : t('evalAlerts.progress', { filled: f.filled, total: f.total })}
                        </span>
                        <span className="teacher-dash__eval-go">
                          {f.missing === 'SIGNATURE' ? t('evalAlerts.sign') : t('evalAlerts.enter')}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              {!ev.due && (
                <div className="teacher-dash__eval-actions">
                  <button type="button" className="teacher-dash__eval-hide" onClick={() => dismiss(ev.id)}>
                    {t('evalAlerts.hide')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default EvaluationAlerts;
