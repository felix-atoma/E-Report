import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ParentDashboardScreen            from '../screens/parent/DashboardScreen';
import ChildReportsScreen               from '../screens/parent/ChildReportsScreen';
import ReportCardDetailScreen           from '../screens/parent/ReportCardDetailScreen';
import PaymentHistoryScreen             from '../screens/parent/PaymentHistoryScreen';
import NotificationPreferencesScreen    from '../screens/parent/NotificationPreferencesScreen';
import AnnualReportScreen               from '../screens/shared/AnnualReportScreen';
import AnnouncementsScreen              from '../screens/shared/AnnouncementsScreen';
import NotificationsScreen              from '../screens/shared/NotificationsScreen';
import ProfileScreen                    from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function ParentHomeStack() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="ParentDashboard"    component={ParentDashboardScreen}           options={{ title: 'Mes enfants' }} />
      <HomeStack.Screen name="ChildReports"       component={ChildReportsScreen}              options={({ route }) => ({ title: route.params?.studentName ?? 'Bulletins' })} />
      <HomeStack.Screen name="ReportCardDetail"   component={ReportCardDetailScreen}          options={{ title: 'Bulletin de notes' }} />
      <HomeStack.Screen name="AnnualReport"       component={AnnualReportScreen}              options={{ title: 'Rapport annuel' }} />
      <HomeStack.Screen name="PaymentHistory"     component={PaymentHistoryScreen}            options={{ title: 'Historique des paiements' }} />
      <HomeStack.Screen name="NotificationPrefs"  component={NotificationPreferencesScreen}  options={{ title: 'Préférences de notification' }} />
    </HomeStack.Navigator>
  );
}

export default function ParentNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.bg },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            HomeTab:          focused ? 'people'        : 'people-outline',
            AnnouncementsTab: focused ? 'megaphone'     : 'megaphone-outline',
            NotificationsTab: focused ? 'notifications' : 'notifications-outline',
            ProfileTab:       focused ? 'person-circle' : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab"          component={ParentHomeStack}     options={{ title: 'Mes enfants' }} />
      <Tab.Screen name="AnnouncementsTab" component={AnnouncementsScreen} options={{ title: 'Annonces', headerShown: true }} />
      <Tab.Screen name="NotificationsTab" component={NotificationsScreen} options={{ title: 'Notifications', headerShown: true }} />
      <Tab.Screen name="ProfileTab"       component={ProfileScreen}       options={{ title: 'Profil', headerShown: true }} />
    </Tab.Navigator>
  );
}
