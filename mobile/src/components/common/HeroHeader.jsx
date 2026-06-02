import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, spacing } from '../../theme';

export default function HeroHeader({ greeting, name, subtitle, right, children }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.hero, { backgroundColor: colors.primary }]}>
      <View style={[styles.circle1, { backgroundColor: colors.primaryLight ?? '#3b82f6' }]} />
      <View style={[styles.circle2, { backgroundColor: colors.primaryDark ?? '#1e3a8a' }]} />
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.textGroup}>
            {greeting ? (
              <Text style={styles.greeting}>{greeting}</Text>
            ) : null}
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {subtitle ? (
              <Text style={styles.subtitle}>{subtitle}</Text>
            ) : null}
          </View>
          {right ? <View>{right}</View> : null}
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -60,
    right: -40,
    opacity: 0.25,
  },
  circle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: -30,
    left: -20,
    opacity: 0.2,
  },
  content: { zIndex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  textGroup: { flex: 1 },
  greeting: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  name: {
    color: '#ffffff',
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: fontSize.sm,
    marginTop: 4,
  },
});
