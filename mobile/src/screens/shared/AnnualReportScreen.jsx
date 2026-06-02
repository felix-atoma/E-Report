import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { reportsService } from '../../services/reportsService';
import Card from '../../components/common/Card';
import StatusPill from '../../components/common/StatusPill';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

function currentAcademicYear() {
  const m = new Date().getMonth();
  const y = new Date().getFullYear();
  return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function mention(avg) {
  if (avg >= 18) return 'Excellent';
  if (avg >= 16) return 'Très Bien';
  if (avg >= 14) return 'Bien';
  if (avg >= 12) return 'Assez Bien';
  if (avg >= 10) return 'Passable';
  return 'Insuffisant';
}

function scoreColor(avg, colors) {
  if (avg >= 14) return '#10b981';
  if (avg >= 10) return '#3b82f6';
  return '#ef4444';
}

export default function AnnualReportScreen({ route }) {
  const { studentId, studentName } = route.params ?? {};
  const { colors } = useTheme();

  const allYears = [currentAcademicYear()];
  const prevYear = (() => { const [a] = currentAcademicYear().split('-'); return `${Number(a)-1}-${a}`; })();
  const years = [currentAcademicYear(), prevYear];

  const [selectedYear, setSelectedYear] = useState(currentAcademicYear());
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await reportsService.getAnnualReport(studentId, selectedYear);
        setData(res.data.data ?? null);
      } catch {
        setError(true);
        setData(null);
      }
      finally { setLoading(false); }
    })();
  }, [studentId, selectedYear]));

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      {/* Year selector */}
      <View style={[styles.yearBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        {years.map((y) => (
          <TouchableOpacity key={y} onPress={() => setSelectedYear(y)}
            style={[styles.yearChip, {
              backgroundColor: selectedYear === y ? colors.primary : colors.bgMuted,
              borderColor: selectedYear === y ? colors.primary : colors.border,
            }]}>
            <Text style={[styles.yearChipText, { color: selectedYear === y ? '#fff' : colors.text }]}>{y}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error || !data ? (
        <View style={styles.center}>
          <Ionicons name="document-outline" size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aucun rapport annuel disponible pour {selectedYear}.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <Text style={styles.headerSchool}>{data.institution?.name ?? 'Établissement'}</Text>
            <Text style={styles.headerTitle}>Rapport Annuel — {selectedYear}</Text>
            <Text style={styles.headerStudent}>{data.student?.name ?? studentName}</Text>
            {data.class?.name && (
              <Text style={styles.headerClass}>{data.class.name}</Text>
            )}
          </View>

          {/* Annual average + decision */}
          {data.annualAverage != null && (
            <Card style={styles.avgCard}>
              <View style={styles.avgRow}>
                <View>
                  <Text style={[styles.avgLabel, { color: colors.textMuted }]}>Moyenne annuelle</Text>
                  <Text style={[styles.avgValue, { color: scoreColor(data.annualAverage, colors) }]}>
                    {data.annualAverage.toFixed(2)}/20
                  </Text>
                  <Text style={[styles.avgMention, { color: scoreColor(data.annualAverage, colors) }]}>
                    {mention(data.annualAverage)}
                  </Text>
                </View>
                {data.councilDecision && (
                  <View style={[styles.decisionBadge, { backgroundColor: '#10b98120' }]}>
                    <Text style={[styles.decisionText, { color: '#10b981' }]}>{data.councilDecision}</Text>
                  </View>
                )}
              </View>
            </Card>
          )}

          {/* Terms summary */}
          {data.terms?.length > 0 && (
            <Card padded={false}>
              <Text style={[styles.sectionTitle, { color: colors.text, padding: spacing.md }]}>
                Résultats par trimestre
              </Text>
              <View style={[styles.tableHead, { backgroundColor: colors.bgMuted }]}>
                <Text style={[styles.colTerm,  styles.headCell, { color: colors.textMuted }]}>Période</Text>
                <Text style={[styles.colAvg,   styles.headCell, { color: colors.textMuted }]}>Moy.</Text>
                <Text style={[styles.colRank,  styles.headCell, { color: colors.textMuted }]}>Rang</Text>
                <Text style={[styles.colMen,   styles.headCell, { color: colors.textMuted }]}>Mention</Text>
              </View>
              {data.terms.map((t, i) => (
                <View key={i} style={[
                  styles.tableRow, { borderTopColor: colors.border },
                  i % 2 !== 0 ? { backgroundColor: colors.bgSubtle } : {},
                ]}>
                  <Text style={[styles.colTerm, styles.cell, { color: colors.text }]}>{t.termName}</Text>
                  <Text style={[styles.colAvg, styles.cell, {
                    color: t.average != null ? scoreColor(t.average, colors) : colors.textMuted,
                    fontWeight: fontWeight.bold,
                  }]}>
                    {t.average?.toFixed(2) ?? '—'}
                  </Text>
                  <Text style={[styles.colRank, styles.cell, { color: colors.textMuted }]}>
                    {t.classRank ? `${t.classRank}/${t.classSize}` : '—'}
                  </Text>
                  <Text style={[styles.colMen, styles.cell, {
                    color: t.average != null ? scoreColor(t.average, colors) : colors.textMuted,
                  }]}>
                    {t.average != null ? mention(t.average) : '—'}
                  </Text>
                </View>
              ))}
            </Card>
          )}

          {/* Subjects breakdown */}
          {data.subjects?.length > 0 && (
            <Card padded={false}>
              <Text style={[styles.sectionTitle, { color: colors.text, padding: spacing.md }]}>
                Résultats par matière
              </Text>
              <View style={[styles.tableHead, { backgroundColor: colors.bgMuted }]}>
                <Text style={[styles.colSubj,  styles.headCell, { color: colors.textMuted }]}>Matière</Text>
                <Text style={[styles.colAvg,   styles.headCell, { color: colors.textMuted }]}>Moy.</Text>
                <Text style={[styles.colCoef,  styles.headCell, { color: colors.textMuted }]}>Coef</Text>
              </View>
              {data.subjects.map((s, i) => (
                <View key={i} style={[
                  styles.tableRow, { borderTopColor: colors.border },
                  i % 2 !== 0 ? { backgroundColor: colors.bgSubtle } : {},
                ]}>
                  <Text style={[styles.colSubj, styles.cell, { color: colors.text }]} numberOfLines={1}>
                    {s.nameFr ?? s.name}
                  </Text>
                  <Text style={[styles.colAvg, styles.cell, {
                    color: s.annualAverage != null ? scoreColor(s.annualAverage, colors) : colors.textMuted,
                    fontWeight: fontWeight.semibold,
                  }]}>
                    {s.annualAverage?.toFixed(2) ?? '—'}
                  </Text>
                  <Text style={[styles.colCoef, styles.cell, { color: colors.textMuted }]}>
                    {s.coefficient ?? '—'}
                  </Text>
                </View>
              ))}
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
  emptyText: { fontSize: fontSize.sm, textAlign: 'center' },
  yearBar: {
    flexDirection: 'row', gap: spacing.sm,
    padding: spacing.md, borderBottomWidth: 1,
  },
  yearChip: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.full,
    borderWidth: 1.5, alignItems: 'center',
  },
  yearChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  scroll: { padding: spacing.lg },
  header: {
    borderRadius: radius.lg, padding: spacing.xl,
    alignItems: 'center', marginBottom: spacing.md,
  },
  headerSchool:  { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.xs, marginBottom: 4 },
  headerTitle:   { color: '#fff', fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  headerStudent: { color: 'rgba(255,255,255,0.9)', fontSize: fontSize.md, marginTop: spacing.sm },
  headerClass:   { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.sm, marginTop: 2 },
  avgCard: { marginBottom: spacing.md },
  avgRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avgLabel:  { fontSize: fontSize.xs, marginBottom: 4 },
  avgValue:  { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
  avgMention:{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginTop: 4 },
  decisionBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg },
  decisionText:  { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  tableHead: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  tableRow:  { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderTopWidth: 1 },
  headCell: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  cell:     { fontSize: fontSize.sm },
  colTerm:  { flex: 2 },
  colSubj:  { flex: 3 },
  colAvg:   { flex: 1, textAlign: 'center' },
  colRank:  { flex: 1.5, textAlign: 'center' },
  colMen:   { flex: 2, textAlign: 'right' },
  colCoef:  { flex: 1, textAlign: 'center' },
});
