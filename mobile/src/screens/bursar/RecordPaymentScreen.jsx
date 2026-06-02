import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { paymentsService } from '../../services/paymentsService';
import { studentsService } from '../../services/studentsService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const METHODS = [
  { value: 'CASH',                label: 'Espèces',   color: '#64748b' },
  { value: 'MOBILE_MONEY_TMONEY', label: 'TMoney',    color: '#f59e0b' },
  { value: 'MOBILE_MONEY_FLOOZ',  label: 'Flooz',     color: '#10b981' },
  { value: 'MOBILE_MONEY_MOMO',   label: 'MoMo',      color: '#f97316' },
  { value: 'BANK_TRANSFER',       label: 'Virement',  color: '#6366f1' },
  { value: 'CHEQUE',              label: 'Chèque',    color: '#0ea5e9' },
  { value: 'OTHER',               label: 'Autre',     color: '#94a3b8' },
];

function currentAcademicYear() {
  const m = new Date().getMonth(), y = new Date().getFullYear();
  return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export default function RecordPaymentScreen({ route, navigation }) {
  const preSelectedStudent = route.params?.student ?? null;
  const { colors } = useTheme();

  const [students, setStudents]   = useState([]);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(preSelectedStudent);
  const [amount, setAmount]       = useState('');
  const [method, setMethod]       = useState('CASH');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [reference, setReference] = useState('');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useFocusEffect(useCallback(() => {
    studentsService.getAll()
      .then((r) => setStudents(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, []));

  const filtered = search.trim()
    ? students.filter((s) => {
        const n = (s.user?.name ?? s.admissionNumber ?? '').toLowerCase();
        return n.includes(search.toLowerCase());
      }).slice(0, 8)
    : [];

  async function handleSave() {
    if (!selected) { Alert.alert('Élève requis', 'Sélectionnez un élève.'); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { Alert.alert('Montant invalide', 'Entrez un montant valide.'); return; }
    setSaving(true);
    try {
      await paymentsService.record({
        studentId: selected.id,
        amount: amt,
        paymentMethod: method,
        academicYear,
        ...(reference.trim() ? { referenceNumber: reference.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      Alert.alert('Paiement enregistré',
        `${amt.toLocaleString('fr-FR')} FCFA pour ${selected.user?.name ?? selected.admissionNumber}`, [
        { text: 'Nouveau paiement', onPress: () => {
          setSelected(null); setAmount(''); setReference(''); setNotes(''); setSearch('');
        }},
        { text: 'Retour', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Impossible d\'enregistrer.');
    } finally { setSaving(false); }
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Student selector */}
          <Card>
            <Text style={[styles.label, { color: colors.text }]}>Élève *</Text>
            {selected ? (
              <TouchableOpacity onPress={() => setSelected(null)}
                style={[styles.selectedStudent, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {(selected.user?.name ?? selected.admissionNumber ?? '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, { color: colors.text }]}>
                    {selected.user?.name ?? selected.admissionNumber}
                  </Text>
                  <Text style={[styles.studentNum, { color: colors.textMuted }]}>N° {selected.admissionNumber}</Text>
                </View>
                <Text style={[styles.changeText, { color: colors.primary }]}>Changer</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Input
                  placeholder="Rechercher par nom ou numéro..."
                  value={search}
                  onChangeText={setSearch}
                />
                {loadingStudents ? (
                  <ActivityIndicator color={colors.primary} />
                ) : filtered.map((s) => (
                  <TouchableOpacity key={s.id} onPress={() => { setSelected(s); setSearch(''); }}
                    style={[styles.resultRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.resultName, { color: colors.text }]}>
                      {s.user?.name ?? s.admissionNumber}
                    </Text>
                    <Text style={[styles.resultNum, { color: colors.textMuted }]}>N° {s.admissionNumber}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </Card>

          {/* Amount */}
          <Card>
            <Input
              label="Montant (FCFA) *"
              placeholder="75 000"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
            <Input
              label="Année académique"
              value={academicYear}
              onChangeText={setAcademicYear}
            />
          </Card>

          {/* Payment method */}
          <Card>
            <Text style={[styles.label, { color: colors.text }]}>Mode de paiement</Text>
            <View style={styles.methodGrid}>
              {METHODS.map((m) => (
                <TouchableOpacity key={m.value} onPress={() => setMethod(m.value)}
                  style={[styles.methodChip, {
                    backgroundColor: method === m.value ? m.color : colors.bgMuted,
                    borderColor: method === m.value ? m.color : colors.border,
                  }]}>
                  <Text style={[styles.methodText, { color: method === m.value ? '#fff' : colors.text }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Reference & notes */}
          <Card>
            <Input label="Référence (optionnel)" placeholder="TXN-12345" value={reference} onChangeText={setReference} />
            <Input label="Notes (optionnel)" placeholder="Paiement trimestre 1..." value={notes} onChangeText={setNotes} />
          </Card>

          <Button title="Enregistrer le paiement" onPress={handleSave} loading={saving} fullWidth size="lg" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { padding: spacing.lg },
  label:  { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: spacing.md },
  selectedStudent: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.md, borderWidth: 1, padding: spacing.md,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: fontWeight.bold },
  studentInfo: { flex: 1 },
  studentName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  studentNum:  { fontSize: fontSize.xs, marginTop: 2 },
  changeText:  { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm, borderBottomWidth: 1,
  },
  resultName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  resultNum:  { fontSize: fontSize.xs },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  methodChip: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.full, borderWidth: 1.5,
  },
  methodText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
