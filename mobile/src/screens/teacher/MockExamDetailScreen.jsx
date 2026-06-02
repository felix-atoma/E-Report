import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { mockExamsService } from '../../services/mockExamsService';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const ACTIONS = [
  { screen: 'MockExamGrade',    icon: 'create-outline',   label: 'Saisie des notes',  desc: 'Entrer les notes par élève et matière', color: '#6366f1' },
  { screen: 'MockExamFiche',    icon: 'list-outline',     label: 'Fiches de notes',   desc: 'Saisie par matière (fiche)',            color: '#0ea5e9' },
  { screen: 'MockExamPalmares', icon: 'trophy-outline',   label: 'Palmares',          desc: 'Résultats officiels et classement',     color: '#f59e0b' },
  { screen: 'MockExamReleve',   icon: 'document-outline', label: 'Relevés de notes',  desc: 'Fiches individuelles par élève',        color: '#10b981' },
];

export default function MockExamDetailScreen({ route, navigation }) {
  const { examId, examLabel } = route.params;
  const { colors } = useTheme();
  const [exam, setExam]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await mockExamsService.get(examId);
      setExam(res.data.data ?? null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [examId]);

  useFocusEffect(load);

  async function handlePublish() {
    const isPublished = exam?.status === 'PUBLISHED';
    Alert.alert(
      isPublished ? 'Dépublier l\'examen' : 'Publier l\'examen',
      isPublished
        ? 'Les relevés ne seront plus accessibles aux élèves. Continuer ?'
        : 'Les résultats seront visibles. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: isPublished ? 'Dépublier' : 'Publier', onPress: async () => {
          setPublishing(true);
          try {
            if (isPublished) await mockExamsService.unpublish(examId);
            else await mockExamsService.publish(examId);
            load();
          } catch (err) {
            Alert.alert('Erreur', err.response?.data?.message ?? 'Impossible de modifier le statut.');
          } finally { setPublishing(false); }
        }},
      ],
    );
  }

  const isPublished = exam?.status === 'PUBLISHED';

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerLabel}>{examLabel}</Text>
        {loading ? (
          <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
        ) : (
          <View style={styles.headerMeta}>
            {exam?.class?.name && (
              <Text style={styles.headerClass}>{exam.class.name}</Text>
            )}
            <View style={[styles.statusBadge, {
              backgroundColor: isPublished ? '#10b98130' : 'rgba(255,255,255,0.15)',
            }]}>
              <Ionicons
                name={isPublished ? 'checkmark-circle' : 'time-outline'}
                size={12}
                color={isPublished ? '#6ee7b7' : 'rgba(255,255,255,0.8)'}
              />
              <Text style={[styles.statusText, {
                color: isPublished ? '#6ee7b7' : 'rgba(255,255,255,0.8)',
              }]}>
                {isPublished ? 'Publié' : 'Brouillon'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.screen}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(a.screen, { examId, examLabel })}
            style={[styles.actionCard, { backgroundColor: colors.bg }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: a.color + '15' }]}>
              <Ionicons name={a.icon} size={26} color={a.color} />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{a.label}</Text>
              <Text style={[styles.actionDesc, { color: colors.textMuted }]}>{a.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Publish toggle */}
      {!loading && (
        <View style={styles.publishWrap}>
          <TouchableOpacity
            onPress={handlePublish}
            disabled={publishing}
            style={[styles.publishBtn, {
              backgroundColor: isPublished ? colors.bgMuted : colors.primary,
              borderColor: isPublished ? colors.border : colors.primary,
              opacity: publishing ? 0.6 : 1,
            }]}
          >
            {publishing ? (
              <ActivityIndicator size="small" color={isPublished ? colors.textMuted : '#fff'} />
            ) : (
              <>
                <Ionicons
                  name={isPublished ? 'lock-open-outline' : 'send-outline'}
                  size={16}
                  color={isPublished ? colors.textMuted : '#fff'}
                />
                <Text style={[styles.publishBtnText, {
                  color: isPublished ? colors.textMuted : '#fff',
                }]}>
                  {isPublished ? 'Dépublier l\'examen' : 'Publier les résultats'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  header: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  headerLabel: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'center' },
  headerMeta:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  headerClass: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  actions: { padding: spacing.lg, gap: spacing.sm },
  actionCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.xl, padding: spacing.md, gap: spacing.md,
  },
  actionIcon:  { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  actionText:  { flex: 1 },
  actionLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  actionDesc:  { fontSize: fontSize.sm, marginTop: 2 },
  publishWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1.5,
    paddingVertical: spacing.md,
  },
  publishBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
