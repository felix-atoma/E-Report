import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

// Mêmes règles que le tableau de bord du site : annoncée 7 jours avant, rappelée jusqu'à 30 jours après ;
// fiches toujours incomplètes 3 jours après → en retard (rouge qui clignote).
const DAYS_BEFORE = 7;
const OVERDUE_AFTER = 3;
const DAYS_AFTER = 30;
const DAY_MS = 86400000;

const TYPE_LABEL = { INTERROGATION: 'Interrogation', DEVOIR: 'Devoir', COMPOSITION: 'Composition', EXAM: 'Examen' };
const COLUMN_LABEL = {
  noteInterro1: 'Interro 1', noteInterro2: 'Interro 2', noteInterro3: 'Interro 3', noteInterro4: 'Interro 4',
  noteDevoir: 'Devoir', noteComposition: 'Composition',
};

const dayOf = (iso) => Date.parse(String(iso).slice(0, 10));
function localToday() {
  const d = new Date();
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}
const fmt = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

function Pulse({ active, children, style }) {
  const value = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) return undefined;
    let loop;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(value, { toValue: 0.55, duration: 800, useNativeDriver: true }),
        Animated.timing(value, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]));
      loop.start();
    });
    return () => loop?.stop();
  }, [active, value]);
  return <Animated.View style={[style, active && { opacity: value }]}>{children}</Animated.View>;
}

/**
 * Évaluations programmées par l'administration dont les notes ne sont pas encore toutes saisies
 * (ou, pour la composition, la fiche pas signée). `onOpenFiche(fiche)` ouvre la fiche concernée.
 */
export default function EvaluationAlerts({ events, onOpenFiche }) {
  const today = localToday();
  const alerts = (events ?? [])
    .filter((ev) => !ev.complete)
    .map((ev) => {
      const daysUntil = Math.round((dayOf(ev.startDate) - today) / DAY_MS);
      const daysSinceEnd = Math.round((today - dayOf(ev.endDate || ev.startDate)) / DAY_MS);
      return { ...ev, daysUntil, daysSinceEnd, due: daysUntil <= 0, overdue: daysSinceEnd >= OVERDUE_AFTER };
    })
    .filter((ev) => ev.daysUntil <= DAYS_BEFORE && ev.daysSinceEnd <= DAYS_AFTER)
    .sort((a, b) => (b.overdue - a.overdue) || (b.due - a.due) || (a.daysUntil - b.daysUntil));

  if (!alerts.length) return null;
  const anyOverdue = alerts.some((ev) => ev.overdue);

  return (
    <View style={[styles.card, anyOverdue ? styles.cardLate : styles.cardDue]}>
      <Text style={[styles.title, { color: anyOverdue ? '#991b1b' : '#9a3412' }]}>🔔 Évaluations — notes à saisir</Text>
      {alerts.map((ev) => (
        <Pulse key={ev.id} active={ev.overdue} style={[styles.item, ev.overdue ? styles.itemLate : ev.due ? styles.itemDue : null]}>
          <View style={styles.itemHead}>
            <Text style={[styles.kind, ev.overdue && styles.kindLate]}>{TYPE_LABEL[ev.type] ?? ev.type}</Text>
            <Text style={styles.itemTitle} numberOfLines={2}>{ev.title}</Text>
          </View>
          <Text style={styles.meta}>📅 {fmt(ev.startDate)}</Text>
          <Text style={[styles.status, { color: ev.overdue ? '#b91c1c' : '#9a3412' }]}>
            {ev.overdue
              ? `⚠️ En retard de ${ev.daysSinceEnd} jour(s) — saisissez les notes sans attendre`
              : ev.due ? '⏰ C\'est le moment de saisir les notes' : `Prévue dans ${ev.daysUntil} jour(s)`}
          </Text>
          {ev.due && ev.fiches.filter((f) => !f.complete).map((f) => (
            <TouchableOpacity key={`${f.classId}-${f.subjectId}`} style={styles.fiche} onPress={() => onOpenFiche(f)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ficheName} numberOfLines={1}>🏫 {f.className} · {f.subjectName}</Text>
                <Text style={styles.ficheCol}>{COLUMN_LABEL[f.column] ?? f.column}</Text>
              </View>
              <Text style={[styles.ficheCount, ev.overdue && { color: '#b91c1c' }]}>
                {f.missing === 'SIGNATURE' ? '✍️ À signer' : `${f.filled}/${f.total}`}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={ev.overdue ? '#b91c1c' : '#ea580c'} />
            </TouchableOpacity>
          ))}
        </Pulse>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderLeftWidth: 4, gap: spacing.sm },
  cardDue: { backgroundColor: '#fff7ed', borderLeftColor: '#ea580c' },
  cardLate: { backgroundColor: '#fef2f2', borderLeftColor: '#dc2626' },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  item: { backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: '#fed7aa', padding: spacing.sm, gap: 2 },
  itemDue: { borderColor: '#fb923c', borderWidth: 1.5 },
  itemLate: { backgroundColor: '#fee2e2', borderColor: '#f87171', borderWidth: 1.5 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  kind: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#c2410c', backgroundColor: '#ffedd5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, overflow: 'hidden' },
  kindLate: { color: '#b91c1c', backgroundColor: '#fecaca' },
  itemTitle: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#111827' },
  meta: { fontSize: fontSize.xs, color: '#6b7280' },
  status: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  fiche: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs,
    padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: '#fed7aa', backgroundColor: '#fff', minHeight: 44,
  },
  ficheName: { fontSize: fontSize.sm, color: '#1f2937' },
  ficheCol: { fontSize: fontSize.xs, color: '#6b7280', fontWeight: fontWeight.semibold },
  ficheCount: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#9a3412' },
});
