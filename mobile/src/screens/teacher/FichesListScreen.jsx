import { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { classesService } from '../../services/classesService';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const TERMS = [
  { n: 1, label: 'Trimestre 1' },
  { n: 2, label: 'Trimestre 2' },
  { n: 3, label: 'Trimestre 3' },
];

function currentAcademicYear() {
  const m = new Date().getMonth(); // 0=Jan
  const y = new Date().getFullYear();
  return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export default function FichesListScreen({ route, navigation }) {
  const { classId, className } = route.params;
  const { colors } = useTheme();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [termNum, setTermNum]   = useState(1);
  const academicYear = currentAcademicYear();

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await classesService.getById(classId);
        setSubjects(res.data.data?.subjects ?? []);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [classId]));

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      {/* Term selector */}
      <View style={[styles.termBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        {TERMS.map((t) => (
          <TouchableOpacity
            key={t.n}
            onPress={() => setTermNum(t.n)}
            style={[
              styles.termBtn,
              termNum === t.n && { backgroundColor: colors.primary, borderColor: colors.primary },
              termNum !== t.n && { backgroundColor: 'transparent', borderColor: colors.border },
            ]}
          >
            <Text style={[styles.termBtnText, { color: termNum === t.n ? '#fff' : colors.textMuted }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Academic year label */}
      <View style={[styles.yearBar, { backgroundColor: colors.bgMuted }]}>
        <Text style={[styles.yearText, { color: colors.textMuted }]}>
          Année scolaire : {academicYear}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={subjects}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Aucune matière assignée à cette classe.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.subjectCard, { backgroundColor: colors.bg, borderColor: colors.border }]}
              onPress={() => navigation.navigate('FicheGradeEntry', {
                classId,
                className,
                subjectId: item.id ?? item.subjectId,
                subjectName: item.nameFr ?? item.subject?.nameFr ?? '—',
                academicYear,
                termNumber: termNum,
              })}
            >
              <View style={[styles.subjectIcon, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.subjectCode, { color: colors.primary }]}>
                  {(item.code ?? item.subject?.code ?? item.nameFr ?? '?').slice(0, 3).toUpperCase()}
                </Text>
              </View>
              <View style={styles.subjectInfo}>
                <Text style={[styles.subjectName, { color: colors.text }]}>
                  {item.nameFr ?? item.subject?.nameFr ?? '—'}
                </Text>
                <Text style={[styles.subjectMeta, { color: colors.textMuted }]}>
                  Coef. {item.defaultCoefficient ?? item.coefficient ?? '—'} · Trimestre {termNum}
                </Text>
              </View>
              <View style={[styles.arrow, { backgroundColor: colors.primary + '12' }]}>
                <Ionicons name="create-outline" size={16} color={colors.primary} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  termBar: {
    flexDirection: 'row', gap: spacing.sm,
    padding: spacing.md, borderBottomWidth: 1,
  },
  termBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.full,
    borderWidth: 1.5, alignItems: 'center',
  },
  termBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  yearBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  yearText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  list: { padding: spacing.lg },
  subjectCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md,
  },
  subjectIcon: {
    width: 48, height: 48, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  subjectCode: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  subjectInfo: { flex: 1 },
  subjectName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  subjectMeta: { fontSize: fontSize.xs, marginTop: 2 },
  arrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: spacing.md, paddingTop: spacing['3xl'] },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center' },
});
