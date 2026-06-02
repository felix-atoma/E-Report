import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { bulletinsService } from '../../services/bulletinsService';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const AUDIENCE_LABELS = { ALL: 'Tous', ALL_PARENTS: 'Parents', CLASS: 'Classe' };

function BulletinCard({ item, colors, canEdit, onPublish, onDelete }) {
  const date = item.publishedAt
    ? new Date(item.publishedAt).toLocaleDateString('fr-FR')
    : 'Brouillon';

  return (
    <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardMeta}>
          <View style={[styles.audiencePill, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.audienceText, { color: colors.primary }]}>
              {AUDIENCE_LABELS[item.audience] ?? item.audience}
            </Text>
          </View>
          {item.class?.name && (
            <Text style={[styles.className, { color: colors.textMuted }]}>· {item.class.name}</Text>
          )}
        </View>
        <Text style={[styles.date, { color: colors.textMuted }]}>{date}</Text>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.content, { color: colors.textMuted }]} numberOfLines={3}>
        {item.content}
      </Text>

      {canEdit && !item.publishedAt && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => onPublish(item.id)}
            style={[styles.actionBtn, { backgroundColor: '#10b98115', borderColor: '#10b98140' }]}>
            <Ionicons name="send-outline" size={14} color="#10b981" />
            <Text style={[styles.actionText, { color: '#10b981' }]}>Publier</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(item.id)}
            style={[styles.actionBtn, { backgroundColor: colors.danger + '12', borderColor: colors.danger + '30' }]}>
            <Ionicons name="trash-outline" size={14} color={colors.danger} />
            <Text style={[styles.actionText, { color: colors.danger }]}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function AnnouncementsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const canEdit = ['ADMIN', 'TEACHER'].includes(user?.role);

  const [bulletins, setBulletins]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({ title: '', content: '', audience: 'ALL' });

  const fetch = useCallback(async () => {
    try {
      const res = await bulletinsService.list();
      setBulletins(res.data.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(fetch);

  async function handleCreate() {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Champs requis', 'Titre et contenu sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      await bulletinsService.create(form);
      setShowModal(false);
      setForm({ title: '', content: '', audience: 'ALL' });
      fetch();
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Impossible de créer l\'annonce.');
    } finally { setSaving(false); }
  }

  async function handlePublish(id) {
    try {
      await bulletinsService.publish(id);
      fetch();
    } catch { Alert.alert('Erreur', 'Impossible de publier.'); }
  }

  async function handleDelete(id) {
    Alert.alert('Supprimer', 'Supprimer cette annonce ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await bulletinsService.remove(id); fetch(); }
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
          data={bulletins}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetch(); }}
              tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="megaphone-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucune annonce.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <BulletinCard item={item} colors={colors} canEdit={canEdit}
              onPublish={handlePublish} onDelete={handleDelete} />
          )}
        />
      )}

      {canEdit && (
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={[styles.fab, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvelle annonce</Text>
            <TouchableOpacity onPress={handleCreate} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[styles.modalSave, { color: colors.primary }]}>Publier</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Audience */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Destinataires</Text>
            <View style={styles.audienceRow}>
              {['ALL', 'ALL_PARENTS', 'CLASS'].map((a) => (
                <TouchableOpacity key={a} onPress={() => setForm((f) => ({ ...f, audience: a }))}
                  style={[styles.audienceChip, {
                    backgroundColor: form.audience === a ? colors.primary : colors.bgMuted,
                    borderColor: form.audience === a ? colors.primary : colors.border,
                  }]}>
                  <Text style={[styles.audienceChipText, { color: form.audience === a ? '#fff' : colors.text }]}>
                    {AUDIENCE_LABELS[a]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Titre *</Text>
            <TextInput
              value={form.title}
              onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
              placeholder="Titre de l'annonce"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bgSubtle }]}
            />

            {/* Content */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Contenu *</Text>
            <TextInput
              value={form.content}
              onChangeText={(t) => setForm((f) => ({ ...f, content: t }))}
              multiline
              numberOfLines={8}
              placeholder="Rédigez votre annonce ici..."
              placeholderTextColor={colors.textMuted}
              style={[styles.textarea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bgSubtle }]}
            />
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
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.lg, marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardMeta:   { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  audiencePill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  audienceText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  className:    { fontSize: fontSize.xs },
  date:         { fontSize: fontSize.xs },
  title:        { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  content:      { fontSize: fontSize.sm, lineHeight: 20 },
  actions:      { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: 1,
  },
  actionText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
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
  fieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm, marginTop: spacing.md },
  audienceRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  audienceChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5,
  },
  audienceChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  input: {
    borderWidth: 1.5, borderRadius: radius.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md, fontSize: fontSize.md,
  },
  textarea: {
    borderWidth: 1.5, borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.sm,
    textAlignVertical: 'top', minHeight: 160,
  },
});
