import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { reportsService } from '../../../services/reportsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Loading from '../../../components/common/Loading/Loading';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import './ProgressPage.css';

function getMention(avg, t) {
  if (avg >= 18) return t('progress.mention.Excellent');
  if (avg >= 16) return t('progress.mention.TresBien');
  if (avg >= 14) return t('progress.mention.Bien');
  if (avg >= 12) return t('progress.mention.AssezBien');
  if (avg >= 10) return t('progress.mention.Passable');
  return t('progress.mention.Insuffisant');
}

function CustomTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null;
  const avg = payload[0].value;
  return (
    <div className="progress-tooltip">
      <div className="progress-tooltip__label">{label}</div>
      <div className="progress-tooltip__avg">
        {String(avg).replace('.', ',')} / 20
      </div>
      <div className="progress-tooltip__mention">{getMention(avg, t)}</div>
    </div>
  );
}

function ProgressPage() {
  const { t } = useTranslation();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['student-reports'],
    queryFn: () => reportsService.list().then((r) => r.data),
  });

  if (isLoading) return <AppShell title={t('progress.title')}><Loading /></AppShell>;

  const published = reports
    .filter((r) => r.status === 'PUBLISHED' && r.overallAverage != null)
    .sort((a, b) => {
      if (a.academicYear !== b.academicYear) return a.academicYear.localeCompare(b.academicYear);
      return (a.termNumber ?? 0) - (b.termNumber ?? 0);
    });

  const chartData = published.map((r) => ({
    name: r.termName ?? `T${r.termNumber} ${r.academicYear?.slice(-4) ?? ''}`,
    avg:  r.overallAverage,
  }));

  const avgAll   = published.length
    ? Math.round(published.reduce((s, r) => s + r.overallAverage, 0) / published.length * 100) / 100
    : null;
  const best     = published.length
    ? Math.max(...published.map((r) => r.overallAverage))
    : null;
  const trend    = published.length >= 2
    ? published[published.length - 1].overallAverage - published[0].overallAverage
    : null;

  return (
    <AppShell title={t('progress.title')}>
      <PageHeader
        title={t('progress.title')}
        subtitle={t('progress.subtitle')}
      />

      {published.length < 2 ? (
        <EmptyState
          icon="📈"
          message={t('progress.noDataTitle')}
          description={t('progress.noDataDesc')}
        />
      ) : (
        <>
          <div className="progress-kpis">
            <Card className="progress-kpi">
              <span className="progress-kpi__icon">📊</span>
              <span className="progress-kpi__value">{String(avgAll).replace('.', ',')}</span>
              <span className="progress-kpi__label">{t('progress.kpi.overall')}</span>
            </Card>
            <Card className="progress-kpi">
              <span className="progress-kpi__icon">🏆</span>
              <span className="progress-kpi__value">{String(best).replace('.', ',')}</span>
              <span className="progress-kpi__label">{t('progress.kpi.best')}</span>
            </Card>
            <Card className="progress-kpi">
              <span className="progress-kpi__icon">{trend >= 0 ? '📈' : '📉'}</span>
              <span className={`progress-kpi__value ${trend >= 0 ? 'progress-kpi__value--up' : 'progress-kpi__value--down'}`}>
                {trend >= 0 ? '+' : ''}{String(Math.round(trend * 100) / 100).replace('.', ',')}
              </span>
              <span className="progress-kpi__label">{t('progress.kpi.trend')}</span>
            </Card>
          </div>

          <Card className="progress-chart-card">
            <h3 className="progress-chart-card__title">{t('progress.chartTitle')}</h3>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis
                  domain={[0, 20]}
                  ticks={[0, 5, 10, 12, 14, 16, 18, 20]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip t={t} />} />
                <ReferenceLine
                  y={10}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{ value: t('progress.threshold'), position: 'insideTopRight', fontSize: 11, fill: '#f59e0b' }}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7 }}
                  name={t('progress.kpi.overall')}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="progress-breakdown">
            <h3 className="progress-breakdown__title">{t('progress.breakdownTitle')}</h3>
            <div className="progress-breakdown__list">
              {published.map((r) => {
                const m = getMention(r.overallAverage, t);
                return (
                  <div key={r.id} className="progress-breakdown__row">
                    <div>
                      <div className="progress-breakdown__term">
                        {r.termName ?? `Trimestre ${r.termNumber}`}
                      </div>
                      <div className="progress-breakdown__year">{r.academicYear}</div>
                    </div>
                    <div className="progress-breakdown__right">
                      <span className="progress-breakdown__avg">
                        {String(r.overallAverage).replace('.', ',')} / 20
                      </span>
                      <span className={`progress-breakdown__mention progress-breakdown__mention--${r.overallAverage >= 10 ? 'pass' : 'fail'}`}>
                        {m}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </AppShell>
  );
}

export default ProgressPage;
