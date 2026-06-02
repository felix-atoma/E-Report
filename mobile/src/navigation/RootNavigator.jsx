import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AuthNavigator from './AuthNavigator';
import ParentNavigator from './ParentNavigator';
import StudentNavigator from './StudentNavigator';
import TeacherNavigator from './TeacherNavigator';
import BursarNavigator from './BursarNavigator';

export default function RootNavigator() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgSubtle }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) return <AuthNavigator />;

  switch (user.role) {
    case 'PARENT':
      return <ParentNavigator />;
    case 'STUDENT':
      return <StudentNavigator />;
    case 'BURSAR':
      return <BursarNavigator />;
    case 'TEACHER':
    case 'ADMIN':
      return <TeacherNavigator />;
    default:
      return <AuthNavigator />;
  }
}
