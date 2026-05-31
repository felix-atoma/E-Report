import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '../../../services/attendanceService';
import './AttendanceInput.css';

const STATUS_LABELS = { PRESENT: 'Présent', ABSENT: 'Absent', LATE: 'Retard', EXCUSED: 'Excusé' };
const STATUS_CLASS  = { PRESENT: 'present', ABSENT: 'absent', LATE: 'late', EXCUSED: 'excused' };

export default function AttendanceInput({ studentId }) {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendance-student', studentId],
    queryFn: () => attendanceService.listByStudent(studentId).then((r) => r.data),
    enabled: !!studentId,
  });

  if (isLoading) return <div className="att-widget att-widget--loading">Chargement…</div>;
  if (!records.length) return <div className="att-widget att-widget--empty">Aucun relevé de présence.</div>;

  const counts = records.reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; },
    { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 },
  );
  const total = records.length;
  const rate  = total ? Math.round((counts.PRESENT / total) * 100) : 0;

  return (
    <div className="att-widget">
      <div className="att-widget__summary">
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} className={`att-widget__stat att-widget__stat--${STATUS_CLASS[status]}`}>
            <strong>{count}</strong>
            <span>{STATUS_LABELS[status]}</span>
          </div>
        ))}
        <div className="att-widget__rate">
          <strong>{rate}%</strong>
          <span>Taux présence</span>
          <div className="att-widget__bar">
            <div className="att-widget__bar-fill" style={{ width: `${rate}%` }} />
          </div>
        </div>
      </div>

      <div className="att-widget__list">
        {records.slice(0, 10).map((rec) => (
          <div key={rec.id} className="att-widget__row">
            <span className="att-widget__date">
              {new Date(rec.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
            <span className={`att-widget__pill att-widget__pill--${STATUS_CLASS[rec.status]}`}>
              {STATUS_LABELS[rec.status]}
            </span>
            {rec.subject && <span className="att-widget__subject">{rec.subject.nameFr}</span>}
            {rec.note && <span className="att-widget__note">{rec.note}</span>}
          </div>
        ))}
        {records.length > 10 && (
          <p className="att-widget__more">+{records.length - 10} autres enregistrements</p>
        )}
      </div>
    </div>
  );
}
