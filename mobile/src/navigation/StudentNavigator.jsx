import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import StudentDashboardScreen from '../screens/student/DashboardScreen';
import ReportCardDetailScreen from '../screens/parent/ReportCardDetailScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const BulletinsStack = createNativeStackNavigator();

function StudentBulletinsStack() {
  return (
    <BulletinsStack.Navigator>
      <BulletinsStack.Screen
        name="StudentDashboard"
        component={StudentDashboardScreen}
        options={{ title: 'Mes bulletins' }}
      />
      <BulletinsStack.Screen
        name="ReportCardDetail"
        component={ReportCardDetailScreen}
        options={{ title: 'Bulletin de notes' }}
      />
    </BulletinsStack.Navigator>
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
            BulletinsTab: focused ? 'document-text' : 'document-text-outline',
            NotificationsTab: focused ? 'notifications' : 'notifications-outline',
            ProfileTab: focused ? 'person-circle' : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="BulletinsTab" component={StudentBulletinsStack} options={{ title: 'Bulletins' }} />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{ title: 'Notifications', headerShown: true }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profil', headerShown: true }}
      />
    </Tab.Navigator>
  );
}
