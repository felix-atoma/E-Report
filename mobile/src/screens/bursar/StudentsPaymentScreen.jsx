import { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { studentsService } from '../../services/studentsService';
import Input from '../../components/common/Input';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const STATUS_CONFIG = {
  ALL:     { label: 'Tous',      color: null },
  UNPAID:  { label: 'Non payés', color: '#ef4444' },
  PARTIAL: { label: 'Partiels',  color: '#f59e0b' },
  PAID:    { label: 'À jour',    color: '#10b981' },
  EXEMPT:  { label: 'Exonérés', color: '#64748b' },
};

const STATUS_LABELS = { PAID: 'À jour', PARTIAL: 'Partiel', UNPAID: 'Non payé', EXEMPT: 'Exonéré' };
const STATUS_COLORS = { PAID: '#10b981', PARTIAL: '#f59e0b', UNPAID: '#ef4444', EXEMPT: '#64748b' };

export default function StudentsPaymentScreen({ navigation }) {
  const { colors } = useTheme();
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState('ALL');
  const [search, setSearch]         = useState('');

  const load = useCallback(async () => {
    try {
      const res = await studentsService.getAll();
      setStudents(res.data.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(load);

  const visible = students.filter((s) => {
    const matchStatus = filter === 'ALL' || s.paymentStatus === filter;
    const term = search.trim().toLowerCase();
    const matchSearch = !term || (s.user?.name ?? s.admissionNumber ?? '').toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  const counts = {
    ALL:     students.length,
    UNPAID:  students.filter((s) => s.paymentStatus === 'UNPAID').length,
    PARTIAL: students.filter((s) => s.paymentStatus === 'PARTIAL').length,
    PAID:    students.filter((s) => s.paymentStatus === 'PAID').length,
    EXEMPT:  students.filter((s) => s.paymentStatus === 'EXEMPT').length,
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <Input
          placeholder="Rechercher un élève..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Status filter chips */}
      <FlatList
        horizontal
        data={Object.entries(STATUS_CONFIG)}
        keyExtractor={([k]) => k}
        style={[styles.filterBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}
        contentContainerStyle={styles.filterContent}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item: [key, cfg] }) => {
          const active = filter === key;
          const chipColor = cfg.color ?? colors.primary;
          return (
            <TouchableOpacity onPress={() => setFilter(key)}
              style={[styles.filterChip, {
                backgroundColor: active ? chipColor : colors.bgMuted,
                borderColor: active ? chipColor : colors.border,
              }]}>
              <Text style={[styles.filterText, { color: active ? '#fff' : colors.textMuted }]}>
                {cfg.label} ({counts[key]})
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucun élève trouvé.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const status = item.paymentStatus ?? 'UNPAID';
            const statusColor = STATUS_COLORS[status] ?? colors.textMuted;
            const statusLabel = STATUS_LABELS[status] ?? status;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('RecordPayment', { student: item })}
                style={[styles.card, { backgroundColor: colors.bg }]}
              >
                <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
                <View style={[styles.avatar, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.avatarText, { color: statusColor }]}>
                    {(item.user?.name ?? item.admissionNumber ?? '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, { color: colors.text }]}>
                    {item.user?.name ?? item.admissionNumber}
                  </Text>
                  <Text style={[styles.studentMeta, { color: colors.textMuted }]}>
                    {item.class?.name ?? '—'} · N° {item.admissionNumber}
                  </Text>
                </View>
                <View style={styles.rightCol}>
                  <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchWrap:  { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  filterBar:   { maxHeight: 48, borderBottomWidth: 1 },
  filterContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  filterChip: {
    paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md,
    borderRadius: radius.full, borderWidth: 1.5,
  },
  filterText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  list: { padding: spacing.lg },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, marginBottom: spacing.sm,
    overflow: 'hidden', gap: spacing.md, paddingRight: spacing.md,
  },
  statusBar: { width: 4, alignSelf: 'stretch' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  studentInfo: { flex: 1, paddingVertical: spacing.md },
  studentName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  studentMeta: { fontSize: fontSize.xs, marginTop: 2 },
  rightCol: { alignItems: 'center' },
  statusPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing['3xl'] },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center' },
});
