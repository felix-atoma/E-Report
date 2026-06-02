import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import TeacherDashboardScreen       from '../screens/teacher/DashboardScreen';
import ClassDetailScreen            from '../screens/teacher/ClassDetailScreen';
import TeacherReportCardScreen      from '../screens/teacher/ReportCardScreen';
import GradeEntryScreen             from '../screens/teacher/GradeEntryScreen';
import CreateReportCardScreen       from '../screens/teacher/CreateReportCardScreen';
import AttendanceScreen             from '../screens/teacher/AttendanceScreen';
import StudentProfileScreen         from '../screens/teacher/StudentProfileScreen';
import FichesListScreen             from '../screens/teacher/FichesListScreen';
import FicheGradeEntryScreen        from '../screens/teacher/FicheGradeEntryScreen';
import EditReportMetadataScreen     from '../screens/teacher/EditReportMetadataScreen';
import TitulaireListScreen          from '../screens/teacher/TitulaireListScreen';
import TitulaireStudentScreen       from '../screens/teacher/TitulaireStudentScreen';
import ClassStatsScreen             from '../screens/teacher/ClassStatsScreen';
import MockExamsScreen              from '../screens/teacher/MockExamsScreen';
import MockExamDetailScreen         from '../screens/teacher/MockExamDetailScreen';
import MockExamGradeScreen          from '../screens/teacher/MockExamGradeScreen';
import MockExamFicheScreen          from '../screens/teacher/MockExamFicheScreen';
import MockExamPalmaresScreen       from '../screens/teacher/MockExamPalmaresScreen';
import MockExamReleveScreen         from '../screens/teacher/MockExamReleveScreen';
import AnnouncementsScreen          from '../screens/shared/AnnouncementsScreen';
import NotificationsScreen          from '../screens/shared/NotificationsScreen';
import ProfileScreen                from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const ClassesStack   = createNativeStackNavigator();
const MockExamsStack = createNativeStackNavigator();
const BulletinsStack = createNativeStackNavigator();

function TeacherClassesStack() {
  return (
    <ClassesStack.Navigator>
      <ClassesStack.Screen name="TeacherDashboard"      component={TeacherDashboardScreen}    options={{ title: 'Mes classes' }} />
      <ClassesStack.Screen name="ClassDetail"           component={ClassDetailScreen}          options={({ route }) => ({ title: route.params?.className ?? 'Classe' })} />
      <ClassesStack.Screen name="TeacherReportCard"     component={TeacherReportCardScreen}    options={{ title: 'Bulletin' }} />
      <ClassesStack.Screen name="GradeEntry"            component={GradeEntryScreen}           options={{ title: 'Saisie des notes' }} />
      <ClassesStack.Screen name="CreateReportCard"      component={CreateReportCardScreen}     options={{ title: 'Nouveau bulletin' }} />
      <ClassesStack.Screen name="Attendance"            component={AttendanceScreen}           options={({ route }) => ({ title: `Présences — ${route.params?.className ?? ''}` })} />
      <ClassesStack.Screen name="StudentProfile"        component={StudentProfileScreen}       options={({ route }) => ({ title: route.params?.studentName ?? 'Élève' })} />
      <ClassesStack.Screen name="FichesList"            component={FichesListScreen}           options={({ route }) => ({ title: `Fiches — ${route.params?.className ?? ''}` })} />
      <ClassesStack.Screen name="FicheGradeEntry"       component={FicheGradeEntryScreen}      options={({ route }) => ({ title: route.params?.subjectName ?? 'Fiche de notes' })} />
      <ClassesStack.Screen name="EditReportMetadata"    component={EditReportMetadataScreen}   options={{ title: 'Informations du bulletin' }} />
      <ClassesStack.Screen name="TitulaireList"         component={TitulaireListScreen}        options={({ route }) => ({ title: `Titulaire — ${route.params?.className ?? ''}` })} />
      <ClassesStack.Screen name="TitulaireStudent"      component={TitulaireStudentScreen}     options={({ route }) => ({ title: route.params?.studentName ?? 'Élève' })} />
      <ClassesStack.Screen name="ClassStats"            component={ClassStatsScreen}           options={({ route }) => ({ title: `Stats — ${route.params?.className ?? ''}` })} />
    </ClassesStack.Navigator>
  );
}

function TeacherMockExamsStack() {
  return (
    <MockExamsStack.Navigator>
      <MockExamsStack.Screen name="MockExams"        component={MockExamsScreen}        options={{ title: 'Examens blancs' }} />
      <MockExamsStack.Screen name="MockExamDetail"   component={MockExamDetailScreen}   options={({ route }) => ({ title: route.params?.examLabel ?? 'Examen' })} />
      <MockExamsStack.Screen name="MockExamGrade"    component={MockExamGradeScreen}    options={{ title: 'Saisie des notes' }} />
      <MockExamsStack.Screen name="MockExamFiche"    component={MockExamFicheScreen}    options={{ title: 'Fiches de notes' }} />
      <MockExamsStack.Screen name="MockExamPalmares" component={MockExamPalmaresScreen} options={{ title: 'Palmares' }} />
      <MockExamsStack.Screen name="MockExamReleve"   component={MockExamReleveScreen}   options={{ title: 'Relevés de notes' }} />
    </MockExamsStack.Navigator>
  );
}

function TeacherBulletinsStack() {
  return (
    <BulletinsStack.Navigator>
      <BulletinsStack.Screen name="Announcements" component={AnnouncementsScreen} options={{ title: 'Annonces' }} />
    </BulletinsStack.Navigator>
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
            ClassesTab:       focused ? 'school'          : 'school-outline',
            MockExamsTab:     focused ? 'trophy'          : 'trophy-outline',
            BulletinsTab:     focused ? 'megaphone'       : 'megaphone-outline',
            NotificationsTab: focused ? 'notifications'   : 'notifications-outline',
            ProfileTab:       focused ? 'person-circle'   : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="ClassesTab"       component={TeacherClassesStack}     options={{ title: 'Classes' }} />
      <Tab.Screen name="MockExamsTab"     component={TeacherMockExamsStack}   options={{ title: 'Examens' }} />
      <Tab.Screen name="BulletinsTab"     component={TeacherBulletinsStack}   options={{ title: 'Annonces' }} />
      <Tab.Screen name="NotificationsTab" component={NotificationsScreen}     options={{ title: 'Notifications', headerShown: true }} />
      <Tab.Screen name="ProfileTab"       component={ProfileScreen}           options={{ title: 'Profil', headerShown: true }} />
    </Tab.Navigator>
  );
}
