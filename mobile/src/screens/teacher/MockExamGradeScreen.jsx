import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { mockExamsService } from '../../services/mockExamsService';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

function avg(grades, subjects) {
  let ws = 0, wt = 0;
  subjects.forEach((s) => {
    const score = parseFloat(grades[s.id]);
    if (!isNaN(score)) { ws += score * s.coefficient; wt += s.coefficient; }
  });
  return wt > 0 ? (ws / wt).toFixed(2) : null;
}

function scoreColor(n) {
  if (n >= 16) return '#15803d';
  if (n >= 14) return '#1d4ed8';
  if (n >= 10) return '#d97706';
  return '#dc2626';
}

export default function MockExamGradeScreen({ route, navigation }) {
  const { examId } = route.params;
  const { colors } = useTheme();
  const [sheet, setSheet]   = useState(null);
  const [grades, setGrades] = useState({});   // { studentId: { subjectId: value } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const inputRefs = useRef({});

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await mockExamsService.getGradeSheet(examId);
        const data = res.data.data;
        setSheet(data);
        const initial = {};
        (data?.students ?? []).forEach((s) => {
          initial[s.studentId] = {};
          (s.grades ?? []).forEach((g) => {
            if (g.score != null) initial[s.studentId][g.subjectId] = String(g.score);
          });
        });
        setGrades(initial);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [examId]));

  function setScore(studentId, subjectId, val) {
    setGrades((p) => ({
      ...p,
      [studentId]: { ...(p[studentId] ?? {}), [subjectId]: val },
    }));
  }

  async function handleSave() {
    const payload = [];
    Object.entries(grades).forEach(([studentId, subGrades]) => {
      Object.entries(subGrades).forEach(([subjectId, val]) => {
        const score = parseFloat(val);
        if (!isNaN(score)) payload.push({ studentId, subjectId, score });
      });
    });
    if (!payload.length) { Alert.alert('Aucune note', 'Saisissez au moins une note.'); return; }
    setSaving(true);
    try {
      await mockExamsService.saveGrades(examId, payload);
      Alert.alert('Enregistré', 'Les notes ont été sauvegardées.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Erreur de sauvegarde.');
    } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const subjects  = sheet?.subjects ?? [];
  const students  = sheet?.students ?? [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      {/* Sticky header */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.headerScroll, { backgroundColor: colors.bgMuted, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={styles.nameCol}><Text style={[styles.headCell, { color: colors.textMuted }]}>Élève</Text></View>
          {subjects.map((s) => (
            <View key={s.id} style={styles.scoreCol}>
              <Text style={[styles.headCell, { color: colors.textMuted }]} numberOfLines={2}>{s.name ?? s.nameFr}</Text>
              <Text style={[styles.coefLabel, { color: colors.textMuted }]}>c.{s.coefficient}</Text>
            </View>
          ))}
          <View style={styles.avgCol}><Text style={[styles.headCell, { color: colors.textMuted }]}>Moy.</Text></View>
        </View>
      </ScrollView>

      {/* Body */}
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {students.map((student, si) => {
          const studentGrades = grades[student.studentId] ?? {};
          const average       = avg(studentGrades, subjects);
          return (
            <ScrollView key={student.studentId} horizontal showsHorizontalScrollIndicator={false}>
              <View style={[styles.dataRow, {
                backgroundColor: si % 2 === 0 ? colors.bg : colors.bgSubtle,
                borderBottomColor: colors.border,
              }]}>
                <View style={styles.nameCol}>
                  <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={2}>
                    {student.student?.user?.name ?? student.student?.admissionNumber ?? '—'}
                  </Text>
                </View>
                {subjects.map((s, sj) => (
                  <View key={s.id} style={styles.scoreCol}>
                    <TextInput
                      ref={(r) => { inputRefs.current[`${si}-${sj}`] = r; }}
                      value={studentGrades[s.id] ?? ''}
                      onChangeText={(v) => setScore(student.studentId, s.id, v.replace(',', '.'))}
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                      onSubmitEditing={() => inputRefs.current[`${si}-${sj + 1}`]?.focus() ?? inputRefs.current[`${si + 1}-0`]?.focus()}
                      selectTextOnFocus
                      style={[styles.scoreInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
                      placeholder="—"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                ))}
                <View style={styles.avgCol}>
                  {average ? (
                    <Text style={[styles.avgText, { color: scoreColor(parseFloat(average)) }]}>{average}</Text>
                  ) : (
                    <Text style={[styles.avgText, { color: colors.textMuted }]}>—</Text>
                  )}
                </View>
              </View>
            </ScrollView>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <TouchableOpacity onPress={handleSave} disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Enregistrer les notes</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const NAME_W = 100, SCORE_W = 60, AVG_W = 56;

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerScroll: { borderBottomWidth: 1, maxHeight: 52 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  dataRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderBottomWidth: 1 },
  nameCol:  { width: NAME_W,  paddingRight: spacing.sm },
  scoreCol: { width: SCORE_W, alignItems: 'center', paddingHorizontal: 2 },
  avgCol:   { width: AVG_W,   alignItems: 'center' },
  headCell: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textAlign: 'center' },
  coefLabel:{ fontSize: 9, textAlign: 'center' },
  studentName: { fontSize: fontSize.xs },
  scoreInput: {
    borderWidth: 1, borderRadius: radius.xs,
    paddingVertical: 3, paddingHorizontal: 4,
    fontSize: fontSize.xs, textAlign: 'center', width: 52,
  },
  avgText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md, borderTopWidth: 1 },
  saveBtn: { borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
