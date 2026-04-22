import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import StatusPill from '../../components/common/StatusPill';
import { fontSize, fontWeight, spacing } from '../../theme';

export default function ParentDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchChildren() {
    try {
      const res = await api.get('/students', { params: { parentId: user.id } });
      setChildren(res.data.data ?? []);
    } catch {
      // TODO: error state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchChildren(); }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchChildren(); }} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>{greeting()},</Text>
          <Text style={[styles.name, { color: colors.text }]}>{user?.name}</Text>
        </View>

        {/* Children */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Mes enfants</Text>

        {children.length === 0 ? (
          <Card>
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              Aucun enfant associé à votre compte.
            </Text>
          </Card>
        ) : (
          children.map((child) => (
            <ChildCard
              key={child.id}
              child={child}
              colors={colors}
              onPress={() => navigation.navigate('ChildReports', { studentId: child.id, studentName: child.user?.name ?? child.admissionNumber })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ChildCard({ child, colors, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.childCard, { backgroundColor: colors.bg, borderColor: colors.border }]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarText}>
          {(child.user?.name ?? child.admissionNumber ?? '?')[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.childInfo}>
        <Text style={[styles.childName, { color: colors.text }]}>
          {child.user?.name ?? child.admissionNumber}
        </Text>
        <Text style={[styles.childMeta, { color: colors.textMuted }]}>
          N° {child.admissionNumber}
        </Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg },
  header: { marginBottom: spacing.xl },
  greeting: { fontSize: fontSize.sm },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginBottom: spacing.md },
  empty: { fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.md },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: fontWeight.bold, fontSize: fontSize.md },
  childInfo: { flex: 1 },
  childName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  childMeta: { fontSize: fontSize.sm, marginTop: 2 },
  chevron: { fontSize: 20 },
});
