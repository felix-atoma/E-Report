import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { mockExamsService } from '../../services/mockExamsService';
import { classesService } from '../../services/classesService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const EXAM_TYPES = [
  { value: 'BLANC',  label: 'Composition blanche', color: '#64748b' },
  { value: 'CEPE',   label: 'CEPD',                color: '#10b981' },
  { value: 'BEPC',   label: 'BEPC',                color: '#3b82f6' },
  { value: 'BAC1',   label: 'BAC 1re',             color: '#8b5cf6' },
  { value: 'BAC2',   label: 'BAC Tle',             color: '#f59e0b' },
];

function typeConfig(t) { return EXAM_TYPES.find((e) => e.value === t) ?? EXAM_TYPES[0]; }

function currentAcademicYear() {
  const m = new Date().getMonth(), y = new Date().getFullYear();
  return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function OptionPicker({ label, options, value, onChange, colors }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.optRow}>
        {options.map((o) => (
          <TouchableOpacity key={o.value} onPress={() => onChange(o.value)}
            style={[styles.optChip, {
              backgroundColor: value === o.value ? (o.color ?? colors.primary) : colors.bgMuted,
              borderColor: value === o.value ? (o.color ?? colors.primary) : colors.border,
            }]}>
            <Text style={[styles.optText, { color: value === o.value ? '#fff' : colors.text }]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function MockExamsScreen({ navigation }) {
  const { colors } = useTheme();
  const [exams, setExams]           = useState([]);
  const [classes, setClasses]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({
    classId: '', academicYear: currentAcademicYear(),
    examType: 'BLANC', label: '', examDate: '',
  });

  const fetch = useCallback(async () => {
    try {
      const [exRes, clRes] = await Promise.all([
        mockExamsService.list(),
        classesService.getAll(),
      ]);
      setExams(exRes.data.data ?? []);
      setClasses(clRes.data.data ?? []);
      if (!form.classId && clRes.data.data?.length) {
        setForm((f) => ({ ...f, classId: clRes.data.data[0].id }));
      }
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(fetch);

  async function handleCreate() {
    if (!form.classId || !form.label.trim()) {
      Alert.alert('Champs requis', 'Classe et libellé sont obligatoires.'); return;
    }
    setSaving(true);
    try {
      await mockExamsService.create({
        classId: form.classId,
        academicYear: form.academicYear,
        examType: form.examType,
        label: form.label.trim(),
        ...(form.examDate ? { examDate: form.examDate } : {}),
      });
      setShowModal(false);
      setForm((f) => ({ ...f, label: '', examDate: '' }));
      fetch();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Impossible de créer.');
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    Alert.alert('Supprimer', 'Supprimer cet examen et toutes ses notes ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await mockExamsService.remove(id); fetch(); }
        catch { Alert.alert('Erreur', 'Impossible de supprimer.'); }
      }},
    ]);
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={exams}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetch(); }}
              tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="school-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Aucun examen blanc. Appuyez sur + pour créer.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const cfg = typeConfig(item.examType);
            return (
              <TouchableOpacity activeOpacity={0.8}
                onPress={() => navigation.navigate('MockExamDetail', { examId: item.id, examLabel: item.label })}
                style={[styles.card, { backgroundColor: colors.bg }]}
              >
                <View style={[styles.typeBadge, { backgroundColor: cfg.color }]}>
                  <Text style={styles.typeText}>{cfg.label}</Text>
                </View>
                <View style={styles.examInfo}>
                  <View style={styles.examTopRow}>
                    <Text style={[styles.examLabel, { color: colors.text }]}>{item.label}</Text>
                    <View style={[styles.examStatusBadge, {
                      backgroundColor: item.status === 'PUBLISHED' ? '#10b98115' : colors.bgMuted,
                    }]}>
                      <Text style={[styles.examStatusText, {
                        color: item.status === 'PUBLISHED' ? '#10b981' : colors.textMuted,
                      }]}>
                        {item.status === 'PUBLISHED' ? 'Publié' : 'Brouillon'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.examMeta, { color: colors.textMuted }]}>
                    {item.class?.name ?? '—'} · {item.academicYear}
                  </Text>
                  {item.examDate && (
                    <Text style={[styles.examDate, { color: colors.textMuted }]}>
                      {new Date(item.examDate).toLocaleDateString('fr-FR')}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity onPress={() => setShowModal(true)}
        style={[styles.fab, { backgroundColor: colors.primary }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvel examen</Text>
            <TouchableOpacity onPress={handleCreate} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[styles.modalSave, { color: colors.primary }]}>Créer</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <OptionPicker label="Type d'examen" options={EXAM_TYPES} value={form.examType}
              onChange={(v) => setForm((f) => ({ ...f, examType: v }))} colors={colors} />
            <OptionPicker label="Classe" options={classes.map((c) => ({ value: c.id, label: c.name }))}
              value={form.classId} onChange={(v) => setForm((f) => ({ ...f, classId: v }))} colors={colors} />
            <Input label="Libellé *" placeholder="Composition n°1 — Trimestre 2"
              value={form.label} onChangeText={(t) => setForm((f) => ({ ...f, label: t }))} />
            <Input label="Année académique" value={form.academicYear}
              onChangeText={(t) => setForm((f) => ({ ...f, academicYear: t }))} />
            <Input label="Date de l'examen (optionnel)" placeholder="JJ/MM/AAAA"
              value={form.examDate} onChangeText={(t) => setForm((f) => ({ ...f, examDate: t }))} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: spacing.lg },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, marginBottom: spacing.md,
    overflow: 'hidden', paddingRight: spacing.md, gap: spacing.sm,
  },
  typeBadge: { width: 80, alignItems: 'center', paddingVertical: spacing.lg },
  typeText:  { color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.bold, textAlign: 'center' },
  examInfo:  { flex: 1, paddingVertical: spacing.md },
  examTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  examLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, flex: 1 },
  examStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  examStatusText: { fontSize: 10, fontWeight: fontWeight.semibold },
  examMeta:  { fontSize: fontSize.xs, marginTop: 2 },
  examDate:  { fontSize: fontSize.xs, marginTop: 2 },
  deleteBtn: { padding: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing['3xl'] },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: spacing.xl, right: spacing.lg,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  modalSave:  { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  modalBody:  { padding: spacing.lg },
  fieldGroup: { marginBottom: spacing.md },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm },
  optRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1.5 },
  optText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
