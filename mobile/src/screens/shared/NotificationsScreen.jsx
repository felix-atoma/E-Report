import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { notificationsService } from '../../services/notificationsService';
import { useFocusEffect } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fontSize, fontWeight, spacing } from '../../theme';

const CHANNEL_ICON = {
  WHATSAPP: 'logo-whatsapp',
  EMAIL: 'mail-outline',
  IN_APP: 'notifications-outline',
  SMS: 'chatbubble-outline',
};

const STATUS_LABELS = {
  SENT: 'Envoyé',
  DELIVERED: 'Distribué',
  PENDING: 'En attente',
  FAILED: 'Échec',
  HELD: 'En attente de paiement',
};

function buildNotificationText(item) {
  const studentName = item.student?.user?.name ?? item.student?.admissionNumber ?? 'un élève';
  const termName = item.reportCard?.termName ?? 'un trimestre';
  const year = item.reportCard?.academicYear ? ` (${item.reportCard.academicYear})` : '';

  if (item.status === 'HELD') {
    return {
      title: `Bulletin disponible — ${studentName}`,
      body: `Le bulletin de ${termName}${year} est disponible mais retenu en attente du règlement des frais de scolarité.`,
    };
  }

  const statusLabel = STATUS_LABELS[item.status] ?? item.status;
  const channelLabel = item.channel === 'WHATSAPP' ? 'WhatsApp'
    : item.channel === 'EMAIL' ? 'e-mail'
    : item.channel === 'SMS' ? 'SMS'
    : 'notification';

  return {
    title: `Bulletin ${statusLabel.toLowerCase()} — ${studentName}`,
    body: `Le bulletin du ${termName}${year} a été envoyé par ${channelLabel}.`,
  };
}

function NotificationItem({ item, colors, onPress }) {
  const { title, body } = buildNotificationText(item);
  const channelIcon = CHANNEL_ICON[item.channel] ?? 'notifications-outline';
  const isHeld = item.status === 'HELD';

  const timeAgo = item.createdAt
    ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })
    : '';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={item.isRead ? 1 : 0.8}
      style={[
        styles.item,
        {
          backgroundColor: item.isRead ? colors.bg : colors.primary + '08',
          borderBottomColor: colors.border,
          borderLeftColor: isHeld ? colors.warning : item.isRead ? 'transparent' : colors.primary,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: (isHeld ? colors.warning : colors.primary) + '15' }]}>
        <Ionicons name={channelIcon} size={18} color={isHeld ? colors.warning : colors.primary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.itemBody, { color: colors.textMuted }]} numberOfLines={2}>
          {body}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={[styles.itemTime, { color: colors.textMuted }]}>{timeAgo}</Text>
          {!item.isRead && (
            <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsService.getMine();
      setNotifications(res.data.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(fetchNotifications);

  async function handleMarkRead(id) {
    await notificationsService.markRead(id).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  async function handleMarkAllRead() {
    await notificationsService.markAllRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      {unreadCount > 0 && (
        <View style={[styles.topBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
          <Text style={[styles.unreadLabel, { color: colors.textMuted }]}>
            {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={[styles.markAllBtn, { color: colors.primary }]}>Tout marquer lu</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Aucune notification pour le moment.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <NotificationItem
            item={item}
            colors={colors}
            onPress={() => !item.isRead && handleMarkRead(item.id)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  unreadLabel: { fontSize: fontSize.sm },
  markAllBtn: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: 2 },
  itemBody: { fontSize: fontSize.xs, marginBottom: spacing.xs, lineHeight: 18 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTime: { fontSize: fontSize.xs },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5 },
  empty: { padding: spacing['2xl'], alignItems: 'center', gap: spacing.md },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center' },
});
