import { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { reportsService } from '../../services/reportsService';
import Card from '../../components/common/Card';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const SCREEN_W = Dimensions.get('window').width;

function mention(avg) {
  if (avg >= 18) return 'Excellent';
  if (avg >= 16) return 'Très Bien';
  if (avg >= 14) return 'Bien';
  if (avg >= 12) return 'Assez Bien';
  if (avg >= 10) return 'Passable';
  return 'Insuffisant';
}

function scoreColor(avg) {
  if (avg >= 14) return '#10b981';
  if (avg >= 10) return '#3b82f6';
  return '#ef4444';
}

function BarChart({ data, colors }) {
  if (!data.length) return null;
  const maxVal = 20;
  const barW = Math.min(60, (SCREEN_W - spacing.lg * 2 - 32) / data.length - 8);

  return (
    <View style={styles.chartContainer}>
      {/* Y axis labels */}
      {[20, 15, 10, 5, 0].map((v) => (
        <View key={v} style={[styles.gridLine, { top: `${(1 - v / maxVal) * 100}%`, borderTopColor: colors.border }]}>
          <Text style={[styles.yLabel, { color: colors.textMuted }]}>{v}</Text>
        </View>
      ))}

      {/* Pass mark line */}
      <View style={[styles.passLine, { top: '50%', borderTopColor: '#10b981' }]} />

      {/* Bars */}
      <View style={styles.barsRow}>
        {data.map((d, i) => {
          const h = `${(d.avg / maxVal) * 100}%`;
          const color = scoreColor(d.avg);
          return (
            <View key={i} style={styles.barGroup}>
              <Text style={[styles.barValue, { color }]}>{d.avg.toFixed(1)}</Text>
              <View style={[styles.barTrack, { backgroundColor: colors.bgMuted }]}>
                <View style={[styles.barFill, { height: h, backgroundColor: color, width: barW }]} />
              </View>
              <Text style={[styles.barLabel, { color: colors.textMuted }]} numberOfLines={2}>
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const { colors } = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await reportsService.getAll();
        const published = (res.data.data ?? [])
          .filter((r) => r.status === 'PUBLISHED' && r.overallAverage != null)
          .sort((a, b) => {
            if (a.academicYear !== b.academicYear) return a.academicYear.localeCompare(b.academicYear);
            return (a.termNumber ?? 0) - (b.termNumber ?? 0);
          });
        setReports(published);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, []));

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (reports.length === 0) {
    return (
      <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
        <View style={styles.center}>
          <Ionicons name="trending-up-outline" size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aucun bulletin publié pour afficher la progression.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const avg    = reports.reduce((s, r) => s + r.overallAverage, 0) / reports.length;
  const best   = Math.max(...reports.map((r) => r.overallAverage));
  const trend  = reports.length >= 2
    ? reports[reports.length - 1].overallAverage - reports[0].overallAverage
    : null;

  const chartData = reports.map((r) => ({
    label: r.termName ?? `T${r.termNumber}`,
    avg: r.overallAverage,
  }));

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* KPI cards */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: colors.bg }]}>
            <Text style={[styles.kpiNum, { color: colors.primary }]}>{avg.toFixed(2)}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Moy. générale</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.bg }]}>
            <Text style={[styles.kpiNum, { color: '#10b981' }]}>{best.toFixed(2)}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Meilleure moy.</Text>
          </View>
          {trend !== null && (
            <View style={[styles.kpiCard, { backgroundColor: colors.bg }]}>
              <Text style={[styles.kpiNum, { color: trend >= 0 ? '#10b981' : '#ef4444' }]}>
                {trend >= 0 ? '+' : ''}{trend.toFixed(2)}
              </Text>
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Évolution</Text>
            </View>
          )}
        </View>

        {/* Mention */}
        <View style={[styles.mentionCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.mentionLabel}>Mention globale</Text>
          <Text style={styles.mentionValue}>{mention(avg)}</Text>
        </View>

        {/* Bar chart */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Évolution des moyennes</Text>
          <BarChart data={chartData} colors={colors} />
        </Card>

        {/* Table */}
        <Card padded={false}>
          <Text style={[styles.sectionTitle, { color: colors.text, padding: spacing.md }]}>
            Détail par trimestre
          </Text>
          {reports.map((r, i) => (
            <View key={r.id} style={[
              styles.tableRow,
              { borderTopColor: colors.border },
              i === 0 ? { borderTopWidth: 0 } : {},
              i % 2 !== 0 ? { backgroundColor: colors.bgSubtle } : {},
            ]}>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowTerm, { color: colors.text }]}>{r.termName}</Text>
                <Text style={[styles.rowYear, { color: colors.textMuted }]}>{r.academicYear}</Text>
              </View>
              <Text style={[styles.rowAvg, { color: scoreColor(r.overallAverage) }]}>
                {r.overallAverage.toFixed(2)}/20
              </Text>
              <Text style={[styles.rowMention, { color: scoreColor(r.overallAverage) }]}>
                {mention(r.overallAverage)}
              </Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const CHART_H = 180;

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center' },
  scroll: { padding: spacing.lg },
  kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  kpiCard: { flex: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  kpiNum:  { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  kpiLabel:{ fontSize: fontSize.xs, marginTop: 2, textAlign: 'center' },
  mentionCard: {
    borderRadius: radius.lg, padding: spacing.lg,
    alignItems: 'center', marginBottom: spacing.md,
  },
  mentionLabel: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm },
  mentionValue: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginTop: 4 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.md },
  chartContainer: { height: CHART_H + 60, position: 'relative', marginTop: spacing.sm },
  gridLine: {
    position: 'absolute', left: 28, right: 0,
    borderTopWidth: 1, borderStyle: 'dashed',
  },
  yLabel: { position: 'absolute', left: -28, fontSize: 9, top: -8 },
  passLine: { position: 'absolute', left: 28, right: 0, borderTopWidth: 1.5 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: CHART_H, marginLeft: 28 },
  barGroup: { alignItems: 'center', gap: spacing.xs },
  barValue: { fontSize: 9, fontWeight: fontWeight.bold },
  barTrack: { height: CHART_H - 20, justifyContent: 'flex-end', borderRadius: radius.xs, overflow: 'hidden' },
  barFill:  { borderRadius: radius.xs },
  barLabel: { fontSize: 9, textAlign: 'center', maxWidth: 64, marginTop: 4 },
  tableRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderTopWidth: 1 },
  rowInfo:  { flex: 1 },
  rowTerm:  { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  rowYear:  { fontSize: fontSize.xs, marginTop: 2 },
  rowAvg:   { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginRight: spacing.md },
  rowMention:{ fontSize: fontSize.xs, width: 80, textAlign: 'right' },
});
