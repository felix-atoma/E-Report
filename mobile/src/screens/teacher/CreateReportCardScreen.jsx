import { useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { reportsService } from '../../services/reportsService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const TERM_TYPES = [
  { value: 'TRIMESTRE', label: 'Trimestre (3 périodes)' },
  { value: 'SEMESTRE',  label: 'Semestre (2 périodes)' },
  { value: 'CUSTOM',    label: 'Personnalisé' },
];

const TERM_NUMBERS = {
  TRIMESTRE: [1, 2, 3],
  SEMESTRE:  [1, 2],
  CUSTOM:    [1, 2, 3, 4, 5, 6],
};

function OptionPicker({ label, options, value, onChange, colors }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[
                styles.optionChip,
                {
                  backgroundColor: selected ? colors.primary : colors.bgMuted,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.optionText, { color: selected ? '#fff' : colors.text }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function CreateReportCardScreen({ route, navigation }) {
  const { classId, className } = route.params;
  const { colors } = useTheme();

  const currentYear = new Date().getFullYear();
  const defaultYear = `${currentYear}-${currentYear + 1}`;

  const [termType, setTermType]     = useState('TRIMESTRE');
  const [termNumber, setTermNumber] = useState(1);
  const [academicYear, setAcademicYear] = useState(defaultYear);
  const [termName, setTermName]     = useState('');
  const [saving, setSaving]         = useState(false);

  const numbers = TERM_NUMBERS[termType].map((n) => ({
    value: n,
    label: termType === 'TRIMESTRE' ? `Trimestre ${n}`
         : termType === 'SEMESTRE'  ? `Semestre ${n}`
         : `Période ${n}`,
  }));

  async function handleCreate() {
    if (!academicYear.match(/^\d{4}-\d{4}$/)) {
      Alert.alert('Format invalide', "Année académique : format attendu 2024-2025");
      return;
    }
    setSaving(true);
    try {
      await reportsService.create({
        classId,
        academicYear,
        termType,
        termNumber,
        ...(termName.trim() ? { termName: termName.trim() } : {}),
      });
      Alert.alert(
        'Bulletins créés',
        `Les bulletins pour ${className} ont été créés en brouillon.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Impossible de créer les bulletins.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <Text style={[styles.classLabel, { color: colors.textMuted }]}>Classe</Text>
          <Text style={[styles.className, { color: colors.text }]}>{className}</Text>
        </Card>

        <Card>
          <OptionPicker
            label="Type de période"
            options={TERM_TYPES}
            value={termType}
            onChange={(v) => { setTermType(v); setTermNumber(1); }}
            colors={colors}
          />
        </Card>

        <Card>
          <OptionPicker
            label="Numéro de période"
            options={numbers}
            value={termNumber}
            onChange={setTermNumber}
            colors={colors}
          />
        </Card>

        <Card>
          <Input
            label="Année académique"
            placeholder="2024-2025"
            value={academicYear}
            onChangeText={setAcademicYear}
            keyboardType="numbers-and-punctuation"
          />
          <Input
            label="Nom personnalisé (optionnel)"
            placeholder="ex. Trimestre 1 — 2024"
            value={termName}
            onChangeText={setTermName}
          />
        </Card>

        <View style={[styles.infoBox, { backgroundColor: colors.info + '10', borderColor: colors.info + '30' }]}>
          <Text style={[styles.infoText, { color: colors.info }]}>
            ℹ Les bulletins seront créés en brouillon pour tous les élèves de la classe. Vous pourrez ensuite saisir les notes individuellement.
          </Text>
        </View>

        <Button
          title="Créer les bulletins"
          onPress={handleCreate}
          loading={saving}
          fullWidth
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { padding: spacing.lg },
  classLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', marginBottom: 4 },
  className:  { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  fieldGroup: { marginBottom: spacing.sm },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm },
  optionRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  optionText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  infoBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoText: { fontSize: fontSize.sm, lineHeight: 20 },
});
