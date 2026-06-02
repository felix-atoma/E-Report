import { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { mockExamsService } from '../../services/mockExamsService';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const TYPE_LABELS = {
  BLANC: 'Examen Blanc',
  CEPE:  'C.E.P.E Blanc',
  BEPC:  'B.E.P.C Blanc',
  BAC1:  'Baccalauréat — 1re Partie',
  BAC2:  'Baccalauréat — 2e Partie',
};

function apprec(avg) {
  if (avg == null) return '—';
  if (avg >= 16) return 'Très Bien';
  if (avg >= 14) return 'Bien';
  if (avg >= 12) return 'Assez Bien';
  if (avg >= 10) return 'Passable';
  return 'Insuffisant';
}

function scoreColor(n) {
  if (n == null) return '#94a3b8';
  if (n >= 14) return '#15803d';
  if (n >= 10) return '#1d4ed8';
  return '#dc2626';
}

function StudentCard({ student, subjects, exam, colors }) {
  const gradeMap = new Map((student.grades ?? []).map((g) => [g.subjectId, g]));
  const totalCoeff = subjects.reduce((s, subj) => s + (subj.coefficient ?? 1), 0);
  let totalPts = 0, filledCoeff = 0;
  subjects.forEach((subj) => {
    const g = gradeMap.get(subj.id);
    if (g?.score != null) {
      totalPts += g.score * (subj.coefficient ?? 1);
      filledCoeff += (subj.coefficient ?? 1);
    }
  });
  const avg = filledCoeff > 0 ? totalPts / filledCoeff : null;
  const avgColor = scoreColor(avg);
  const isAdmis = avg != null && avg >= 10;

  return (
    <View style={[styles.card, { backgroundColor: colors.bg }]}>
      {/* Student identity */}
      <View style={[styles.cardHeader, { backgroundColor: colors.primary }]}>
        <View style={styles.identityRow}>
          <View style={styles.identityAvatar}>
            <Text style={styles.identityInitial}>
              {(student.studentName ?? '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.identityInfo}>
            <Text style={styles.identityName}>{student.studentName ?? '—'}</Text>
            <Text style={styles.identityMeta}>
              N° {student.admissionNumber ?? '—'} · {exam.class?.name ?? '—'}
            </Text>
          </View>
          <View style={[styles.resultPill, {
            backgroundColor: isAdmis ? '#10b98130' : '#ef444430',
          }]}>
            <Text style={[styles.resultText, { color: isAdmis ? '#6ee7b7' : '#fca5a5' }]}>
              {isAdmis ? 'ADMIS' : 'AJOURNÉ'}
            </Text>
          </View>
        </View>
      </View>

      {/* Average */}
      <View style={styles.avgRow}>
        <View style={styles.avgBox}>
          <Text style={[styles.avgNum, { color: avgColor }]}>
            {avg != null ? avg.toFixed(2).replace('.', ',') : '—'}
          </Text>
          <Text style={[styles.avgSub, { color: colors.textMuted }]}>/ 20</Text>
        </View>
        <Text style={[styles.avgMention, { color: avgColor }]}>{apprec(avg)}</Text>
        <Text style={[styles.avgCoeff, { color: colors.textMuted }]}>
          {totalPts.toFixed(2)} pts / {filledCoeff} coef
        </Text>
      </View>

      {/* Grades table */}
      <View style={[styles.tableHead, { backgroundColor: colors.bgMuted }]}>
        <Text style={[styles.colSubj, styles.headCell, { color: colors.textMuted }]}>Matière</Text>
        <Text style={[styles.colCoef, styles.headCell, { color: colors.textMuted }]}>Coef</Text>
        <Text style={[styles.colScore, styles.headCell, { color: colors.textMuted }]}>Note</Text>
        <Text style={[styles.colPts, styles.headCell, { color: colors.textMuted }]}>Pts</Text>
      </View>
      {subjects.map((subj, i) => {
        const g = gradeMap.get(subj.id);
        const score = g?.score;
        const pts = score != null ? (score * (subj.coefficient ?? 1)).toFixed(2) : '—';
        return (
          <View key={subj.id} style={[
            styles.tableRow, { borderTopColor: colors.border },
            i % 2 !== 0 ? { backgroundColor: colors.bgSubtle } : {},
          ]}>
            <Text style={[styles.colSubj, styles.cell, { color: colors.text }]} numberOfLines={1}>
              {subj.name ?? subj.nameFr ?? '—'}
            </Text>
            <Text style={[styles.colCoef, styles.cell, { color: colors.textMuted }]}>
              {subj.coefficient ?? 1}
            </Text>
            <Text style={[styles.colScore, styles.cell, {
              color: score != null ? scoreColor(score) : colors.textMuted,
              fontWeight: fontWeight.semibold,
            }]}>
              {score != null ? score.toFixed(2).replace('.', ',') : '—'}
            </Text>
            <Text style={[styles.colPts, styles.cell, { color: colors.text }]}>{pts}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function MockExamReleveScreen({ route }) {
  const { examId, examLabel } = route.params;
  const { colors } = useTheme();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);  // single student filter

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await mockExamsService.getReleve(examId);
        setData(res.data.data ?? null);
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
        <Ionicons name="document-outline" size={48} color={colors.border} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Aucun relevé disponible. Saisissez d'abord les notes.
        </Text>
      </View>
    );
  }

  const exam     = data.exam ?? {};
  const subjects = data.subjects ?? [];
  const students = data.students ?? [];
  const visible  = selected ? students.filter((s) => s.studentId === selected) : students;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      {/* Exam info bar */}
      <View style={[styles.infoBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <View style={styles.infoBarLeft}>
          <Text style={[styles.infoBarTitle, { color: colors.text }]}>{exam.label ?? examLabel}</Text>
          <Text style={[styles.infoBarMeta, { color: colors.textMuted }]}>
            {TYPE_LABELS[exam.examType] ?? exam.examType} · {exam.class?.name ?? '—'}
          </Text>
        </View>
        <Text style={[styles.infoBarCount, { color: colors.textMuted }]}>
          {students.length} élève{students.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Student picker chips */}
      <FlatList
        horizontal
        data={[{ studentId: null, studentName: 'Tous' }, ...students]}
        keyExtractor={(s) => s.studentId ?? 'all'}
        style={[styles.pickerBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.pickerContent}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const active = selected === item.studentId;
          return (
            <TouchableOpacity
              onPress={() => setSelected(item.studentId)}
              style={[styles.pickerChip, {
                backgroundColor: active ? colors.primary : colors.bgMuted,
                borderColor: active ? colors.primary : colors.border,
              }]}
            >
              <Text style={[styles.pickerText, { color: active ? '#fff' : colors.textMuted }]}>
                {item.studentId ? (item.studentName ?? item.admissionNumber ?? '—') : 'Tous'}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Cards */}
      <ScrollView contentContainerStyle={styles.scroll}>
        {visible.map((student) => (
          <StudentCard
            key={student.studentId}
            student={student}
            subjects={subjects}
            exam={exam}
            colors={colors}
          />
        ))}
        {visible.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucun résultat.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center' },
  emptyBox: { padding: spacing.xl, alignItems: 'center' },
  infoBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, borderBottomWidth: 1, gap: spacing.md,
  },
  infoBarLeft:  { flex: 1 },
  infoBarTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  infoBarMeta:  { fontSize: fontSize.xs, marginTop: 2 },
  infoBarCount: { fontSize: fontSize.xs },
  pickerBar:    { maxHeight: 46, borderBottomWidth: 1 },
  pickerContent:{ paddingHorizontal: spacing.md, gap: spacing.sm, alignItems: 'center' },
  pickerChip: {
    paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md,
    borderRadius: radius.full, borderWidth: 1.5,
  },
  pickerText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  scroll: { padding: spacing.md, gap: spacing.md },
  card: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.sm },
  cardHeader: { padding: spacing.md },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  identityInitial: { color: '#fff', fontWeight: fontWeight.bold, fontSize: fontSize.md },
  identityInfo: { flex: 1 },
  identityName: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  identityMeta: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.xs, marginTop: 1 },
  resultPill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  resultText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  avgRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  avgBox:    { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  avgNum:    { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
  avgSub:    { fontSize: fontSize.sm },
  avgMention:{ flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  avgCoeff:  { fontSize: fontSize.xs },
  tableHead: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  tableRow:  { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderTopWidth: 1 },
  headCell:  { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  cell:      { fontSize: fontSize.sm },
  colSubj:   { flex: 3 },
  colCoef:   { flex: 1, textAlign: 'center' },
  colScore:  { flex: 1, textAlign: 'center' },
  colPts:    { flex: 1, textAlign: 'right' },
});
