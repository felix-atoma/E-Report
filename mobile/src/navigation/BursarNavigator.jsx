import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import BursarDashboardScreen    from '../screens/bursar/DashboardScreen';
import RecordPaymentScreen      from '../screens/bursar/RecordPaymentScreen';
import StudentsPaymentScreen    from '../screens/bursar/StudentsPaymentScreen';
import NotificationLogsScreen   from '../screens/bursar/NotificationLogsScreen';
import NotificationsScreen      from '../screens/shared/NotificationsScreen';
import ProfileScreen            from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const HeldStack = createNativeStackNavigator();

function BursarHomeStack() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="BursarDashboard"  component={BursarDashboardScreen}  options={{ title: 'Économat' }} />
      <HomeStack.Screen name="RecordPayment"    component={RecordPaymentScreen}    options={{ title: 'Enregistrer un paiement' }} />
      <HomeStack.Screen name="StudentsPayment"  component={StudentsPaymentScreen}  options={{ title: 'Statuts de paiement' }} />
    </HomeStack.Navigator>
  );
}

function BursarHeldStack() {
  return (
    <HeldStack.Navigator>
      <HeldStack.Screen name="NotificationLogs" component={NotificationLogsScreen} options={{ title: 'Bulletins retenus' }} />
    </HeldStack.Navigator>
  );
}

export default function BursarNavigator() {
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
            HomeTab:          focused ? 'cash'            : 'cash-outline',
            HeldTab:          focused ? 'time'            : 'time-outline',
            NotificationsTab: focused ? 'notifications'   : 'notifications-outline',
            ProfileTab:       focused ? 'person-circle'   : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab"          component={BursarHomeStack}     options={{ title: 'Paiements' }} />
      <Tab.Screen name="HeldTab"          component={BursarHeldStack}     options={{ title: 'Retenus' }} />
      <Tab.Screen name="NotificationsTab" component={NotificationsScreen} options={{ title: 'Notifications', headerShown: true }} />
      <Tab.Screen name="ProfileTab"       component={ProfileScreen}       options={{ title: 'Profil', headerShown: true }} />
    </Tab.Navigator>
  );
}
