import { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { studentsService } from '../../services/studentsService';
import { reportsService } from '../../services/reportsService';
import { bulletinsService } from '../../services/bulletinsService';
import HeroHeader from '../../components/common/HeroHeader';
import StatusPill from '../../components/common/StatusPill';
import { fontSize, fontWeight, radius, shadow, spacing } from '../../theme';

const STATUS_COLORS = { PAID: '#10b981', PARTIAL: '#f59e0b', UNPAID: '#ef4444', EXEMPT: '#64748b' };
const STATUS_LABELS = { PAID: 'À jour', PARTIAL: 'Partiel', UNPAID: 'Non payé', EXEMPT: 'Exonéré' };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour 👋';
  if (h < 18) return 'Bon après-midi 👋';
  return 'Bonsoir 👋';
}

export default function ParentDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [children, setChildren] = useState([]);
  const [reports, setReports]   = useState([]);
  const [bulletins, setBulletins] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [childRes, rpRes, bulRes] = await Promise.all([
        studentsService.myChildren(),
        reportsService.getAll(),
        bulletinsService.list(),
      ]);
      setChildren(childRes.data.data ?? []);
      setReports(rpRes.data.data ?? []);
      setBulletins(bulRes.data.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(fetchAll);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const published = reports.filter((r) => r.status === 'PUBLISHED');
  const held      = published.filter((r) => r.deliveryStatus === 'HELD_UNPAID' || r.deliveryStatus === 'HELD_PARTIAL');
  const recentReports = [...published].sort((a, b) => new Date(b.updatedAt ?? b.createdAt) - new Date(a.updatedAt ?? a.createdAt)).slice(0, 5);
  const recentBulletins = bulletins.filter((b) => b.publishedAt).slice(0, 3);

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.primary }]}>
      <FlatList
        data={[{ key: 'content' }]}
        keyExtractor={(i) => i.key}
        style={{ backgroundColor: colors.bgSubtle }}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAll(); }}
            tintColor={colors.primary} />
        }
        renderItem={() => (
          <View>
            <HeroHeader
              greeting={greeting()}
              name={user?.name ?? ''}
              subtitle={`${children.length} enfant${children.length !== 1 ? 's' : ''} suivi${children.length !== 1 ? 's' : ''}`}
            />

            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                { num: children.length,  label: 'Enfants',           color: colors.primary },
                { num: published.length, label: 'Bulletins publiés',  color: '#10b981' },
                { num: held.length,      label: 'En attente paiement', color: '#f59e0b' },
              ].map((s) => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Children list */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mes enfants</Text>
            {children.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <Ionicons name="people-outline" size={40} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Aucun enfant associé à votre compte.
                </Text>
              </View>
            ) : (
              children.map((child) => {
                const status = child.paymentStatus;
                const statusColor = STATUS_COLORS[status];
                const statusLabel = STATUS_LABELS[status];
                return (
                  <TouchableOpacity
                    key={child.id}
                    activeOpacity={0.8}
                    style={[styles.childCard, shadow.sm, { backgroundColor: colors.bg }]}
                    onPress={() => navigation.navigate('ChildReports', {
                      studentId: child.id,
                      studentName: child.user?.name ?? child.admissionNumber,
                    })}
                  >
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.avatarText}>
                        {(child.user?.name ?? child.admissionNumber ?? '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.childInfo}>
                      <Text style={[styles.childName, { color: colors.text }]} numberOfLines={1}>
                        {child.user?.name ?? child.admissionNumber}
                      </Text>
                      <Text style={[styles.childClass, { color: colors.textMuted }]}>
                        {child.class?.name ?? '—'} · N° {child.admissionNumber}
                      </Text>
                    </View>
                    {status && statusColor && (
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })
            )}

            {/* Recent reports */}
            {recentReports.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>
                  Bulletins récents
                </Text>
                {recentReports.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    activeOpacity={0.8}
                    style={[styles.reportCard, shadow.sm, { backgroundColor: colors.bg }]}
                    onPress={() => navigation.navigate('ChildReports', {
                      studentId: r.studentId,
                      studentName: r.student?.user?.name ?? r.student?.admissionNumber,
                    })}
                  >
                    <View style={[styles.reportAccent, {
                      backgroundColor: r.deliveryStatus === 'HELD_UNPAID' || r.deliveryStatus === 'HELD_PARTIAL'
                        ? '#f59e0b' : '#10b981',
                    }]} />
                    <View style={styles.reportBody}>
                      <Text style={[styles.reportName, { color: colors.text }]} numberOfLines={1}>
                        {r.student?.user?.name ?? r.student?.admissionNumber ?? '—'}
                      </Text>
                      <Text style={[styles.reportMeta, { color: colors.textMuted }]}>
                        {r.termName ?? `Trimestre ${r.termNumber}`} · {r.academicYear}
                      </Text>
                    </View>
                    <StatusPill status={r.deliveryStatus ?? r.status} />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Recent bulletins/announcements */}
            {recentBulletins.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>
                  Annonces récentes
                </Text>
                {recentBulletins.map((b) => (
                  <View key={b.id} style={[styles.bulletinCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <Text style={[styles.bulletinTitle, { color: colors.text }]} numberOfLines={2}>{b.title}</Text>
                    <Text style={[styles.bulletinDate, { color: colors.textMuted }]}>
                      {new Date(b.publishedAt).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                ))}
              </>
            )}

            <View style={{ height: spacing.xl }} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  statCard:  { flex: 1, borderRadius: radius.lg, padding: spacing.sm, alignItems: 'center' },
  statNum:   { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  statLabel: { fontSize: 9, marginTop: 2, textAlign: 'center' },
  sectionTitle: {
    fontSize: fontSize.md, fontWeight: fontWeight.bold,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
  },
  childCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, padding: spacing.md,
    marginHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.md,
  },
  avatar:     { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: fontWeight.bold, fontSize: fontSize.lg },
  childInfo:  { flex: 1 },
  childName:  { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  childClass: { fontSize: fontSize.xs, marginTop: 2 },
  statusBadge:{ paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  reportCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, marginHorizontal: spacing.lg, marginBottom: spacing.sm, overflow: 'hidden',
  },
  reportAccent: { width: 4, alignSelf: 'stretch' },
  reportBody:   { flex: 1, paddingVertical: spacing.md, paddingLeft: spacing.md },
  reportName:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  reportMeta:   { fontSize: fontSize.xs, marginTop: 2 },
  bulletinCard: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.sm, gap: spacing.md,
  },
  bulletinTitle: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  bulletinDate:  { fontSize: fontSize.xs, marginTop: 2 },
  emptyCard: {
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.xl, alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.lg,
  },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center' },
});
