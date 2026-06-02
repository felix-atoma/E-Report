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
import { paymentsService } from '../../services/paymentsService';
import { studentsService } from '../../services/studentsService';
import HeroHeader from '../../components/common/HeroHeader';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const METHOD_LABELS = {
  MOBILE_MONEY_TMONEY: 'TMoney', MOBILE_MONEY_FLOOZ: 'Flooz',
  MOBILE_MONEY_MOMO: 'MoMo', BANK_TRANSFER: 'Virement',
  CASH: 'Espèces', CHEQUE: 'Chèque', OTHER: 'Autre',
};

const METHOD_COLORS = {
  MOBILE_MONEY_TMONEY: '#f59e0b', MOBILE_MONEY_FLOOZ: '#10b981',
  MOBILE_MONEY_MOMO: '#f97316', BANK_TRANSFER: '#6366f1',
  CASH: '#64748b', CHEQUE: '#0ea5e9', OTHER: '#94a3b8',
};

const STATUS_COLORS = { PAID: '#10b981', PARTIAL: '#f59e0b', UNPAID: '#ef4444', EXEMPT: '#64748b' };
const STATUS_LABELS = { PAID: 'À jour', PARTIAL: 'Partiel', UNPAID: 'Non payé', EXEMPT: 'Exonéré' };

export default function BursarDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [payments, setPayments]     = useState([]);
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        paymentsService.getHistory(),
        studentsService.getAll(),
      ]);
      setPayments(pRes.data.data ?? []);
      setStudents(sRes.data.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(fetch);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const today = new Date().toDateString();
  const totalAmt   = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const todayAmt   = payments
    .filter((p) => new Date(p.paidAt ?? p.createdAt).toDateString() === today)
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const unpaidCount   = students.filter((s) => s.paymentStatus === 'UNPAID').length;
  const partialCount  = students.filter((s) => s.paymentStatus === 'PARTIAL').length;
  const recent        = [...payments].sort((a, b) => new Date(b.paidAt ?? b.createdAt) - new Date(a.paidAt ?? a.createdAt)).slice(0, 10);

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.primary }]}>
      <FlatList
        data={recent}
        keyExtractor={(p) => p.id}
        style={{ backgroundColor: colors.bgSubtle }}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetch(); }}
            tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            <HeroHeader greeting="Tableau de bord" name={user?.name ?? ''} subtitle="Comptabilité" />

            {/* Stats */}
            <View style={styles.statsGrid}>
              <View style={[styles.statBig, { backgroundColor: colors.bg }]}>
                <Text style={[styles.statBigLabel, { color: colors.textMuted }]}>Total encaissé</Text>
                <Text style={[styles.statBigNum, { color: '#10b981' }]}>
                  {totalAmt.toLocaleString('fr-FR')}
                </Text>
                <Text style={[styles.statCurrency, { color: colors.textMuted }]}>FCFA</Text>
              </View>
              <View style={styles.statsCol}>
                <View style={[styles.statSmall, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.statSmallLabel, { color: colors.textMuted }]}>Aujourd'hui</Text>
                  <Text style={[styles.statSmallNum, { color: colors.primary }]}>
                    {todayAmt.toLocaleString('fr-FR')} F
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <View style={[styles.statTiny, { backgroundColor: '#ef444415' }]}>
                    <Text style={[styles.statTinyNum, { color: '#ef4444' }]}>{unpaidCount}</Text>
                    <Text style={[styles.statTinyLabel, { color: '#ef4444' }]}>Non payés</Text>
                  </View>
                  <View style={[styles.statTiny, { backgroundColor: '#f59e0b15' }]}>
                    <Text style={[styles.statTinyNum, { color: '#f59e0b' }]}>{partialCount}</Text>
                    <Text style={[styles.statTinyLabel, { color: '#f59e0b' }]}>Partiels</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Quick actions */}
            <View style={styles.quickRow}>
              <TouchableOpacity onPress={() => navigation.navigate('RecordPayment')}
                style={[styles.quickBtn, { backgroundColor: '#10b981' }]}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.quickBtnText}>Enregistrer un paiement</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('StudentsPayment')}
                style={[styles.quickBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="people-outline" size={20} color="#fff" />
                <Text style={styles.quickBtnText}>Statuts des élèves</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Derniers paiements</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyPay}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucun paiement enregistré.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const methodColor = METHOD_COLORS[item.paymentMethod] ?? '#64748b';
          const date = new Date(item.paidAt ?? item.createdAt).toLocaleDateString('fr-FR');
          return (
            <View style={[styles.payItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <View style={[styles.payIcon, { backgroundColor: methodColor + '20' }]}>
                <Ionicons name="cash-outline" size={18} color={methodColor} />
              </View>
              <View style={styles.payInfo}>
                <Text style={[styles.payStudent, { color: colors.text }]} numberOfLines={1}>
                  {item.student?.user?.name ?? item.student?.admissionNumber ?? '—'}
                </Text>
                <Text style={[styles.payMeta, { color: colors.textMuted }]}>
                  {item.student?.class?.name ? `${item.student.class.name} · ` : ''}
                  {METHOD_LABELS[item.paymentMethod] ?? '—'} · {date}
                </Text>
              </View>
              {item.student?.paymentStatus && (
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.student.paymentStatus] + '15' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[item.student.paymentStatus] }]}>
                    {STATUS_LABELS[item.student.paymentStatus]}
                  </Text>
                </View>
              )}
              <Text style={[styles.payAmount, { color: '#10b981' }]}>
                +{Number(item.amount).toLocaleString('fr-FR')} F
              </Text>
            </View>
          );
        }}
        ListFooterComponent={<View style={{ height: spacing.xl }} />}
      />

      {/* FAB */}
      <TouchableOpacity onPress={() => navigation.navigate('RecordPayment')}
        style={[styles.fab, { backgroundColor: '#10b981' }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsGrid: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg,
  },
  statBig: {
    flex: 1.5, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: 2,
  },
  statBigLabel: { fontSize: fontSize.xs },
  statBigNum:   { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  statCurrency: { fontSize: fontSize.xs },
  statsCol: { flex: 1, gap: spacing.sm },
  statSmall: { flex: 1, borderRadius: radius.lg, padding: spacing.md },
  statSmallLabel: { fontSize: fontSize.xs },
  statSmallNum:   { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: 2 },
  statRow:  { flexDirection: 'row', gap: spacing.sm },
  statTiny: { flex: 1, borderRadius: radius.lg, padding: spacing.sm, alignItems: 'center' },
  statTinyNum:   { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  statTinyLabel: { fontSize: 9, marginTop: 1 },
  quickRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, borderRadius: radius.lg, paddingVertical: spacing.md,
  },
  quickBtnText: { color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  sectionTitle: {
    fontSize: fontSize.md, fontWeight: fontWeight.bold,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  payItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1, padding: spacing.md,
  },
  payIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  payInfo: { flex: 1 },
  payStudent: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  payMeta:    { fontSize: fontSize.xs, marginTop: 2 },
  statusBadge:{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  statusText: { fontSize: 10, fontWeight: fontWeight.semibold },
  payAmount:  { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  emptyPay: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: spacing.xl, right: spacing.lg,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },
});
