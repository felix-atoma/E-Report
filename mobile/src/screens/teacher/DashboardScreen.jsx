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
import { classesService } from '../../services/classesService';
import { reportsService } from '../../services/reportsService';
import HeroHeader from '../../components/common/HeroHeader';
import StatusPill from '../../components/common/StatusPill';
import { fontSize, fontWeight, radius, shadow, spacing } from '../../theme';

const ROLE_LABEL = { ADMIN: 'Admin', BURSAR: 'Comptable', TEACHER: 'Prof.' };
const CLASS_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour 👋';
  if (h < 18) return 'Bon après-midi 👋';
  return 'Bonsoir 👋';
}

export default function TeacherDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [classes, setClasses]   = useState([]);
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [clRes, rpRes] = await Promise.all([
        classesService.getAll(),
        reportsService.getAll(),
      ]);
      setClasses(clRes.data.data ?? []);
      setReports(rpRes.data.data ?? []);
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

  const pending   = reports.filter((r) => r.status === 'DRAFT' || r.status === 'REVIEW');
  const published = reports.filter((r) => r.status === 'PUBLISHED');
  const recent    = [...reports].sort((a, b) => new Date(b.updatedAt ?? b.createdAt) - new Date(a.updatedAt ?? a.createdAt)).slice(0, 6);
  const roleLabel = ROLE_LABEL[user?.role] ?? '';

  const sections = [
    {
      key: 'header',
      render: () => (
        <>
          <HeroHeader
            greeting={greeting()}
            name={`${roleLabel} ${user?.name ?? ''}`}
            subtitle={`${classes.length} classe${classes.length !== 1 ? 's' : ''}`}
          />
          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { num: classes.length, label: 'Classes',    color: colors.primary },
              { num: pending.length,   label: 'En cours',   color: '#f59e0b' },
              { num: published.length, label: 'Publiés',    color: '#10b981' },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: colors.bg }]}>
                <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Mes classes</Text>
        </>
      ),
    },
    ...classes.map((item, index) => ({ key: `class-${item.id}`, type: 'class', item, index })),
    {
      key: 'recentTitle',
      render: () => reports.length > 0 ? (
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.md }]}>
          Bulletins récents
        </Text>
      ) : null,
    },
    ...recent.map((r) => ({ key: `report-${r.id}`, type: 'report', item: r })),
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.primary }]}>
      <FlatList
        data={sections}
        keyExtractor={(s) => s.key}
        style={{ backgroundColor: colors.bgSubtle }}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAll(); }}
            tintColor={colors.primary} />
        }
        renderItem={({ item: section }) => {
          if (section.render) return section.render();

          if (section.type === 'class') {
            const { item, index } = section;
            const accent = CLASS_COLORS[index % CLASS_COLORS.length];
            const count = item._count?.students ?? item.studentCount ?? 0;
            return (
              <View style={{ paddingHorizontal: spacing.lg }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.classCard, shadow.sm, { backgroundColor: colors.bg }]}
                  onPress={() => navigation.navigate('ClassDetail', { classId: item.id, className: item.name })}
                >
                  <View style={[styles.classAccent, { backgroundColor: accent }]}>
                    <Text style={styles.classAccentText}>{item.name?.slice(0, 3) ?? 'CLS'}</Text>
                  </View>
                  <View style={styles.classInfo}>
                    <Text style={[styles.className, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.classMeta, { color: colors.textMuted }]}>
                      {count} élève{count !== 1 ? 's' : ''}
                      {item.academicYear ? ` · ${item.academicYear}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          }

          if (section.type === 'report') {
            const r = section.item;
            return (
              <View style={{ paddingHorizontal: spacing.lg }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.reportCard, shadow.sm, { backgroundColor: colors.bg }]}
                  onPress={() => navigation.navigate('TeacherReportCard', { reportId: r.id })}
                >
                  <View style={[styles.reportAccent, {
                    backgroundColor: r.status === 'PUBLISHED' ? '#10b981'
                      : r.status === 'REVIEW' ? '#f59e0b' : colors.border,
                  }]} />
                  <View style={styles.reportBody}>
                    <Text style={[styles.reportName, { color: colors.text }]} numberOfLines={1}>
                      {r.class?.name ?? '—'} — {r.termName ?? `Trimestre ${r.termNumber}`}
                    </Text>
                    <Text style={[styles.reportMeta, { color: colors.textMuted }]}>{r.academicYear}</Text>
                  </View>
                  <StatusPill status={r.status} />
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: spacing.xs }} />
                </TouchableOpacity>
              </View>
            );
          }

          return null;
        }}
        ListEmptyComponent={
          classes.length === 0 ? (
            <View style={styles.body}>
              <View style={[styles.emptyCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <Ionicons name="school-outline" size={40} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucune classe assignée.</Text>
              </View>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={{ height: spacing.xl }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body:   { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  statsRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  statCard:  { flex: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  statNum:   { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  statLabel: { fontSize: fontSize.xs, marginTop: 2, textAlign: 'center' },
  sectionTitle: {
    fontSize: fontSize.md, fontWeight: fontWeight.bold,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
  },
  classCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, marginBottom: spacing.md,
    overflow: 'hidden', gap: spacing.md, paddingRight: spacing.md,
  },
  classAccent:     { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  classAccentText: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  classInfo:       { flex: 1 },
  className:       { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  classMeta:       { fontSize: fontSize.xs, marginTop: 2 },
  reportCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, marginBottom: spacing.sm, overflow: 'hidden',
  },
  reportAccent: { width: 4, alignSelf: 'stretch' },
  reportBody:   { flex: 1, paddingVertical: spacing.md, paddingLeft: spacing.md },
  reportName:   { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  reportMeta:   { fontSize: fontSize.xs, marginTop: 2 },
  emptyCard: {
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.xl, alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.lg,
  },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center' },
});
