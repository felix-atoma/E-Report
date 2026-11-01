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
import { gradesService } from '../../services/gradesService';
import SignatureModal from '../../components/common/SignatureModal';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const toText = (v) => (v == null ? '' : String(v).replace('.', ','));
const parse = (t) => {
  const clean = String(t ?? '').trim().replace(',', '.');
  if (clean === '') return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : NaN;
};

// Fiche d'une session (examen blanc, devoir surveillé, composition mensuelle…) : une matière à la fois,
// sur le barème de la matière pour cette session (/10 ou /20), signature manuscrite pour verrouiller.
export default function MockExamFicheScreen({ route }) {
  const { examId } = route.params;
  const { colors } = useTheme();
  const [data, setData]         = useState(null);
  const [subjectId, setSubjectId] = useState(null);
  const [values, setValues]     = useState({});   // studentId → texte saisi (matière sélectionnée)
  const [coef, setCoef]         = useState('1');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [dirty, setDirty]       = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [signing, setSigning]   = useState(false);
  const [savedSignature, setSavedSignature] = useState(null);
  const inputRefs = useRef({});

  function showSubject(d, id) {
    const subj = d?.subjects?.find((s) => s.id === id);
    if (!subj) return;
    setSubjectId(id);
    setCoef(String(subj.coefficient ?? 1));
    setValues(Object.fromEntries((d.students ?? []).map((st) => [
      st.studentId, toText(st.grades?.find((g) => g.subjectId === id)?.score),
    ])));
    setDirty(false);
  }

  const load = useCallback(async (keepSubject) => {
    setLoading(true);
    try {
      const res = await mockExamsService.getFicheData(examId);
      const d = res.data.data;
      setData(d);
      const editable = d?.editableSubjectIds;
      const subjects = (d?.subjects ?? []).filter((s) => !editable || editable.includes(s.id));
      const target = subjects.find((s) => s.id === keepSubject) ?? subjects[0];
      if (target) showSubject(d, target.id);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Impossible de charger la fiche.');
    } finally { setLoading(false); }
  }, [examId]);

  useFocusEffect(useCallback(() => { load(subjectId); }, [load])); // eslint-disable-line react-hooks/exhaustive-deps

  const editableIds = data?.editableSubjectIds;
  const subjects = (data?.subjects ?? []).filter((s) => !editableIds || editableIds.includes(s.id));
  const students = data?.students ?? [];
  const subject = subjects.find((s) => s.id === subjectId);
  const maxScore = subject?.maxScore ?? 20;
  const isSigned = !!subject?.isSigned;
  const filled = students.filter((st) => parse(values[st.studentId]) != null).length;

  function pickSubject(id) {
    if (id === subjectId) return;
    if (dirty) {
      Alert.alert('Notes non enregistrées', 'Changer de matière sans enregistrer ?', [
        { text: 'Rester', style: 'cancel' },
        { text: 'Changer', style: 'destructive', onPress: () => showSubject(data, id) },
      ]);
    } else showSubject(data, id);
  }

  async function handleSave() {
    const grades = [];
    for (const st of students) {
      const v = parse(values[st.studentId]);
      if (Number.isNaN(v) || (v != null && (v < 0 || v > maxScore))) {
        Alert.alert('Note invalide', `${st.studentName} : la note doit être entre 0 et ${maxScore}.`);
        return;
      }
      grades.push({ studentId: st.studentId, score: v });
    }
    setSaving(true);
    try {
      await mockExamsService.saveSubjectGrades(examId, subjectId, { grades, coefficient: Math.round(parse(coef) || 1) });
      Alert.alert('Enregistré', 'Les notes ont été enregistrées.');
      await load(subjectId);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Erreur lors de l\'enregistrement.');
    } finally { setSaving(false); }
  }

  async function openSign() {
    if (dirty) {
      Alert.alert('Notes non enregistrées', 'Enregistrez d\'abord les notes, puis signez la fiche.');
      return;
    }
    const sig = await gradesService.mySignature().catch(() => null);
    setSavedSignature(sig?.data?.data?.signatureData ?? null);
    setSignOpen(true);
  }

  async function confirmSign(signatureData) {
    setSigning(true);
    try {
      await mockExamsService.signFiche(examId, subjectId, signatureData);
      setSignOpen(false);
      Alert.alert('Fiche signée', 'La fiche de cette matière est signée et verrouillée.');
      await load(subjectId);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'La signature a échoué.');
    } finally { setSigning(false); }
  }

  function askUnsign() {
    Alert.alert('Annuler la signature', 'La fiche redeviendra modifiable. Continuer ?', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui', onPress: async () => {
        try {
          await mockExamsService.unsignFiche(examId, subjectId);
          await load(subjectId);
        } catch (err) {
          Alert.alert('Erreur', err.response?.data?.message ?? 'Impossible d\'annuler la signature.');
        }
      } },
    ]);
  }

  if (loading && !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!subjects.length) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <Text style={[styles.empty, { color: colors.textMuted }]}>Aucune matière à saisir pour vous dans cette session.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <FlatList
        horizontal
        data={subjects}
        keyExtractor={(s) => s.id}
        style={[styles.tabs, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}
        contentContainerStyle={styles.tabsContent}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const active = item.id === subjectId;
          return (
            <TouchableOpacity onPress={() => pickSubject(item.id)}
              style={[styles.tab, { borderBottomColor: active ? colors.primary : 'transparent' }]}>
              <Text style={[styles.tabText, { color: active ? colors.primary : colors.textMuted }]}>{item.nameFr}</Text>
              {item.isSigned && <Ionicons name="checkmark-circle" size={13} color={colors.success} />}
            </TouchableOpacity>
          );
        }}
      />

      <View style={[styles.head, { backgroundColor: colors.bgMuted, borderBottomColor: colors.border }]}>
        <Text style={[styles.headText, { color: colors.text }]}>Sur {maxScore} · {filled}/{students.length} notes</Text>
        <Text style={[styles.coefLabel, { color: colors.textMuted }]}>Coef.</Text>
        <TextInput
          value={coef}
          onChangeText={(t) => { setCoef(t.replace(/[^0-9]/g, '')); setDirty(true); }}
          keyboardType="number-pad"
          editable={!isSigned}
          selectTextOnFocus
          style={[styles.coefInput, { borderColor: colors.border, color: colors.text }]}
        />
      </View>

      {isSigned && (
        <View style={[styles.locked, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
          <Ionicons name="lock-closed" size={16} color="#047857" />
          <Text style={styles.lockedText}>
            Signée{subject?.signedByName ? ` par ${subject.signedByName}` : ''} — verrouillée.
          </Text>
          <TouchableOpacity onPress={askUnsign}>
            <Text style={styles.unsign}>Annuler</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          data={students}
          keyExtractor={(s) => s.studentId}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item, index }) => {
            const v = parse(values[item.studentId]);
            const bad = Number.isNaN(v) || (v != null && (v < 0 || v > maxScore));
            return (
              <View style={[styles.row, { backgroundColor: index % 2 ? colors.bgSubtle : colors.bg, borderBottomColor: colors.border }]}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.studentName}</Text>
                <TextInput
                  ref={(r) => { inputRefs.current[index] = r; }}
                  value={values[item.studentId] ?? ''}
                  onChangeText={(t) => { setValues((p) => ({ ...p, [item.studentId]: t.replace(/[^0-9.,]/g, '') })); setDirty(true); }}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => inputRefs.current[index + 1]?.focus()}
                  editable={!isSigned}
                  selectTextOnFocus
                  placeholder="—"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { borderColor: bad ? colors.danger : colors.border, color: colors.text, backgroundColor: colors.bg }]}
                />
              </View>
            );
          }}
        />

        {!isSigned && (
          <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
            <TouchableOpacity onPress={openSign} disabled={saving} style={[styles.btn, { borderColor: colors.primary }]}>
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={[styles.btnText, { color: colors.primary }]}>Signer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Enregistrer</Text>}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <SignatureModal
        visible={signOpen}
        title="Signer la fiche"
        message={`${subject?.nameFr ?? ''} — ${data?.exam?.label ?? ''}. La fiche de cette matière sera verrouillée.`}
        savedSignature={savedSignature}
        busy={signing}
        onConfirm={confirmSign}
        onClose={() => setSignOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: { fontSize: fontSize.sm, textAlign: 'center' },
  tabs: { maxHeight: 46, borderBottomWidth: 1 },
  tabsContent: { paddingHorizontal: spacing.md },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, height: 46, borderBottomWidth: 2,
  },
  tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1,
  },
  headText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  coefLabel: { fontSize: fontSize.sm },
  coefInput: { borderWidth: 1.5, borderRadius: radius.sm, width: 48, paddingVertical: 4, textAlign: 'center', fontSize: fontSize.sm },
  locked: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    margin: spacing.md, marginBottom: 0, padding: spacing.sm, borderWidth: 1, borderRadius: radius.md,
  },
  lockedText: { flex: 1, color: '#047857', fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  unsign: { color: '#b91c1c', fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1,
  },
  name: { flex: 1, fontSize: fontSize.sm },
  input: { borderWidth: 1.5, borderRadius: radius.sm, width: 72, paddingVertical: spacing.xs, textAlign: 'center', fontSize: fontSize.md },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1,
  },
  btn: {
    flex: 1, flexDirection: 'row', gap: spacing.xs, alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1.5, minHeight: 48,
  },
  btnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  btnPrimary: { borderWidth: 0 },
  btnPrimaryText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
