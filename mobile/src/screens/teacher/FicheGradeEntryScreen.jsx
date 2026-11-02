import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { gradesService } from '../../services/gradesService';
import SignatureModal from '../../components/common/SignatureModal';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

// Colonnes de la fiche du trimestre. Sur téléphone on saisit une colonne à la fois pour toute la classe.
const COLUMNS = [
  { key: 'noteInterro1', label: 'Interro 1' },
  { key: 'noteInterro2', label: 'Interro 2' },
  { key: 'noteInterro3', label: 'Interro 3' },
  { key: 'noteInterro4', label: 'Interro 4' },
  { key: 'noteDevoir', label: 'Devoir' },
  { key: 'noteComposition', label: 'Composition' },
];
const SHORT = { noteInterro1: 'I1', noteInterro2: 'I2', noteInterro3: 'I3', noteInterro4: 'I4', noteDevoir: 'D', noteComposition: 'C' };

const toText = (v) => (v == null ? '' : String(v).replace('.', ','));
const parse = (t) => {
  const clean = String(t ?? '').trim().replace(',', '.');
  if (clean === '') return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : NaN;
};

export default function FicheGradeEntryScreen({ route, navigation }) {
  const { classId, subjectId, subjectName, academicYear, termNumber } = route.params;
  const { colors } = useTheme();

  const [sheet, setSheet]     = useState(null);   // réponse du serveur (matière, fiche)
  const [rows, setRows]       = useState([]);     // élèves avec les 6 colonnes (texte saisi)
  const [column, setColumn]   = useState('noteInterro1');
  const [coef, setCoef]       = useState('1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [savedSignature, setSavedSignature] = useState(null);
  const inputRefs = useRef({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gradesService.getForClassSubject(classId, subjectId, { academicYear, termNumber });
      const data = res.data.data;
      setSheet(data);
      const students = data?.students ?? [];
      setRows(students.map((s) => ({
        studentId: s.studentId,
        name: s.studentName,
        coefficient: s.coefficient ?? 1,
        values: Object.fromEntries(COLUMNS.map((c) => [c.key, toText(s[c.key])])),
      })));
      // Coefficient du serveur : celui des notes, sinon le dernier utilisé pour cette matière dans la classe
      setCoef(String(data?.coefficient ?? students.find((s) => s.coefficient != null)?.coefficient ?? 1));
      // Première colonne encore incomplète : celle que le professeur vient sans doute saisir
      const firstGap = COLUMNS.find((c) => students.some((s) => s[c.key] == null));
      setColumn(firstGap?.key ?? 'noteComposition');
      setDirty(false);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Impossible de charger la fiche.');
    } finally { setLoading(false); }
  }, [classId, subjectId, academicYear, termNumber]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const maxScore = sheet?.subject?.maxScore ?? 20;
  const hasCoefficient = sheet?.subject?.hasCoefficient !== false;
  const isSigned = !!sheet?.fiche?.isSigned;
  const filled = rows.filter((r) => parse(r.values[column]) != null).length;

  function setValue(idx, text) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], values: { ...next[idx].values, [column]: text.replace(/[^0-9.,]/g, '') } };
      return next;
    });
    setDirty(true);
  }

  async function handleSave() {
    // Toutes les colonnes sont renvoyées : le serveur recalcule la moyenne avec les notes reçues
    const grades = [];
    for (const r of rows) {
      const g = { studentId: r.studentId, coefficient: hasCoefficient ? (parse(coef) || 1) : 1 };
      for (const c of COLUMNS) {
        const v = parse(r.values[c.key]);
        if (Number.isNaN(v) || (v != null && (v < 0 || v > maxScore))) {
          setColumn(c.key);
          Alert.alert('Note invalide', `${r.name} — ${c.label} : la note doit être entre 0 et ${maxScore}.`);
          return;
        }
        g[c.key] = v; // null : note effacée (sinon le serveur garderait l'ancienne)
      }
      grades.push(g);
    }
    setSaving(true);
    try {
      await gradesService.saveClassGrades(classId, subjectId, {
        academicYear, termNumber, termName: `Trimestre ${termNumber}`, grades,
      });
      Alert.alert('Enregistré', 'Les notes ont été enregistrées.');
      await load();
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
      await gradesService.signFiche(classId, subjectId, academicYear, termNumber, signatureData);
      setSignOpen(false);
      Alert.alert('Fiche signée', 'La fiche est signée et verrouillée.');
      await load();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'La signature a échoué.');
    } finally { setSigning(false); }
  }

  function askUnsign() {
    Alert.alert('Annuler la signature', 'La fiche redeviendra modifiable. Continuer ?', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui', onPress: async () => {
        try {
          await gradesService.unsignFiche(classId, subjectId, academicYear, termNumber);
          await load();
        } catch (err) {
          Alert.alert('Erreur', err.response?.data?.message ?? 'Impossible d\'annuler la signature.');
        }
      } },
    ]);
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
        <View style={[styles.head, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
          <Text style={[styles.subject, { color: colors.text }]} numberOfLines={1}>
            {subjectName ?? sheet?.subject?.nameFr} · T{termNumber} · /{maxScore}
          </Text>
          {hasCoefficient && (
            <View style={styles.coefRow}>
              <Text style={[styles.coefLabel, { color: colors.textMuted }]}>Coef.</Text>
              <TextInput
                value={coef}
                onChangeText={(t) => { setCoef(t.replace(/[^0-9.,]/g, '')); setDirty(true); }}
                keyboardType="decimal-pad"
                editable={!isSigned}
                selectTextOnFocus
                style={[styles.coefInput, { borderColor: colors.border, color: colors.text }]}
              />
            </View>
          )}
        </View>

        {isSigned && (
          <View style={[styles.locked, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
            <Ionicons name="lock-closed" size={16} color="#047857" />
            <Text style={styles.lockedText}>
              Fiche signée{sheet?.fiche?.signedByName ? ` par ${sheet.fiche.signedByName}` : ''} — verrouillée.
            </Text>
            <TouchableOpacity onPress={askUnsign}>
              <Text style={styles.unsign}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabs, { borderBottomColor: colors.border }]} contentContainerStyle={styles.tabsContent}>
          {COLUMNS.map((c) => {
            const active = c.key === column;
            const done = rows.length > 0 && rows.every((r) => parse(r.values[c.key]) != null);
            return (
              <TouchableOpacity
                key={c.key}
                onPress={() => setColumn(c.key)}
                style={[styles.tab, { backgroundColor: active ? colors.primary : colors.bg, borderColor: active ? colors.primary : colors.border }]}
              >
                <Text style={[styles.tabText, { color: active ? '#fff' : colors.text }]}>{c.label}</Text>
                {done && <Ionicons name="checkmark-circle" size={13} color={active ? '#fff' : colors.success} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.progress, { backgroundColor: colors.bgMuted }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${rows.length ? (filled / rows.length) * 100 : 0}%` }]} />
        </View>
        <Text style={[styles.count, { color: colors.textMuted }]}>
          {COLUMNS.find((c) => c.key === column)?.label} : {filled}/{rows.length} notes
        </Text>

        <FlatList
          data={rows}
          keyExtractor={(r) => r.studentId}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>Aucun élève inscrit dans cette classe pour {academicYear}.</Text>
          }
          renderItem={({ item, index }) => {
            const others = COLUMNS.filter((c) => c.key !== column && item.values[c.key] !== '')
              .map((c) => `${SHORT[c.key]} ${item.values[c.key]}`).join(' · ');
            const v = parse(item.values[column]);
            const bad = Number.isNaN(v) || (v != null && (v < 0 || v > maxScore));
            return (
              <View style={[styles.row, { backgroundColor: index % 2 ? colors.bgSubtle : colors.bg, borderBottomColor: colors.border }]}>
                <View style={styles.rowInfo}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  {!!others && <Text style={[styles.others, { color: colors.textMuted }]} numberOfLines={1}>{others}</Text>}
                </View>
                <TextInput
                  ref={(r) => { inputRefs.current[index] = r; }}
                  value={item.values[column]}
                  onChangeText={(t) => setValue(index, t)}
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

        {!isSigned && rows.length > 0 && (
          <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
            <TouchableOpacity onPress={openSign} disabled={saving} style={[styles.btn, { borderColor: colors.primary }]}>
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={[styles.btnText, { color: colors.primary }]}>Signer la fiche</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Enregistrer</Text>}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <SignatureModal
        visible={signOpen}
        title="Signer la fiche de notes"
        message={`${subjectName ?? ''} — Trimestre ${termNumber}. La fiche sera verrouillée ; quand toutes les fiches de la classe sont signées, les bulletins sont préparés.`}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1,
  },
  subject: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  coefRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  coefLabel: { fontSize: fontSize.sm },
  coefInput: { borderWidth: 1.5, borderRadius: radius.sm, width: 52, paddingVertical: 4, textAlign: 'center', fontSize: fontSize.sm },
  locked: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    margin: spacing.md, marginBottom: 0, padding: spacing.sm, borderWidth: 1, borderRadius: radius.md,
  },
  lockedText: { flex: 1, color: '#047857', fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  unsign: { color: '#b91c1c', fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  tabs: { flexGrow: 0, borderBottomWidth: 1 },
  tabsContent: { gap: spacing.sm, padding: spacing.md },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1.5,
  },
  tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  progress: { height: 4 },
  progressFill: { height: 4 },
  count: { fontSize: fontSize.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1,
  },
  rowInfo: { flex: 1 },
  name: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  others: { fontSize: fontSize.xs, marginTop: 2 },
  input: { borderWidth: 1.5, borderRadius: radius.sm, width: 72, paddingVertical: spacing.xs, textAlign: 'center', fontSize: fontSize.md },
  empty: { textAlign: 'center', padding: spacing.xl, fontSize: fontSize.sm },
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
