import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { reportsService } from '../../services/reportsService';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const CONDUCT_OPTIONS = [
  { value: 'TRES_BIEN', label: 'Très bien',  color: '#10b981' },
  { value: 'BIEN',      label: 'Bien',       color: '#3b82f6' },
  { value: 'PASSABLE',  label: 'Passable',   color: '#f59e0b' },
  { value: 'MEDIOCRE',  label: 'Médiocre',   color: '#ef4444' },
];

export default function EditReportMetadataScreen({ route, navigation }) {
  const { reportId } = route.params;
  const { colors } = useTheme();

  const [teacherComment, setTeacherComment] = useState('');
  const [principalComment, setPrincipalComment] = useState('');
  const [conduct, setConduct] = useState('');
  const [absences, setAbsences] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await reportsService.getById(reportId);
        const r = res.data.data;
        setTeacherComment(r.teacherComment ?? '');
        setPrincipalComment(r.principalComment ?? '');
        setConduct(r.conduct ?? '');
        setAbsences(r.absences != null ? String(r.absences) : '');
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [reportId]));

  async function handleSave() {
    setSaving(true);
    try {
      await reportsService.update(reportId, {
        teacherComment: teacherComment.trim() || null,
        principalComment: principalComment.trim() || null,
        conduct: conduct || null,
        absences: absences ? parseInt(absences, 10) : null,
      });
      Alert.alert('Enregistré', 'Les informations ont été mises à jour.', [
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

          {/* Conduct */}
          <Card>
            <Text style={[styles.label, { color: colors.text }]}>Conduite</Text>
            <View style={styles.conductRow}>
              {CONDUCT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setConduct(conduct === opt.value ? '' : opt.value)}
                  style={[
                    styles.conductChip,
                    conduct === opt.value
                      ? { backgroundColor: opt.color, borderColor: opt.color }
                      : { backgroundColor: opt.color + '15', borderColor: opt.color + '40' },
                  ]}
                >
                  <Text style={[styles.conductText, { color: conduct === opt.value ? '#fff' : opt.color }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Absences */}
          <Card>
            <Text style={[styles.label, { color: colors.text }]}>Absences (heures)</Text>
            <TextInput
              value={absences}
              onChangeText={setAbsences}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={[styles.absenceInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bgSubtle }]}
            />
          </Card>

          {/* Teacher comment */}
          <Card>
            <Text style={[styles.label, { color: colors.text }]}>Appréciation du professeur principal</Text>
            <TextInput
              value={teacherComment}
              onChangeText={setTeacherComment}
              multiline
              numberOfLines={4}
              placeholder="Élève sérieux, travail régulier..."
              placeholderTextColor={colors.textMuted}
              style={[styles.textarea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bgSubtle }]}
            />
          </Card>

          {/* Principal comment */}
          <Card>
            <Text style={[styles.label, { color: colors.text }]}>Appréciation du directeur</Text>
            <TextInput
              value={principalComment}
              onChangeText={setPrincipalComment}
              multiline
              numberOfLines={4}
              placeholder="Encouragements de la direction..."
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
  label:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.md },
  conductRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  conductChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5,
  },
  conductText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  absenceInput: {
    borderWidth: 1.5, borderRadius: radius.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    fontSize: fontSize.md, width: 100,
  },
  textarea: {
    borderWidth: 1.5, borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.sm,
    textAlignVertical: 'top', minHeight: 100,
  },
});
