import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { classesService } from '../../services/classesService';
import { attendanceService } from '../../services/attendanceService';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

const STATUSES = [
  { value: 'PRESENT',  label: 'P',  color: '#10b981', title: 'Présent'  },
  { value: 'ABSENT',   label: 'A',  color: '#ef4444', title: 'Absent'   },
  { value: 'LATE',     label: 'R',  color: '#f59e0b', title: 'Retard'   },
  { value: 'EXCUSED',  label: 'E',  color: '#6366f1', title: 'Excusé'   },
];

const WEEKDAYS = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];

function toDateStr(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d, n) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

export default function AttendanceScreen({ route }) {
  const { classId, className } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();

  const [date, setDate]         = useState(new Date());
  const [cls, setCls]           = useState(null);
  const [timetable, setTimetable] = useState([]);
  const [subjectId, setSubjectId] = useState(null);   // null = pas encore choisi, '' = journée entière
  const [startTime, setStartTime] = useState('');
  const [records, setRecords]   = useState({});   // studentId → status
  const [lateMinutes, setLateMinutes] = useState({}); // studentId → "15"
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  // Charge la classe (élèves + matières) et l'emploi du temps une seule fois
  useEffect(() => {
    (async () => {
      try {
        const classRes = await classesService.getById(classId);
        const c = classRes.data.data;
        setCls(c);
        if (c?.academicYear) {
          const tt = await attendanceService.timetable(classId, c.academicYear).catch(() => null);
          setTimetable(tt?.data?.data ?? []);
        }
      } catch { /* silent */ }
    })();
  }, [classId]);

  const students = (cls?.students ?? []).map((cs) => cs.student ?? cs);

  // Le titulaire peut saisir pour toute matière ou la journée entière ; un prof de matière pour les siennes
  const isTitulaire = user?.role === 'ADMIN' || (cls && cls.teacherId === user?.id);
  const subjectOptions = (cls?.subjects ?? [])
    .filter((cs) => isTitulaire || cs.teacher?.id === user?.id)
    .map((cs) => ({ value: cs.subject.id, label: cs.subject.nameFr }));

  useEffect(() => {
    if (!cls || subjectId !== null) return;
    setSubjectId(isTitulaire ? '' : (subjectOptions[0]?.value ?? ''));
  }, [cls]); // eslint-disable-line react-hooks/exhaustive-deps

  const weekday = WEEKDAYS[date.getDay()];
  const slotOptions = timetable
    .filter((s) => s.dayOfWeek === weekday && (!subjectId || s.subjectId === subjectId))
    .map((s) => ({ value: s.startTime, label: `${s.startTime}–${s.endTime}` }));

  useEffect(() => {
    setStartTime(slotOptions[0]?.value ?? '');
  }, [subjectId, weekday, timetable.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    if (subjectId === null) return;
    setLoading(true);
    try {
      const attRes = await attendanceService.listByClass(classId, {
        date: toDateStr(date), subjectId: subjectId || '', startTime: startTime || '',
      });
      const existing = {};
      const mins = {};
      (attRes.data.data ?? []).forEach((r) => {
        existing[r.studentId] = r.status;
        if (r.minutesLate) mins[r.studentId] = String(r.minutesLate);
      });
      setRecords(existing);
      setLateMinutes(mins);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [classId, date, subjectId, startTime]);

  useFocusEffect(load);

  function mark(studentId, status) {
    setRecords((prev) => ({ ...prev, [studentId]: status }));
  }

  function markAll(status) {
    const all = {};
    students.forEach((s) => { all[s.id] = status; });
    setRecords(all);
  }

  async function handleSave() {
    const missing = students.some((s) => records[s.id] === 'LATE' && !(Number(lateMinutes[s.id]) > 0));
    if (missing) {
      Alert.alert('Retards', 'Indiquez la durée (en minutes) de chaque retard.');
      return;
    }
    if (!isTitulaire && !subjectId) {
      Alert.alert('Matière', 'Aucune matière ne vous est attribuée dans cette classe.');
      return;
    }
    const payload = {
      classId,
      date: toDateStr(date),
      subjectId: subjectId || undefined,
      startTime: startTime || undefined,
      entries: students.map((s) => {
        const status = records[s.id] ?? 'PRESENT';
        return {
          studentId: s.id,
          status,
          minutesLate: status === 'LATE' ? Number(lateMinutes[s.id]) : undefined,
        };
      }),
    };
    setSaving(true);
    try {
      await attendanceService.bulkUpsert(payload);
      Alert.alert('Enregistré', 'Les présences ont été sauvegardées.');
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.message ?? 'Erreur lors de la sauvegarde.');
    } finally { setSaving(false); }
  }

  const present = students.filter((s) => (records[s.id] ?? 'PRESENT') === 'PRESENT').length;
  const absent  = students.filter((s) => records[s.id] === 'ABSENT').length;

  const dayLabel = (d) => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: colors.bgSubtle }]}>
      {/* Date navigator */}
      <View style={[styles.dateBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setDate(addDays(date, -1))} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.dateLabel, { color: colors.text }]}>{dayLabel(date)}</Text>
        <TouchableOpacity onPress={() => setDate(addDays(date, 1))} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Séance : matière + heure */}
      {cls && (
        <View style={[styles.sessionBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {isTitulaire && (
              <Chip label="Journée entière" active={subjectId === ''} onPress={() => setSubjectId('')} colors={colors} />
            )}
            {subjectOptions.map((o) => (
              <Chip key={o.value} label={o.label} active={subjectId === o.value}
                onPress={() => setSubjectId(o.value)} colors={colors} />
            ))}
          </ScrollView>
          {slotOptions.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {slotOptions.map((o) => (
                <Chip key={o.value} label={o.label} active={startTime === o.value}
                  onPress={() => setStartTime(o.value)} colors={colors} />
              ))}
            </ScrollView>
          )}
          {!isTitulaire && subjectOptions.length === 0 && (
            <Text style={[styles.hint, { color: '#b45309' }]}>Aucune matière ne vous est attribuée dans cette classe.</Text>
          )}
        </View>
      )}

      {/* Stats */}
      <View style={[styles.statsRow, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: '#10b981' }]}>{present}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Présents</Text>
        </View>
        <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: '#ef4444' }]}>{absent}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Absents</Text>
        </View>
        <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.text }]}>{students.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
        </View>
      </View>

      {/* Bulk actions */}
      <View style={[styles.bulkRow, { backgroundColor: colors.bgMuted, borderBottomColor: colors.border }]}>
        <Text style={[styles.bulkLabel, { color: colors.textMuted }]}>Tout marquer :</Text>
        <TouchableOpacity onPress={() => markAll('PRESENT')}
          style={[styles.bulkBtn, { backgroundColor: '#10b98120', borderColor: '#10b981' }]}>
          <Text style={{ color: '#10b981', fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>Présent</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => markAll('ABSENT')}
          style={[styles.bulkBtn, { backgroundColor: '#ef444420', borderColor: '#ef4444' }]}>
          <Text style={{ color: '#ef4444', fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>Absent</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item, index }) => {
            const status = records[item.id] ?? 'PRESENT';
            const cfg = STATUSES.find((s) => s.value === status) ?? STATUSES[0];
            return (
              <View style={[
                styles.studentRow,
                { borderBottomColor: colors.border, backgroundColor: index % 2 === 0 ? colors.bg : colors.bgSubtle }
              ]}>
                <View style={[styles.avatar, { backgroundColor: cfg.color + '20' }]}>
                  <Text style={[styles.avatarText, { color: cfg.color }]}>
                    {(item.user?.name ?? item.admissionNumber ?? '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={1}>
                    {item.user?.name ?? item.admissionNumber}
                  </Text>
                  <Text style={[styles.studentNum, { color: colors.textMuted }]}>N° {item.admissionNumber}</Text>
                  {status === 'LATE' && (
                    <View style={styles.lateRow}>
                      <TextInput
                        value={lateMinutes[item.id] ?? ''}
                        onChangeText={(v) => setLateMinutes((prev) => ({ ...prev, [item.id]: v.replace(/[^0-9]/g, '') }))}
                        keyboardType="number-pad"
                        placeholder="15"
                        placeholderTextColor={colors.textMuted}
                        maxLength={3}
                        style={[styles.lateInput, { color: colors.text, borderColor: '#f59e0b' }]}
                      />
                      <Text style={styles.lateUnit}>min de retard</Text>
                    </View>
                  )}
                </View>
                <View style={styles.statusButtons}>
                  {STATUSES.map((s) => (
                    <TouchableOpacity
                      key={s.value}
                      onPress={() => mark(item.id, s.value)}
                      style={[
                        styles.statusBtn,
                        status === s.value
                          ? { backgroundColor: s.color, borderColor: s.color }
                          : { backgroundColor: 'transparent', borderColor: colors.border },
                      ]}
                    >
                      <Text style={[
                        styles.statusBtnText,
                        { color: status === s.value ? '#fff' : colors.textMuted },
                      ]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Save button */}
      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Enregistrer les présences</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress, colors }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { backgroundColor: 'transparent', borderColor: colors.border },
      ]}
    >
      <Text style={{ color: active ? '#fff' : colors.text, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  sessionBar: { paddingVertical: spacing.sm, borderBottomWidth: 1, gap: spacing.xs },
  chips: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: 1,
  },
  hint: { fontSize: fontSize.xs, paddingHorizontal: spacing.lg },
  lateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  lateInput: {
    width: 52, borderWidth: 1.5, borderRadius: radius.sm,
    paddingVertical: 2, paddingHorizontal: 6, fontSize: fontSize.sm,
  },
  lateUnit: { fontSize: fontSize.xs, color: '#b45309', fontWeight: fontWeight.semibold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  dateBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderBottomWidth: 1,
  },
  dateArrow: { padding: spacing.sm },
  dateLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  statsRow: {
    flexDirection: 'row', paddingVertical: spacing.md, borderBottomWidth: 1,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  statLabel: { fontSize: fontSize.xs, marginTop: 2 },
  statDiv: { width: 1, marginVertical: spacing.xs },
  bulkRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderBottomWidth: 1, gap: spacing.sm,
  },
  bulkLabel: { fontSize: fontSize.xs, flex: 1 },
  bulkBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: 1,
  },
  studentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: 1, gap: spacing.md,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  studentInfo: { flex: 1 },
  studentName: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  studentNum: { fontSize: fontSize.xs, marginTop: 2 },
  statusButtons: { flexDirection: 'row', gap: 4 },
  statusBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  statusBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.md, borderTopWidth: 1,
  },
  saveBtn: { borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
