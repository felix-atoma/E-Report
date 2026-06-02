import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { notificationsService } from '../../services/notificationsService';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const CHANNEL_ICON = { WHATSAPP: 'logo-whatsapp', EMAIL: 'mail-outline', IN_APP: 'notifications-outline', SMS: 'chatbubble-outline' };
const CHANNEL_COLOR = { WHATSAPP: '#25D366', EMAIL: '#3b82f6', IN_APP: '#6366f1', SMS: '#f59e0b' };

const STATUS_CONFIG = {
  SENT:      { label: 'Envoyé',    color: '#10b981' },
  DELIVERED: { label: 'Distribué', color: '#10b981' },
  PENDING:   { label: 'En attente', color: '#f59e0b' },
  FAILED:    { label: 'Échec',     color: '#ef4444' },
  HELD:      { label: 'Retenu',    color: '#ef4444' },
};

function HeldCard({ item, colors, onForceSend, sending }) {
  const channel = item.channel ?? 'IN_APP';
  const chanIcon = CHANNEL_ICON[channel] ?? 'notifications-outline';
  const chanColor = CHANNEL_COLOR[channel] ?? colors.primary;
  const studentName = item.student?.user?.name ?? item.student?.admissionNumber ?? '—';
  const className = item.student?.classes?.[0]?.class?.name ?? item.student?.class?.name ?? '';
  const since = item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR') : '—';
  const termName = item.reportCard?.termName ?? item.reportCard?.term ?? '—';

  return (
    <View style={[styles.card, { backgroundColor: colors.bg, borderColor: '#ef444420' }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.chanIcon, { backgroundColor: chanColor + '15' }]}>
          <Ionicons name={chanIcon} size={18} color={chanColor} />
        </View>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{studentName}</Text>
          {className ? <Text style={[styles.cardSub, { color: colors.textMuted }]}>{className}</Text> : null}
        </View>
        <View style={[styles.heldBadge, { backgroundColor: '#ef444415' }]}>
          <Text style={[styles.heldText, { color: '#ef4444' }]}>Retenu</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.infoRow, { color: colors.textMuted }]}>
          <Text style={{ fontWeight: fontWeight.semibold, color: colors.text }}>Bulletin : </Text>
          {termName}
        </Text>
        <Text style={[styles.infoRow, { color: colors.textMuted }]}>
          <Text style={{ fontWeight: fontWeight.semibold, color: colors.text }}>Raison : </Text>
          {item.heldReason ?? 'Frais impayés'}
        </Text>
        <Text style={[styles.infoRow, { color: colors.textMuted }]}>
          <Text style={{ fontWeight: fontWeight.semibold, color: colors.text }}>En attente depuis : </Text>
          {since}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => onForceSend(item)}
        disabled={sending}
        style={[styles.forceBtn, { backgroundColor: colors.primary, opacity: sending ? 0.6 : 1 }]}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="send-outline" size={15} color="#fff" />
            <Text style={styles.forceBtnText}>Forcer l'envoi</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function LogCard({ item, colors }) {
  const channel = item.channel ?? 'IN_APP';
  const chanIcon = CHANNEL_ICON[channel] ?? 'notifications-outline';
  const chanColor = CHANNEL_COLOR[channel] ?? colors.primary;
  const status = STATUS_CONFIG[item.status] ?? { label: item.status, color: colors.textMuted };
  const name = item.student?.user?.name ?? item.student?.admissionNumber ?? item.recipient ?? '—';
  const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR') : '—';

  return (
    <View style={[styles.logCard, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
      <View style={[styles.chanIcon, { backgroundColor: chanColor + '15' }]}>
        <Ionicons name={chanIcon} size={16} color={chanColor} />
      </View>
      <View style={styles.logInfo}>
        <Text style={[styles.logName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.logDate, { color: colors.textMuted }]}>{date}</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: status.color + '15' }]}>
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>
    </View>
  );
}

export default function NotificationLogsScreen() {
  const { colors } = useTheme();
  const [tab, setTab]             = useState('held');
  const [held, setHeld]           = useState([]);
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [heldRes, mineRes] = await Promise.all([
        notificationsService.held(),
        notificationsService.getMine(),
      ]);
      setHeld(heldRes.data.data ?? []);
      setLogs(mineRes.data.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(load);

  function handleForceSend(item) {
    Alert.alert(
      'Forcer l\'envoi',
      `Envoyer le bulletin de ${item.student?.user?.name ?? item.student?.admissionNumber ?? 'cet élève'} maintenant, même si les frais ne sont pas réglés ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Envoyer', style: 'default', onPress: async () => {
          setSendingId(item.id);
          try {
            await notificationsService.forceSend(item.id);
            Alert.alert('Envoyé', 'La notification a été envoyée.');
            load();
          } catch (err) {
            Alert.alert('Erreur', err.response?.data?.message ?? 'Impossible d\'envoyer.');
          } finally { setSendingId(null); }
        }},
      ],
    );
  }

  const data   = tab === 'held' ? held : logs;
  const isHeld = tab === 'held';

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        {[
          { key: 'held', label: 'En attente', count: held.length },
          { key: 'log',  label: 'Journal',    count: null },
        ].map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
            style={[styles.tab, { borderBottomColor: tab === t.key ? colors.primary : 'transparent' }]}>
            <Text style={[styles.tabText, { color: tab === t.key ? colors.primary : colors.textMuted }]}>
              {t.label}
            </Text>
            {t.count != null && t.count > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: '#ef4444' }]}>
                <Text style={styles.tabBadgeText}>{t.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={isHeld ? styles.heldList : undefined}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name={isHeld ? 'checkmark-circle-outline' : 'notifications-off-outline'}
                size={48}
                color={colors.border}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {isHeld
                  ? 'Aucune notification en attente — tous les bulletins ont été envoyés.'
                  : 'Aucune notification dans le journal.'}
              </Text>
            </View>
          }
          renderItem={({ item }) =>
            isHeld ? (
              <HeldCard
                item={item}
                colors={colors}
                onForceSend={handleForceSend}
                sending={sendingId === item.id}
              />
            ) : (
              <LogCard item={item} colors={colors} />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, gap: spacing.xs, borderBottomWidth: 2,
  },
  tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.full },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: fontWeight.bold },
  heldList: { padding: spacing.lg, gap: spacing.md },
  card: {
    borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  chanIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1 },
  cardName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  cardSub:  { fontSize: fontSize.xs, marginTop: 1 },
  heldBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  heldText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  cardBody: { gap: 4, marginBottom: spacing.md },
  infoRow: { fontSize: fontSize.sm },
  forceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, borderRadius: radius.md, paddingVertical: spacing.sm,
  },
  forceBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  logCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, gap: spacing.md,
  },
  logInfo: { flex: 1 },
  logName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  logDate: { fontSize: fontSize.xs, marginTop: 2 },
  statusPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing['3xl'], paddingHorizontal: spacing.xl },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center' },
});
