import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import TeacherDashboardScreen from '../screens/teacher/DashboardScreen';
import ClassDetailScreen from '../screens/teacher/ClassDetailScreen';
import TeacherReportCardScreen from '../screens/teacher/ReportCardScreen';
import GradeEntryScreen from '../screens/teacher/GradeEntryScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const ClassesStack = createNativeStackNavigator();

function TeacherClassesStack() {
  return (
    <ClassesStack.Navigator>
      <ClassesStack.Screen
        name="TeacherDashboard"
        component={TeacherDashboardScreen}
        options={{ title: 'Mes classes' }}
      />
      <ClassesStack.Screen
        name="ClassDetail"
        component={ClassDetailScreen}
        options={({ route }) => ({ title: route.params?.className ?? 'Classe' })}
      />
      <ClassesStack.Screen
        name="TeacherReportCard"
        component={TeacherReportCardScreen}
        options={{ title: 'Bulletin' }}
      />
      <ClassesStack.Screen
        name="GradeEntry"
        component={GradeEntryScreen}
        options={{ title: 'Saisie des notes' }}
      />
    </ClassesStack.Navigator>
  );
}

export default function TeacherNavigator() {
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
            ClassesTab: focused ? 'school' : 'school-outline',
            NotificationsTab: focused ? 'notifications' : 'notifications-outline',
            ProfileTab: focused ? 'person-circle' : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="ClassesTab" component={TeacherClassesStack} options={{ title: 'Classes' }} />
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
