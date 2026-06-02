import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { paymentsService } from '../../services/paymentsService';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const METHOD_LABELS = {
  CASH: 'Espèces', BANK_TRANSFER: 'Virement', MOBILE_MONEY: 'Mobile Money',
  CHEQUE: 'Chèque', OTHER: 'Autre',
};

const METHOD_ICONS = {
  CASH: 'cash-outline', BANK_TRANSFER: 'business-outline',
  MOBILE_MONEY: 'phone-portrait-outline', CHEQUE: 'document-text-outline', OTHER: 'ellipsis-horizontal',
};

function PaymentItem({ item, colors }) {
  const method = METHOD_LABELS[item.paymentMethod] ?? item.paymentMethod ?? '—';
  const icon   = METHOD_ICONS[item.paymentMethod] ?? 'receipt-outline';
  const amount = Number(item.amount ?? 0).toLocaleString('fr-FR');
  const date   = item.paidAt ? new Date(item.paidAt).toLocaleDateString('fr-FR') : '—';

  return (
    <View style={[styles.item, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: '#10b98115' }]}>
        <Ionicons name={icon} size={20} color="#10b981" />
      </View>
      <View style={styles.itemBody}>
        <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={1}>
          {item.student?.user?.name ?? item.student?.admissionNumber ?? '—'}
        </Text>
        <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
          {method} · {date}
        </Text>
        {item.reference && (
          <Text style={[styles.ref, { color: colors.textMuted }]}>Réf: {item.reference}</Text>
        )}
      </View>
      <View style={styles.amountCol}>
        <Text style={[styles.amount, { color: '#10b981' }]}>{amount}</Text>
        <Text style={[styles.currency, { color: colors.textMuted }]}>FCFA</Text>
      </View>
    </View>
  );
}

export default function PaymentHistoryScreen() {
  const { colors } = useTheme();
  const [payments, setPayments]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const res = await paymentsService.myHistory();
      setPayments(res.data.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(fetch);

  const total = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      {/* Total summary */}
      {payments.length > 0 && (
        <View style={[styles.summary, { backgroundColor: colors.primary }]}>
          <Text style={styles.summaryLabel}>Total payé</Text>
          <Text style={styles.summaryAmount}>{total.toLocaleString('fr-FR')} FCFA</Text>
          <Text style={styles.summaryCount}>{payments.length} paiement{payments.length !== 1 ? 's' : ''}</Text>
        </View>
      )}

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetch(); }}
            tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Aucun paiement enregistré.
            </Text>
          </View>
        }
        renderItem={({ item }) => <PaymentItem item={item} colors={colors} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summary: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryLabel:  { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.sm },
  summaryAmount: { color: '#ffffff', fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
  summaryCount:  { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.xs },
  list: { padding: spacing.lg, gap: spacing.sm },
  item: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.md, gap: spacing.md,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1 },
  studentName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  itemMeta: { fontSize: fontSize.xs, marginTop: 2 },
  ref: { fontSize: fontSize.xs, marginTop: 1 },
  amountCol: { alignItems: 'flex-end' },
  amount: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  currency: { fontSize: fontSize.xs },
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing['3xl'] },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center' },
});
