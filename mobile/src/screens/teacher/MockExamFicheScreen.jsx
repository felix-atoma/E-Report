import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { mockExamsService } from '../../services/mockExamsService';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

function scoreColor(n) {
  if (n >= 14) return '#15803d';
  if (n >= 10) return '#1d4ed8';
  return '#dc2626';
}

export default function MockExamFicheScreen({ route }) {
  const { examId } = route.params;
  const { colors } = useTheme();
  const [ficheData, setFicheData] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [grades, setGrades]   = useState({});  // studentId → score string
  const [coef, setCoef]       = useState('1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [signing, setSigning] = useState(false);
  const inputRefs = useRef({});

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await mockExamsService.getFicheData(examId);
        const data = res.data.data;
        setFicheData(data);
        if (data?.subjects?.length) {
          selectSubject(data.subjects[0], data);
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [examId]));

  function selectSubject(subj, data) {
    setSelectedSubject(subj);
    setCoef(String(subj.coefficient ?? 1));
    const existing = {};
    (subj.grades ?? []).forEach((g) => {
      if (g.score != null) existing[g.studentId] = String(g.score);
    });
    setGrades(existing);
  }

  async function handleSave() {
    const payload = Object.entries(grades)
      .map(([studentId, val]) => ({ studentId, score: parseFloat(val) }))
      .filter((r) => !isNaN(r.score));
    if (!payload.length) { Alert.alert('Aucune note', 'Saisissez au moins une note.'); return; }
    setSaving(true);
    try {
      await mockExamsService.saveSubjectGrades(examId, selectedSubject.id, {
        grades: payload,
        coefficient: parseFloat(coef) || 1,
      });
      Alert.alert('Enregistré', 'Notes sauvegardées.');
      // refresh
      const res = await mockExamsService.getFicheData(examId);
      const data = res.data.data;
      setFicheData(data);
      const updated = data.subjects.find((s) => s.id === selectedSubject.id);
      if (updated) selectSubject(updated, data);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Erreur de sauvegarde.');
    } finally { setSaving(false); }
  }

  async function handleSign() {
    const isSigned = selectedSubject?.isSigned;
    setSigning(true);
    try {
      if (isSigned) await mockExamsService.unsignFiche(examId, selectedSubject.id);
      else await mockExamsService.signFiche(examId, selectedSubject.id);
      const res = await mockExamsService.getFicheData(examId);
      const data = res.data.data;
      setFicheData(data);
      const updated = data.subjects.find((s) => s.id === selectedSubject.id);
      if (updated) selectSubject(updated, data);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Erreur.');
    } finally { setSigning(false); }
  }

  const subjects = ficheData?.subjects ?? [];
  const students = ficheData?.students ?? [];
  const isSigned = selectedSubject?.isSigned;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      {/* Subject tabs */}
      <FlatList
        horizontal
        data={subjects}
        keyExtractor={(s) => s.id}
        style={[styles.subjectTabs, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}
        contentContainerStyle={styles.subjectTabsContent}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const active = item.id === selectedSubject?.id;
          return (
            <TouchableOpacity onPress={() => selectSubject(item, ficheData)}
              style={[styles.subjectTab, {
                borderBottomColor: active ? colors.primary : 'transparent',
                borderBottomWidth: 2,
              }]}>
              <Text style={[styles.subjectTabText, { color: active ? colors.primary : colors.textMuted }]}>
                {item.name ?? item.nameFr}
              </Text>
              {item.isSigned && <Ionicons name="checkmark-circle" size={12} color="#10b981" />}
            </TouchableOpacity>
          );
        }}
      />

      {/* Coefficient + sign */}
      <View style={[styles.coefBar, { backgroundColor: colors.bgMuted, borderBottomColor: colors.border }]}>
        <Text style={[styles.coefLabel, { color: colors.text }]}>Coef :</Text>
        <TextInput
          value={coef}
          onChangeText={setCoef}
          keyboardType="decimal-pad"
          selectTextOnFocus
          editable={!isSigned}
          style={[styles.coefInput, { borderColor: colors.border, color: colors.text }]}
        />
        <TouchableOpacity onPress={handleSign} disabled={signing}
          style={[styles.signBtn, { backgroundColor: isSigned ? '#10b981' : colors.bgMuted, borderColor: isSigned ? '#10b981' : colors.border }]}>
          {signing ? <ActivityIndicator size="small" color={isSigned ? '#fff' : colors.text} />
            : <>
                <Ionicons name={isSigned ? 'lock-closed' : 'lock-open-outline'} size={14} color={isSigned ? '#fff' : colors.text} />
                <Text style={[styles.signBtnText, { color: isSigned ? '#fff' : colors.text }]}>
                  {isSigned ? 'Signé' : 'Signer'}
                </Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {/* Grade list */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          data={students}
          keyExtractor={(s) => s.id}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={<View style={{ height: 100 }} />}
          renderItem={({ item, index }) => {
            const score = parseFloat(grades[item.id]);
            return (
              <View style={[styles.row, {
                backgroundColor: index % 2 === 0 ? colors.bg : colors.bgSubtle,
                borderBottomColor: colors.border,
              }]}>
                <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={1}>
                  {item.user?.name ?? item.admissionNumber ?? '—'}
                </Text>
                <TextInput
                  ref={(r) => { inputRefs.current[index] = r; }}
                  value={grades[item.id] ?? ''}
                  onChangeText={(v) => setGrades((p) => ({ ...p, [item.id]: v.replace(',', '.') }))}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => inputRefs.current[index + 1]?.focus()}
                  selectTextOnFocus
                  editable={!isSigned}
                  style={[styles.scoreInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="—"
                  placeholderTextColor={colors.textMuted}
                />
                {!isNaN(score) && (
                  <Text style={[styles.colorLabel, { color: scoreColor(score) }]}>
                    {score >= 10 ? '✓' : '✗'}
                  </Text>
                )}
              </View>
            );
          }}
        />

        {!isSigned && (
          <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
            <TouchableOpacity onPress={handleSave} disabled={saving}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}>
              {saving ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Enregistrer</Text>}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subjectTabs: { maxHeight: 44, borderBottomWidth: 1 },
  subjectTabsContent: { paddingHorizontal: spacing.md },
  subjectTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, height: 44,
  },
  subjectTabText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  coefBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1,
  },
  coefLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  coefInput: {
    borderWidth: 1.5, borderRadius: radius.sm,
    paddingVertical: 4, paddingHorizontal: spacing.sm,
    fontSize: fontSize.sm, textAlign: 'center', width: 60,
    backgroundColor: 'transparent',
  },
  signBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginLeft: 'auto', paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: 1.5,
  },
  signBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: 1, gap: spacing.md,
  },
  studentName: { flex: 1, fontSize: fontSize.sm },
  scoreInput: {
    borderWidth: 1.5, borderRadius: radius.sm,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    fontSize: fontSize.sm, textAlign: 'center', width: 70,
    backgroundColor: 'transparent',
  },
  colorLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold, width: 20, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md, borderTopWidth: 1 },
  saveBtn: { borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
