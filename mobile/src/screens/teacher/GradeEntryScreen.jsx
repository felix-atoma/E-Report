import { forwardRef, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { reportsService } from '../../services/reportsService';
import { gradesService } from '../../services/gradesService';
import { classesService } from '../../services/classesService';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const ScoreInput = forwardRef(function ScoreInput({ value, onChange, colors, onSubmitEditing }, ref) {
  const [local, setLocal] = useState(String(value ?? ''));

  function handleChange(text) {
    const cleaned = text.replace(',', '.').replace(/[^0-9.]/g, '');
    setLocal(cleaned);
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num >= 0 && num <= 20) onChange(num);
    else if (cleaned === '' || cleaned === '.') onChange(null);
  }

  const isValid = local === '' || local === '.' || (parseFloat(local) >= 0 && parseFloat(local) <= 20);

  return (
    <TextInput
      ref={ref}
      value={local}
      onChangeText={handleChange}
      keyboardType="decimal-pad"
      returnKeyType="next"
      onSubmitEditing={onSubmitEditing}
      selectTextOnFocus
      style={[
        styles.scoreInput,
        {
          backgroundColor: colors.bg,
          borderColor: isValid ? colors.border : colors.danger,
          color: colors.text,
        },
      ]}
      placeholder="—"
      placeholderTextColor={colors.textMuted}
    />
  );
});

export default function GradeEntryScreen({ route, navigation }) {
  const { reportId, classId } = route.params;
  const { colors } = useTheme();
  const [report, setReport] = useState(null);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRefs = useRef({});

  useEffect(() => {
    async function load() {
      try {
        const reportRes = await reportsService.getById(reportId);
        const reportData = reportRes.data.data;
        setReport(reportData);

        const resolvedClassId = classId ?? reportData?.classId;
        const classRes = resolvedClassId ? await classesService.getById(resolvedClassId) : null;

        const existingGrades = reportData?.grades ?? [];
        const subjects = classRes?.data?.data?.subjects ?? [];

        if (existingGrades.length > 0) {
          setRows(existingGrades.map((g) => ({
            subjectId: g.subjectId ?? g.subject?.id,
            nameFr: g.subject?.nameFr ?? '—',
            score: g.score ?? null,
            coefficient: g.coefficient ?? 1,
            teacherComment: g.teacherComment ?? '',
          })));
        } else {
          setRows(subjects.map((s) => ({
            subjectId: s.id,
            nameFr: s.nameFr ?? s.name ?? '—',
            score: null,
            coefficient: s.defaultCoefficient ?? 1,
            teacherComment: '',
          })));
        }
      } catch {
        Alert.alert('Erreur', 'Impossible de charger les données.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reportId, classId]);

  function updateRow(index, field, value) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleSave() {
    const validRows = rows.filter((r) => r.score != null && r.score !== '' && !isNaN(Number(r.score)));
    if (validRows.length === 0) {
      Alert.alert('Aucune note', 'Veuillez saisir au moins une note avant de sauvegarder.');
      return;
    }
    setSaving(true);
    try {
      await gradesService.bulkUpsert(reportId, validRows.map((r) => ({
        subjectId: r.subjectId,
        score: Number(r.score),
        coefficient: Number(r.coefficient) || 1,
        ...(r.teacherComment ? { teacherComment: r.teacherComment } : {}),
      })));
      Alert.alert('Enregistré', 'Les notes ont été sauvegardées.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Erreur lors de la sauvegarde.';
      Alert.alert('Erreur', msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const filled = rows.filter((r) => r.score != null && r.score !== '' && !isNaN(Number(r.score))).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Progress bar */}
        <View style={[styles.progressBar, { backgroundColor: colors.bgMuted }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${rows.length ? (filled / rows.length) * 100 : 0}%` }]} />
        </View>
        <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
          {filled}/{rows.length} matières saisies
        </Text>

        {/* Table header */}
        <View style={[styles.tableHead, { backgroundColor: colors.bgMuted, borderBottomColor: colors.border }]}>
          <Text style={[styles.colSubject, styles.headCell, { color: colors.textMuted }]}>Matière</Text>
          <Text style={[styles.colScore, styles.headCell, { color: colors.textMuted }]}>Note /20</Text>
          <Text style={[styles.colCoef, styles.headCell, { color: colors.textMuted }]}>Coef</Text>
        </View>

        <FlatList
          data={rows}
          keyExtractor={(_, i) => String(i)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => {
            const pts = item.score != null && item.coefficient
              ? (Number(item.score) * Number(item.coefficient)).toFixed(2)
              : '—';
            return (
              <View
                style={[
                  styles.row,
                  { borderBottomColor: colors.border },
                  index % 2 !== 0 ? { backgroundColor: colors.bgSubtle } : { backgroundColor: colors.bg },
                ]}
              >
                <Text style={[styles.colSubject, styles.cell, { color: colors.text }]} numberOfLines={2}>
                  {item.nameFr}
                </Text>
                <View style={styles.colScore}>
                  <ScoreInput
                    value={item.score}
                    onChange={(v) => updateRow(index, 'score', v)}
                    colors={colors}
                    onSubmitEditing={() => inputRefs.current[`coef-${index}`]?.focus()}
                    ref={(r) => { inputRefs.current[`score-${index}`] = r; }}
                  />
                </View>
                <View style={styles.colCoef}>
                  <TextInput
                    ref={(r) => { inputRefs.current[`coef-${index}`] = r; }}
                    value={String(item.coefficient ?? '')}
                    onChangeText={(t) => updateRow(index, 'coefficient', t.replace(',', '.'))}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                    onSubmitEditing={() => inputRefs.current[`score-${index + 1}`]?.focus()}
                    selectTextOnFocus
                    style={[styles.coefInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                  />
                </View>
                <Text style={[styles.ptsCell, { color: Number(item.score) >= 10 ? colors.success : (item.score != null ? colors.danger : colors.textMuted) }]}>
                  {pts}
                </Text>
              </View>
            );
          }}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />

        {/* Save button */}
        <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || filled === 0}
            activeOpacity={0.85}
            style={[
              styles.saveBtn,
              { backgroundColor: filled > 0 ? colors.primary : colors.bgMuted },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[styles.saveBtnText, { color: filled > 0 ? '#fff' : colors.textMuted }]}>
                Enregistrer les notes
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progressBar: { height: 4 },
  progressFill: { height: 4 },
  progressLabel: { fontSize: fontSize.xs, textAlign: 'right', paddingHorizontal: spacing.md, paddingTop: 4 },
  tableHead: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  headCell: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, gap: 6 },
  cell: { fontSize: fontSize.sm },
  colSubject: { flex: 3 },
  colScore: { flex: 2, alignItems: 'center' },
  colCoef: { flex: 1.5, alignItems: 'center' },
  scoreInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.sm,
    textAlign: 'center',
    width: '100%',
  },
  coefInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    fontSize: fontSize.sm,
    textAlign: 'center',
    width: '100%',
  },
  ptsCell: { flex: 1.5, fontSize: fontSize.xs, textAlign: 'right', fontWeight: fontWeight.medium },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  saveBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
