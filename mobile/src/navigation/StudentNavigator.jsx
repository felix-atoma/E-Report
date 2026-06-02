import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import StudentDashboardScreen   from '../screens/student/DashboardScreen';
import ProgressScreen           from '../screens/student/ProgressScreen';
import ReportCardDetailScreen   from '../screens/parent/ReportCardDetailScreen';
import AnnualReportScreen       from '../screens/shared/AnnualReportScreen';
import AnnouncementsScreen      from '../screens/shared/AnnouncementsScreen';
import NotificationsScreen      from '../screens/shared/NotificationsScreen';
import ProfileScreen            from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const BulletinsStack = createNativeStackNavigator();
const ProgressStack  = createNativeStackNavigator();

function StudentBulletinsStack() {
  return (
    <BulletinsStack.Navigator>
      <BulletinsStack.Screen name="StudentDashboard"  component={StudentDashboardScreen} options={{ title: 'Mes bulletins' }} />
      <BulletinsStack.Screen name="ReportCardDetail"  component={ReportCardDetailScreen} options={{ title: 'Bulletin de notes' }} />
      <BulletinsStack.Screen name="AnnualReport"      component={AnnualReportScreen}     options={{ title: 'Rapport annuel' }} />
    </BulletinsStack.Navigator>
  );
}

function StudentProgressStack() {
  return (
    <ProgressStack.Navigator>
      <ProgressStack.Screen name="Progress"    component={ProgressScreen}    options={{ title: 'Ma progression' }} />
      <ProgressStack.Screen name="AnnualReport" component={AnnualReportScreen} options={{ title: 'Rapport annuel' }} />
    </ProgressStack.Navigator>
  );
}

export default function StudentNavigator() {
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
            BulletinsTab:     focused ? 'document-text'   : 'document-text-outline',
            ProgressTab:      focused ? 'trending-up'     : 'trending-up-outline',
            AnnouncementsTab: focused ? 'megaphone'       : 'megaphone-outline',
            NotificationsTab: focused ? 'notifications'   : 'notifications-outline',
            ProfileTab:       focused ? 'person-circle'   : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="BulletinsTab"     component={StudentBulletinsStack} options={{ title: 'Bulletins' }} />
      <Tab.Screen name="ProgressTab"      component={StudentProgressStack}  options={{ title: 'Progression' }} />
      <Tab.Screen name="AnnouncementsTab" component={AnnouncementsScreen}   options={{ title: 'Annonces', headerShown: true }} />
      <Tab.Screen name="NotificationsTab" component={NotificationsScreen}   options={{ title: 'Notifications', headerShown: true }} />
      <Tab.Screen name="ProfileTab"       component={ProfileScreen}         options={{ title: 'Profil', headerShown: true }} />
    </Tab.Navigator>
  );
}
