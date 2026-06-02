import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { classesService } from '../../services/classesService';
import Card from '../../components/common/Card';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function TeacherDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchClasses() {
    try {
      const res = await classesService.getAll();
      setClasses(res.data.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchClasses(); }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgSubtle }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const roleLabel = user?.role === 'ADMIN' ? 'Admin' : user?.role === 'BURSAR' ? 'Comptable' : 'Prof.';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchClasses(); }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>{greeting()},</Text>
            <Text style={[styles.name, { color: colors.text }]}>{roleLabel} {user?.name}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {classes.length} classe{classes.length !== 1 ? 's' : ''} assignée{classes.length !== 1 ? 's' : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Card>
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              Aucune classe assignée pour le moment.
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.classCard, { backgroundColor: colors.bg, borderColor: colors.border }]}
            onPress={() => navigation.navigate('ClassDetail', { classId: item.id, className: item.name })}
          >
            <View style={[styles.classIcon, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.classIconLetter, { color: colors.primary }]}>
                {item.name?.charAt(0) ?? 'C'}
              </Text>
            </View>
            <View style={styles.classInfo}>
              <Text style={[styles.className, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.classMeta, { color: colors.textMuted }]}>
                {item._count?.students ?? item.studentCount ?? 0} élève{((item._count?.students ?? item.studentCount ?? 0) !== 1) ? 's' : ''}
                {item.academicYear ? ` · ${item.academicYear}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg },
  header: { marginBottom: spacing.xl },
  greeting: { fontSize: fontSize.sm },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.sm },
  empty: { fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.sm },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  classIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classIconLetter: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  classInfo: { flex: 1 },
  className: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  classMeta: { fontSize: fontSize.sm, marginTop: 2 },
});
