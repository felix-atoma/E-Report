import { forwardRef, useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { gradesService } from '../../services/gradesService';
import { classesService } from '../../services/classesService';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const ScoreInput = forwardRef(function ScoreInput({ value, onChange, colors, onSubmitEditing }, ref) {
  const [local, setLocal] = useState(value != null ? String(value) : '');

  function handle(text) {
    const clean = text.replace(',', '.').replace(/[^0-9.]/g, '');
    setLocal(clean);
    const n = parseFloat(clean);
    onChange(!isNaN(n) && n >= 0 && n <= 20 ? n : null);
  }

  const valid = local === '' || local === '.' || (parseFloat(local) >= 0 && parseFloat(local) <= 20);

  return (
    <TextInput
      ref={ref}
      value={local}
      onChangeText={handle}
      keyboardType="decimal-pad"
      returnKeyType="next"
      onSubmitEditing={onSubmitEditing}
      selectTextOnFocus
      style={[styles.scoreInput, {
        backgroundColor: colors.bg,
        borderColor: valid ? colors.border : colors.danger,
        color: colors.text,
      }]}
      placeholder="—"
      placeholderTextColor={colors.textMuted}
    />
  );
});

export default function FicheGradeEntryScreen({ route, navigation }) {
  const { classId, subjectId, subjectName, academicYear, termNumber } = route.params;
  const { colors } = useTheme();

  const [rows, setRows]     = useState([]);
  const [coef, setCoef]     = useState('1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const inputRefs = useRef({});

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        // Try to get existing grades for this class×subject
        const res = await gradesService.getForClassSubject(classId, subjectId, { academicYear, termNumber });
        const data = res.data.data ?? [];
        if (data.length > 0) {
          setRows(data.map((r) => ({
            studentId: r.studentId ?? r.student?.id,
            name: r.student?.user?.name ?? r.student?.admissionNumber ?? '—',
            score: r.score ?? null,
          })));
          if (data[0]?.coefficient) setCoef(String(data[0].coefficient));
        } else {
          // No existing grades — load students from class
          const classRes = await classesService.getById(classId);
          const students = classRes.data.data?.students ?? [];
          setRows(students.map((s) => ({
            studentId: s.id,
            name: s.user?.name ?? s.admissionNumber ?? '—',
            score: null,
          })));
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [classId, subjectId, academicYear, termNumber]));

  function updateScore(idx, score) {
    setRows((prev) => { const n = [...prev]; n[idx] = { ...n[idx], score }; return n; });
  }

  async function handleSave() {
    const validRows = rows.filter((r) => r.score != null);
    if (validRows.length === 0) {
      Alert.alert('Aucune note', 'Saisissez au moins une note avant de sauvegarder.');
      return;
    }
    setSaving(true);
    try {
      await gradesService.saveClassGrades(classId, subjectId, {
        academicYear,
        termNumber,
        coefficient: parseFloat(coef) || 1,
        grades: validRows.map((r) => ({ studentId: r.studentId, score: Number(r.score) })),
      });
      Alert.alert('Enregistré', 'Les notes ont été sauvegardées.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Erreur lors de la sauvegarde.');
    } finally { setSaving(false); }
  }

  const filled = rows.filter((r) => r.score != null).length;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Coefficient row */}
        <View style={[styles.coefBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
          <Text style={[styles.coefLabel, { color: colors.text }]}>Coefficient :</Text>
          <TextInput
            value={coef}
            onChangeText={setCoef}
            keyboardType="decimal-pad"
            selectTextOnFocus
            style={[styles.coefInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bgSubtle }]}
          />
          <Text style={[styles.coefNote, { color: colors.textMuted }]}>
            {filled}/{rows.length} notes saisies
          </Text>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBar, { backgroundColor: colors.bgMuted }]}>
          <View style={[styles.progressFill, {
            backgroundColor: colors.primary,
            width: rows.length ? `${(filled / rows.length) * 100}%` : '0%',
          }]} />
        </View>

        {/* Header row */}
        <View style={[styles.tableHead, { backgroundColor: colors.bgMuted, borderBottomColor: colors.border }]}>
          <Text style={[styles.colName, styles.headCell, { color: colors.textMuted }]}>Élève</Text>
          <Text style={[styles.colScore, styles.headCell, { color: colors.textMuted }]}>Note /20</Text>
        </View>

        <FlatList
          data={rows}
          keyExtractor={(_, i) => String(i)}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={<View style={{ height: 100 }} />}
          renderItem={({ item, index }) => (
            <View style={[
              styles.row,
              { borderBottomColor: colors.border },
              index % 2 === 0 ? { backgroundColor: colors.bg } : { backgroundColor: colors.bgSubtle },
            ]}>
              <View style={styles.colName}>
                <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              </View>
              <View style={styles.colScore}>
                <ScoreInput
                  ref={(r) => { inputRefs.current[index] = r; }}
                  value={item.score}
                  onChange={(v) => updateScore(index, v)}
                  colors={colors}
                  onSubmitEditing={() => inputRefs.current[index + 1]?.focus()}
                />
              </View>
            </View>
          )}
        />

        {/* Save button */}
        <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || filled === 0}
            style={[styles.saveBtn, { backgroundColor: filled > 0 ? colors.primary : colors.bgMuted }]}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={[styles.saveBtnText, { color: filled > 0 ? '#fff' : colors.textMuted }]}>
                  Enregistrer les notes
                </Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coefBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1,
  },
  coefLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  coefInput: {
    borderWidth: 1.5, borderRadius: radius.sm,
    paddingVertical: 4, paddingHorizontal: spacing.sm,
    fontSize: fontSize.sm, textAlign: 'center', width: 60,
  },
  coefNote: { flex: 1, fontSize: fontSize.xs, textAlign: 'right' },
  progressBar: { height: 3 },
  progressFill: { height: 3 },
  tableHead: {
    flexDirection: 'row', paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg, borderBottomWidth: 1,
  },
  headCell: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1,
  },
  colName:  { flex: 1 },
  colScore: { width: 90, alignItems: 'center' },
  studentName: { fontSize: fontSize.sm },
  scoreInput: {
    borderWidth: 1.5, borderRadius: radius.sm,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    fontSize: fontSize.sm, textAlign: 'center', width: 70,
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.md, borderTopWidth: 1,
  },
  saveBtn: { borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  saveBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
