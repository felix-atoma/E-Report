import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { mockExamsService } from '../../services/mockExamsService';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

function result(avg, examType) {
  if (avg >= 10) return { label: 'ADMIS',       color: '#10b981' };
  if (examType?.startsWith('BAC') && avg >= 9) return { label: 'ADMISSIBLE', color: '#f59e0b' };
  return { label: 'AJOURNÉ', color: '#ef4444' };
}

function scoreColor(n) {
  if (n >= 16) return '#15803d';
  if (n >= 14) return '#1d4ed8';
  if (n >= 10) return '#d97706';
  return '#dc2626';
}

export default function MockExamPalmaresScreen({ route }) {
  const { examId } = route.params;
  const { colors } = useTheme();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await mockExamsService.getPalmares(examId);
        setData(res.data.data);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [examId]));

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <Text style={{ color: colors.textMuted }}>Aucune donnée disponible.</Text>
      </View>
    );
  }

  const students = data.students ?? [];
  const subjects  = data.subjects ?? [];
  const admis     = students.filter((s) => (s.average ?? 0) >= 10).length;
  const examType  = data.exam?.examType ?? '';

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.headerSchool}>{data.institution?.name ?? ''}</Text>
          <Text style={styles.headerExam}>{data.exam?.label ?? 'Palmares'}</Text>
          <Text style={styles.headerType}>{examType}</Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          {[
            { num: students.length, label: 'Candidats',  color: colors.primary },
            { num: admis,           label: 'Admis',      color: '#10b981' },
            { num: students.length - admis, label: 'Ajournés', color: '#ef4444' },
          ].map((s) => (
            <View key={s.label} style={[styles.summaryCard, { backgroundColor: colors.bg }]}>
              <Text style={[styles.summaryNum, { color: s.color }]}>{s.num}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Results table — scrollable horizontally */}
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            {/* Table header */}
            <View style={[styles.tableHead, { backgroundColor: colors.bgMuted }]}>
              <Text style={[styles.colRank, styles.headCell, { color: colors.textMuted }]}>Rang</Text>
              <Text style={[styles.colName, styles.headCell, { color: colors.textMuted }]}>Élève</Text>
              {subjects.map((s) => (
                <Text key={s.id} style={[styles.colSub, styles.headCell, { color: colors.textMuted }]} numberOfLines={2}>
                  {(s.name ?? s.nameFr ?? '—').slice(0, 8)}
                </Text>
              ))}
              <Text style={[styles.colAvg, styles.headCell, { color: colors.textMuted }]}>Moy.</Text>
              <Text style={[styles.colResult, styles.headCell, { color: colors.textMuted }]}>Résultat</Text>
            </View>

            {/* Rows */}
            {students.map((s, i) => {
              const res  = result(s.average ?? 0, examType);
              const rank = s.rank ?? i + 1;
              return (
                <View key={s.studentId ?? i}
                  style={[styles.tableRow, { borderTopColor: colors.border },
                    i % 2 !== 0 ? { backgroundColor: colors.bgSubtle } : { backgroundColor: colors.bg }]}
                >
                  <Text style={[styles.colRank, styles.cell, { color: colors.textMuted }]}>{rank}</Text>
                  <Text style={[styles.colName, styles.cell, { color: colors.text }]} numberOfLines={1}>
                    {s.student?.user?.name ?? s.student?.admissionNumber ?? '—'}
                  </Text>
                  {subjects.map((sub) => {
                    const grade = (s.grades ?? []).find((g) => g.subjectId === sub.id);
                    const score = grade?.score;
                    return (
                      <Text key={sub.id} style={[styles.colSub, styles.cell, {
                        color: score != null ? scoreColor(score) : colors.textMuted,
                        fontWeight: fontWeight.semibold,
                      }]}>
                        {score?.toFixed(1) ?? '—'}
                      </Text>
                    );
                  })}
                  <Text style={[styles.colAvg, styles.cell, {
                    color: s.average != null ? scoreColor(s.average) : colors.textMuted,
                    fontWeight: fontWeight.bold,
                  }]}>
                    {s.average?.toFixed(2) ?? '—'}
                  </Text>
                  <View style={[styles.colResult, { alignItems: 'center' }]}>
                    <View style={[styles.resultPill, { backgroundColor: res.color + '20' }]}>
                      <Text style={[styles.resultText, { color: res.color }]}>{res.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg },
  header: { borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md },
  headerSchool: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.xs },
  headerExam:   { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'center', marginTop: 4 },
  headerType:   { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.sm, marginTop: 4 },
  summaryRow:   { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard:  { flex: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  summaryNum:   { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  summaryLabel: { fontSize: fontSize.xs, marginTop: 2 },
  tableHead: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  tableRow:  { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderTopWidth: 1 },
  headCell:  { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textAlign: 'center' },
  cell:      { fontSize: fontSize.xs, textAlign: 'center' },
  colRank:   { width: 36 },
  colName:   { width: 110 },
  colSub:    { width: 48 },
  colAvg:    { width: 48 },
  colResult: { width: 76 },
  resultPill:{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  resultText:{ fontSize: 9, fontWeight: fontWeight.bold },
});
