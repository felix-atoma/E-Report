import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { analyticsService } from '../../../services/analyticsService';
import { classesService } from '../../../services/classesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Loading from '../../../components/common/Loading/Loading';
import './ClassStatsPage.css';


function StatBadge({ label, count, pct, color }) {
  return (
    <div className="cstats-badge" style={{ '--badge-color': color }}>
      <div className="cstats-badge__count">{count}</div>
      <div className="cstats-badge__pct">{pct}%</div>
      <div className="cstats-badge__label">{label}</div>
    </div>
  );
}

function HighlightCard({ title, data, icon, positive }) {
  if (!data) return (
    <div className="cstats-highlight cstats-highlight--empty">
      <span className="cstats-highlight__icon">{icon}</span>
      <span className="cstats-highlight__none">{title} : aucune donnée</span>
    </div>
  );
  return (
    <div className={`cstats-highlight ${positive ? 'cstats-highlight--up' : 'cstats-highlight--down'}`}>
      <span className="cstats-highlight__icon">{icon}</span>
      <div className="cstats-highlight__body">
        <span className="cstats-highlight__title">{title}</span>
        <span className="cstats-highlight__name">{data.studentName}</span>
        <span className="cstats-highlight__detail">
          {data.previousAvg?.toFixed(2).replace('.', ',')} → {data.currentAvg?.toFixed(2).replace('.', ',')}
          <em className={`cstats-highlight__delta ${positive ? 'up' : 'down'}`}>
            {positive ? '+' : ''}{data.delta?.toFixed(2).replace('.', ',')}
          </em>
        </span>
      </div>
    </div>
  );
}

function StatMeasure({ label, value, unit, color, sub }) {
  return (
    <div className="cstats-measure">
      <div className="cstats-measure__value" style={{ color: color ?? 'var(--color-primary, #3b82f6)' }}>
        {value != null ? (typeof value === 'number' ? value.toFixed(2).replace('.', ',') : value) : '—'}
        {unit && <span className="cstats-measure__unit">{unit}</span>}
      </div>
      <div className="cstats-measure__label">{label}</div>
      {sub && <div className="cstats-measure__sub">{sub}</div>}
    </div>
  );
}

function ClassStatsPage() {
  const { t } = useTranslation();
  const [classId, setClassId] = useState('');
  const [termNumber, setTermNumber] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  const TERM_LABELS = {
    1: t('fees.terms.TRIMESTRE_1'),
    2: t('fees.terms.TRIMESTRE_2'),
    3: t('fees.terms.TRIMESTRE_3'),
  };

  const DIST_CONFIG = [
    { key: 'TB',    label: t('mention.tresBien'),    range: '≥ 16',       color: '#16a34a', bg: '#dcfce7' },
    { key: 'B',     label: t('mention.bien'),         range: '14 – 15,99', color: '#2563eb', bg: '#dbeafe' },
    { key: 'AB',    label: t('mention.assezBien'),    range: '12 – 13,99', color: '#7c3aed', bg: '#ede9fe' },
    { key: 'P',     label: t('mention.passable'),     range: '10 – 11,99', color: '#d97706', bg: '#fef9c3' },
    { key: 'Insuf', label: t('mention.insuffisant'),  range: '< 10',       color: '#dc2626', bg: '#fee2e2' },
  ];

  const { data: classes, isLoading: loadingClasses } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const canFetch = classId && termNumber && academicYear;

  const { data: stats, isLoading: loadingStats, isError } = useQuery({
    queryKey: ['class-stats', classId, academicYear, termNumber],
    queryFn: () => analyticsService.classStats(classId, academicYear, Number(termNumber)).then((r) => r.data),
    enabled: !!canFetch,
  });

  const selectedClass = classes?.find((c) => c.id === classId);

  // Compute bar widths for distribution
  const distTotal = stats?.totalStudents ?? 0;
  const distWidth = (n) => distTotal > 0 ? `${Math.round((n / distTotal) * 100)}%` : '0%';

  return (
    <AppShell title="Statistiques de classe">
      <PageHeader
        title="Fiche de statistiques"
        subtitle="Progression, écarts-types et distribution des moyennes de la classe"
      />

      {/* ── Filters ── */}
      <Card className="cstats-filters">
        <div className="cstats-filters__row">
          <div className="cstats-filters__field">
            <label className="cstats-filters__label">Classe</label>
            <select
              className="cstats-filters__select"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">— Choisir une classe —</option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.academicYear})</option>
              ))}
            </select>
          </div>

          <div className="cstats-filters__field">
            <label className="cstats-filters__label">Trimestre analysé</label>
            <select
              className="cstats-filters__select"
              value={termNumber}
              onChange={(e) => setTermNumber(e.target.value)}
            >
              <option value="">— Choisir —</option>
              <option value="1">1er trimestre</option>
              <option value="2">2e trimestre</option>
              <option value="3">3e trimestre</option>
            </select>
          </div>

          <div className="cstats-filters__field">
            <label className="cstats-filters__label">Année scolaire</label>
            <input
              className="cstats-filters__input"
              type="text"
              placeholder="ex: 2024-2025"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
          </div>
        </div>
        {termNumber === '1' && (
          <p className="cstats-filters__note">
            Note : au 1er trimestre, il n'y a pas de trimestre précédent — les comparaisons d'évolution ne seront pas disponibles.
          </p>
        )}
      </Card>

      {!canFetch && (
        <div className="cstats-empty">
          <div className="cstats-empty__icon">📊</div>
          <p>Sélectionnez une classe, un trimestre et une année scolaire pour afficher les statistiques.</p>
        </div>
      )}

      {canFetch && loadingStats && <Loading />}

      {canFetch && isError && (
        <div className="cstats-empty">
          <div className="cstats-empty__icon">⚠️</div>
          <p>Erreur lors du chargement des statistiques. Vérifiez les paramètres.</p>
        </div>
      )}

      {stats && (
        <>
          <div className="cstats-header-info">
            <span className="cstats-header-info__class">{selectedClass?.name ?? classId}</span>
            <span className="cstats-header-info__sep">·</span>
            <span>{TERM_LABELS[stats.termNumber] ?? `Trimestre ${stats.termNumber}`}</span>
            <span className="cstats-header-info__sep">·</span>
            <span>{stats.academicYear}</span>
          </div>

          {/* ── KPI row ── */}
          <div className="cstats-kpis">
            <Card className="cstats-kpi">
              <div className="cstats-kpi__value">{stats.totalStudents}</div>
              <div className="cstats-kpi__label">Élèves au total</div>
            </Card>
            <Card className="cstats-kpi cstats-kpi--pass" style={{ '--kpi-color': '#16a34a' }}>
              <div className="cstats-kpi__value">{stats.passingCount ?? 0}</div>
              <div className="cstats-kpi__label">Admis (≥ 10)</div>
              {stats.passingRate != null && (
                <div className="cstats-kpi__sub">{stats.passingRate}% de réussite</div>
              )}
            </Card>
            <Card className="cstats-kpi" style={{ '--kpi-color': '#dc2626' }}>
              <div className="cstats-kpi__value">{stats.distribution?.Insuf ?? 0}</div>
              <div className="cstats-kpi__label">En échec (&lt; 10)</div>
            </Card>
            {stats.noPreviousTerm > 0 && (
              <Card className="cstats-kpi cstats-kpi--muted">
                <div className="cstats-kpi__value">{stats.noPreviousTerm}</div>
                <div className="cstats-kpi__label">Sans données N-1</div>
              </Card>
            )}
          </div>

          {/* ── Statistical measures ── */}
          {stats.totalStudents > 0 && (
            <Card className="cstats-measures-card">
              <h3 className="cstats-section-title">Statistiques descriptives</h3>
              <div className="cstats-measures-grid">
                <StatMeasure label="Moyenne de classe"  value={stats.classAverage}  color="#2563eb" sub="Moyenne des moyennes générales" />
                <StatMeasure label="Médiane"            value={stats.classMedian}   color="#7c3aed" sub="Valeur centrale (50e percentile)" />
                <StatMeasure label="Écart-type (σ)"     value={stats.classStdDev}   color="#d97706" sub="Dispersion des résultats" />
                <StatMeasure label="Meilleure moyenne"  value={stats.classMax}      color="#16a34a" sub="Plus haute moyenne générale" />
                <StatMeasure label="Moyenne la plus basse" value={stats.classMin}   color="#dc2626" sub="Plus basse moyenne générale" />
                <StatMeasure
                  label="Étendue"
                  value={stats.classMax != null && stats.classMin != null ? Math.round((stats.classMax - stats.classMin) * 100) / 100 : null}
                  color="#6b7280"
                  sub="Différence max − min"
                />
              </div>

              {/* Écart-type interpretation */}
              {stats.classStdDev != null && (
                <div className={`cstats-stddev-hint ${stats.classStdDev < 2 ? 'homogeneous' : stats.classStdDev < 4 ? 'moderate' : 'heterogeneous'}`}>
                  {stats.classStdDev < 2
                    ? '✓ Classe très homogène — les résultats sont groupés autour de la moyenne.'
                    : stats.classStdDev < 4
                    ? '↔ Dispersion modérée — hétérogénéité normale pour une classe.'
                    : '⚠ Forte hétérogénéité — grands écarts entre élèves, accompagnement différencié recommandé.'}
                </div>
              )}
            </Card>
          )}

          {/* ── Grade distribution ── */}
          {stats.distribution && stats.totalStudents > 0 && (
            <Card className="cstats-dist-card">
              <h3 className="cstats-section-title">Répartition par mention</h3>
              <div className="cstats-dist-rows">
                {DIST_CONFIG.map(({ key, label, range, color, bg }) => {
                  const count = stats.distribution[key] ?? 0;
                  const pct = distTotal > 0 ? Math.round((count / distTotal) * 100) : 0;
                  return (
                    <div key={key} className="cstats-dist-row">
                      <div className="cstats-dist-row__label">
                        <span className="cstats-dist-row__mention" style={{ background: bg, color }}>
                          {label}
                        </span>
                        <span className="cstats-dist-row__range">{range}</span>
                      </div>
                      <div className="cstats-dist-row__bar-wrap">
                        <div
                          className="cstats-dist-row__bar"
                          style={{ width: distWidth(count), background: color }}
                        />
                      </div>
                      <div className="cstats-dist-row__count">
                        <strong>{count}</strong>
                        <span className="cstats-dist-row__pct">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── Progress / decline badges ── */}
          {stats.withPreviousTerm > 0 && (
            <Card className="cstats-badges-card">
              <h3 className="cstats-section-title">Évolution par rapport au trimestre précédent</h3>
              <div className="cstats-badges">
                <StatBadge label="En progression" count={stats.progressed.count} pct={stats.progressed.percentage} color="#22c55e" />
                <StatBadge label="En régression"  count={stats.declined.count}   pct={stats.declined.percentage}   color="#ef4444" />
                <StatBadge label="Stables"         count={stats.stable.count}     pct={stats.stable.percentage}     color="#9ca3af" />
              </div>
              <div className="cstats-bar-wrap">
                {stats.progressed.count > 0 && (
                  <div className="cstats-bar cstats-bar--up" style={{ width: `${stats.progressed.percentage}%` }} title={`Progression : ${stats.progressed.percentage}%`} />
                )}
                {stats.stable.count > 0 && (
                  <div className="cstats-bar cstats-bar--stable" style={{ width: `${stats.stable.percentage}%` }} title={`Stables : ${stats.stable.percentage}%`} />
                )}
                {stats.declined.count > 0 && (
                  <div className="cstats-bar cstats-bar--down" style={{ width: `${stats.declined.percentage}%` }} title={`Régression : ${stats.declined.percentage}%`} />
                )}
              </div>
            </Card>
          )}

          {/* ── Best / worst highlights ── */}
          <div className="cstats-highlights">
            <HighlightCard title="Plus forte progression" data={stats.bestProgress} icon="🏆" positive={true} />
            <HighlightCard title="Plus forte régression"  data={stats.worstDecline} icon="⚠️" positive={false} />
          </div>

          {stats.withPreviousTerm === 0 && termNumber !== '1' && (
            <div className="cstats-empty">
              <div className="cstats-empty__icon">📭</div>
              <p>Aucun bulletin publié pour ce trimestre, ou aucun bulletin du trimestre précédent disponible pour comparaison.</p>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

export default ClassStatsPage;
