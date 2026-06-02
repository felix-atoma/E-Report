import { useCallback, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { analyticsService } from '../../services/analyticsService';
import Card from '../../components/common/Card';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const TERMS = [
  { n: 1, label: 'T1' },
  { n: 2, label: 'T2' },
  { n: 3, label: 'T3' },
];

const DIST_CONFIG = [
  { key: 'TB',    label: 'Très Bien',   range: '≥ 16',        color: '#16a34a' },
  { key: 'B',     label: 'Bien',        range: '14 – 15,99',  color: '#2563eb' },
  { key: 'AB',    label: 'Assez Bien',  range: '12 – 13,99',  color: '#7c3aed' },
  { key: 'P',     label: 'Passable',    range: '10 – 11,99',  color: '#d97706' },
  { key: 'Insuf', label: 'Insuffisant', range: '< 10',        color: '#dc2626' },
];

function currentAcademicYear() {
  const m = new Date().getMonth(), y = new Date().getFullYear();
  return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function KpiCard({ num, label, color, colors }) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.bg }]}>
      <Text style={[styles.kpiNum, { color: color ?? colors.primary }]}>{num ?? '—'}</Text>
      <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function MeasureRow({ label, value, color, colors }) {
  const display = value != null
    ? (typeof value === 'number' ? value.toFixed(2).replace('.', ',') : value)
    : '—';
  return (
    <View style={[styles.measureRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.measureLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.measureValue, { color: color ?? colors.text }]}>{display}</Text>
    </View>
  );
}

export default function ClassStatsScreen({ route }) {
  const { classId, className } = route.params;
  const { colors } = useTheme();
  const [termNum, setTermNum]     = useState(2);
  const [academicYear]            = useState(currentAcademicYear());
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [notFound, setNotFound]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await analyticsService.classStats(classId, academicYear, termNum);
      setStats(res.data.data ?? null);
    } catch {
      setStats(null);
      setNotFound(true);
    } finally { setLoading(false); }
  }, [classId, academicYear, termNum]);

  useFocusEffect(load);

  const distTotal = stats?.totalStudents ?? 0;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      {/* Term selector */}
      <View style={[styles.termBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        {TERMS.map((t) => (
          <TouchableOpacity key={t.n} onPress={() => setTermNum(t.n)}
            style={[styles.termBtn, {
              backgroundColor: termNum === t.n ? colors.primary : colors.bgMuted,
              borderColor: termNum === t.n ? colors.primary : colors.border,
            }]}>
            <Text style={[styles.termBtnText, { color: termNum === t.n ? '#fff' : colors.textMuted }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={[styles.yearLabel, { color: colors.textMuted }]}>{academicYear}</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : notFound || !stats ? (
        <View style={styles.center}>
          <Ionicons name="bar-chart-outline" size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aucune statistique disponible pour ce trimestre.
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            Les bulletins doivent être publiés pour générer des statistiques.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* KPIs */}
          <View style={styles.kpiRow}>
            <KpiCard num={stats.totalStudents} label="Élèves" color={colors.primary} colors={colors} />
            <KpiCard num={stats.passingCount} label={`Admis (${stats.passingRate ?? 0}%)`} color="#10b981" colors={colors} />
            <KpiCard num={stats.distribution?.Insuf ?? 0} label="En échec" color="#ef4444" colors={colors} />
          </View>

          {/* Descriptive stats */}
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Statistiques descriptives</Text>
            <MeasureRow label="Moyenne de classe"  value={stats.classAverage}  color="#2563eb" colors={colors} />
            <MeasureRow label="Médiane"            value={stats.classMedian}   color="#7c3aed" colors={colors} />
            <MeasureRow label="Écart-type (σ)"     value={stats.classStdDev}   color="#d97706" colors={colors} />
            <MeasureRow label="Meilleure moyenne"  value={stats.classMax}      color="#10b981" colors={colors} />
            <MeasureRow label="Moyenne la plus basse" value={stats.classMin}   color="#ef4444" colors={colors} />

            {stats.classStdDev != null && (
              <View style={[styles.stddevHint, {
                backgroundColor: stats.classStdDev < 2 ? '#dcfce7'
                  : stats.classStdDev < 4 ? '#fef9c3'
                  : '#fee2e2',
              }]}>
                <Text style={[styles.stddevText, {
                  color: stats.classStdDev < 2 ? '#16a34a'
                    : stats.classStdDev < 4 ? '#d97706'
                    : '#dc2626',
                }]}>
                  {stats.classStdDev < 2
                    ? '✓ Classe très homogène — résultats groupés autour de la moyenne.'
                    : stats.classStdDev < 4
                    ? '↔ Dispersion modérée — hétérogénéité normale.'
                    : '⚠ Forte hétérogénéité — grands écarts entre élèves.'}
                </Text>
              </View>
            )}
          </Card>

          {/* Grade distribution */}
          {stats.distribution && (
            <Card>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Répartition par mention</Text>
              {DIST_CONFIG.map(({ key, label, range, color }) => {
                const count = stats.distribution[key] ?? 0;
                const pct = distTotal > 0 ? Math.round((count / distTotal) * 100) : 0;
                const barW = `${pct}%`;
                return (
                  <View key={key} style={styles.distRow}>
                    <View style={styles.distLabel}>
                      <Text style={[styles.distMention, { color }]}>{label}</Text>
                      <Text style={[styles.distRange, { color: colors.textMuted }]}>{range}</Text>
                    </View>
                    <View style={[styles.distBarTrack, { backgroundColor: colors.bgMuted }]}>
                      <View style={[styles.distBarFill, { width: barW, backgroundColor: color }]} />
                    </View>
                    <View style={styles.distCount}>
                      <Text style={[styles.distCountNum, { color }]}>{count}</Text>
                      <Text style={[styles.distCountPct, { color: colors.textMuted }]}>{pct}%</Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          )}

          {/* Progression */}
          {stats.withPreviousTerm > 0 && (
            <Card>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Évolution vs trimestre précédent ({stats.withPreviousTerm} élèves)
              </Text>
              <View style={styles.progRow}>
                {[
                  { label: 'Progression', count: stats.progressed?.count, pct: stats.progressed?.percentage, color: '#22c55e' },
                  { label: 'Régression',  count: stats.declined?.count,   pct: stats.declined?.percentage,   color: '#ef4444' },
                  { label: 'Stables',     count: stats.stable?.count,     pct: stats.stable?.percentage,     color: '#9ca3af' },
                ].map((p) => (
                  <View key={p.label} style={[styles.progCard, { backgroundColor: p.color + '12' }]}>
                    <Text style={[styles.progNum, { color: p.color }]}>{p.count ?? 0}</Text>
                    <Text style={[styles.progPct, { color: p.color }]}>{p.pct ?? 0}%</Text>
                    <Text style={[styles.progLabel, { color: colors.textMuted }]}>{p.label}</Text>
                  </View>
                ))}
              </View>

              {/* Progress bar */}
              <View style={[styles.progBar, { backgroundColor: colors.bgMuted }]}>
                {(stats.progressed?.percentage ?? 0) > 0 && (
                  <View style={[styles.progBarSeg, { width: `${stats.progressed.percentage}%`, backgroundColor: '#22c55e' }]} />
                )}
                {(stats.stable?.percentage ?? 0) > 0 && (
                  <View style={[styles.progBarSeg, { width: `${stats.stable.percentage}%`, backgroundColor: '#9ca3af' }]} />
                )}
                {(stats.declined?.percentage ?? 0) > 0 && (
                  <View style={[styles.progBarSeg, { width: `${stats.declined.percentage}%`, backgroundColor: '#ef4444' }]} />
                )}
              </View>
            </Card>
          )}

          {/* Best/worst highlights */}
          {(stats.bestProgress || stats.worstDecline) && (
            <Card>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Points de repère</Text>
              {stats.bestProgress && (
                <View style={[styles.highlightRow, { borderBottomColor: colors.border }]}>
                  <Text style={styles.highlightIcon}>🏆</Text>
                  <View style={styles.highlightBody}>
                    <Text style={[styles.highlightTitle, { color: colors.textMuted }]}>Plus forte progression</Text>
                    <Text style={[styles.highlightName, { color: colors.text }]}>{stats.bestProgress.studentName}</Text>
                    <Text style={[styles.highlightDelta, { color: '#22c55e' }]}>
                      {stats.bestProgress.previousAvg?.toFixed(2).replace('.', ',')} → {stats.bestProgress.currentAvg?.toFixed(2).replace('.', ',')} (+{stats.bestProgress.delta?.toFixed(2).replace('.', ',')})
                    </Text>
                  </View>
                </View>
              )}
              {stats.worstDecline && (
                <View style={styles.highlightRow}>
                  <Text style={styles.highlightIcon}>⚠️</Text>
                  <View style={styles.highlightBody}>
                    <Text style={[styles.highlightTitle, { color: colors.textMuted }]}>Plus forte régression</Text>
                    <Text style={[styles.highlightName, { color: colors.text }]}>{stats.worstDecline.studentName}</Text>
                    <Text style={[styles.highlightDelta, { color: '#ef4444' }]}>
                      {stats.worstDecline.previousAvg?.toFixed(2).replace('.', ',')} → {stats.worstDecline.currentAvg?.toFixed(2).replace('.', ',')} ({stats.worstDecline.delta?.toFixed(2).replace('.', ',')})
                    </Text>
                  </View>
                </View>
              )}
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center', fontWeight: fontWeight.medium },
  emptyHint: { fontSize: fontSize.xs, textAlign: 'center', marginTop: -spacing.xs },
  termBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderBottomWidth: 1,
  },
  termBtn: {
    paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md,
    borderRadius: radius.full, borderWidth: 1.5,
  },
  termBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  yearLabel: { marginLeft: 'auto', fontSize: fontSize.xs },
  scroll: { padding: spacing.lg },
  kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  kpiCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  kpiNum:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  kpiLabel:{ fontSize: fontSize.xs, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.md },
  measureRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1,
  },
  measureLabel: { fontSize: fontSize.sm, flex: 1 },
  measureValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  stddevHint: { borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  stddevText: { fontSize: fontSize.xs, lineHeight: 18 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  distLabel: { width: 100 },
  distMention: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  distRange:   { fontSize: 9, marginTop: 1 },
  distBarTrack: { flex: 1, height: 10, borderRadius: radius.full, overflow: 'hidden' },
  distBarFill:  { height: 10, borderRadius: radius.full },
  distCount: { width: 44, alignItems: 'flex-end' },
  distCountNum: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  distCountPct: { fontSize: 9 },
  progRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  progCard: { flex: 1, borderRadius: radius.lg, padding: spacing.sm, alignItems: 'center', gap: 2 },
  progNum:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  progPct:  { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  progLabel:{ fontSize: fontSize.xs, textAlign: 'center' },
  progBar:  { height: 12, borderRadius: radius.full, flexDirection: 'row', overflow: 'hidden', marginTop: spacing.xs },
  progBarSeg: { height: 12 },
  highlightRow: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start',
    paddingVertical: spacing.md, borderBottomWidth: 1,
  },
  highlightIcon:  { fontSize: 20 },
  highlightBody:  { flex: 1 },
  highlightTitle: { fontSize: fontSize.xs },
  highlightName:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: 2 },
  highlightDelta: { fontSize: fontSize.xs, marginTop: 2, fontWeight: fontWeight.medium },
});
