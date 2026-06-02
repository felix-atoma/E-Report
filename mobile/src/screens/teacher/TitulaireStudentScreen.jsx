import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { reportsService } from '../../services/reportsService';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const CONDUCT_OPTIONS = [
  { value: 'TRES_BIEN', label: 'Très Bien', color: '#10b981' },
  { value: 'BIEN',      label: 'Bien',      color: '#3b82f6' },
  { value: 'PASSABLE',  label: 'Passable',  color: '#f59e0b' },
  { value: 'MEDIOCRE',  label: 'Médiocre',  color: '#ef4444' },
];

function NumInput({ label, value, onChange, colors }) {
  return (
    <View style={styles.numRow}>
      <Text style={[styles.numLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        selectTextOnFocus
        style={[styles.numInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bgSubtle }]}
      />
    </View>
  );
}

export default function TitulaireStudentScreen({ route, navigation }) {
  const { studentId, studentName, reportId, classId, academicYear, termNumber } = route.params;
  const { colors } = useTheme();

  const [form, setForm] = useState({
    attendanceDays: '', attendancePresent: '', attendanceLate: '',
    attendanceAbsent: '', attendanceAbsentHours: '', attendanceExcluded: '',
    warnings: '', commendations: '',
    honorCouncil: false,
    conductRating: '',
    teacherComment: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useFocusEffect(useCallback(() => {
    if (!reportId) { setLoading(false); return; }
    (async () => {
      try {
        const res = await reportsService.getById(reportId);
        const r   = res.data.data ?? {};
        setForm({
          attendanceDays:        String(r.attendanceDays        ?? ''),
          attendancePresent:     String(r.attendancePresent     ?? ''),
          attendanceLate:        String(r.attendanceLate        ?? ''),
          attendanceAbsent:      String(r.attendanceAbsent      ?? ''),
          attendanceAbsentHours: String(r.attendanceAbsentHours ?? ''),
          attendanceExcluded:    String(r.attendanceExcluded    ?? ''),
          warnings:              String(r.warnings              ?? ''),
          commendations:         String(r.commendations         ?? ''),
          honorCouncil:          r.honorCouncil ?? false,
          conductRating:         r.conductRating ?? '',
          teacherComment:        r.teacherComment ?? '',
        });
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [reportId]));

  function set(key) { return (v) => setForm((p) => ({ ...p, [key]: v })); }
  function num(val) { return val ? parseInt(val, 10) || null : null; }

  async function handleSave() {
    setSaving(true);
    try {
      await reportsService.titulaireUpsert({
        classId, academicYear,
        termType: 'TRIMESTRE',
        termNumber,
        termName: `Trimestre ${termNumber}`,
        entries: [{
          studentId,
          attendanceDays:        num(form.attendanceDays),
          attendancePresent:     num(form.attendancePresent),
          attendanceLate:        num(form.attendanceLate),
          attendanceAbsent:      num(form.attendanceAbsent),
          attendanceAbsentHours: num(form.attendanceAbsentHours),
          attendanceExcluded:    num(form.attendanceExcluded),
          warnings:              num(form.warnings),
          commendations:         num(form.commendations),
          honorCouncil:          form.honorCouncil,
          conductRating:         form.conductRating || null,
          teacherComment:        form.teacherComment.trim() || null,
        }],
      });
      Alert.alert('Enregistré', 'Les données ont été sauvegardées.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Impossible de sauvegarder.');
    } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Attendance */}
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Présences</Text>
            <NumInput label="Jours de classe"   value={form.attendanceDays}        onChange={set('attendanceDays')}        colors={colors} />
            <NumInput label="Jours présent"      value={form.attendancePresent}     onChange={set('attendancePresent')}     colors={colors} />
            <NumInput label="Retards"            value={form.attendanceLate}        onChange={set('attendanceLate')}        colors={colors} />
            <NumInput label="Absences (jours)"   value={form.attendanceAbsent}      onChange={set('attendanceAbsent')}      colors={colors} />
            <NumInput label="Absences (heures)"  value={form.attendanceAbsentHours} onChange={set('attendanceAbsentHours')} colors={colors} />
            <NumInput label="Exclusions"         value={form.attendanceExcluded}    onChange={set('attendanceExcluded')}    colors={colors} />
          </Card>

          {/* Conduct */}
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Conduite</Text>
            <View style={styles.conductRow}>
              {CONDUCT_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.value}
                  onPress={() => set('conductRating')(form.conductRating === opt.value ? '' : opt.value)}
                  style={[styles.conductChip, {
                    backgroundColor: form.conductRating === opt.value ? opt.color : opt.color + '15',
                    borderColor: opt.color + (form.conductRating === opt.value ? 'ff' : '50'),
                  }]}>
                  <Text style={[styles.conductText, {
                    color: form.conductRating === opt.value ? '#fff' : opt.color,
                  }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Remarks */}
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Remarques</Text>
            <NumInput label="Avertissements"    value={form.warnings}      onChange={set('warnings')}      colors={colors} />
            <NumInput label="Félicitations"     value={form.commendations} onChange={set('commendations')} colors={colors} />
            <View style={[styles.numRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.numLabel, { color: colors.text }]}>Conseil d'honneur</Text>
              <Switch
                value={form.honorCouncil}
                onValueChange={set('honorCouncil')}
                trackColor={{ false: colors.border, true: colors.primary + '60' }}
                thumbColor={form.honorCouncil ? colors.primary : colors.bgMuted}
              />
            </View>
          </Card>

          {/* Teacher comment */}
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Appréciation du titulaire</Text>
            <TextInput
              value={form.teacherComment}
              onChangeText={set('teacherComment')}
              multiline
              numberOfLines={5}
              placeholder="Sérieux, mérite des encouragements..."
              placeholderTextColor={colors.textMuted}
              style={[styles.textarea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bgSubtle }]}
            />
          </Card>

          <Button title="Enregistrer" onPress={handleSave} loading={saving} fullWidth size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: spacing.md },
  numRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  numLabel: { fontSize: fontSize.sm, flex: 1 },
  numInput: {
    borderWidth: 1.5, borderRadius: radius.sm,
    paddingVertical: 4, paddingHorizontal: spacing.sm,
    fontSize: fontSize.sm, textAlign: 'center', width: 70,
  },
  conductRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  conductChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5,
  },
  conductText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  textarea: {
    borderWidth: 1.5, borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.sm,
    textAlignVertical: 'top', minHeight: 100,
  },
});
