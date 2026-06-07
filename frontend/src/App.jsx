import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { InstitutionProvider } from './context/InstitutionContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import AppRouter from './routes/AppRouter';
import PwaInstallPrompt from './components/common/PwaInstallPrompt/PwaInstallPrompt';
import NetworkStatus from './components/common/NetworkStatus/NetworkStatus';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <InstitutionProvider>
              <ThemeProvider>
                <AppRouter />
                <Toaster position="top-right" />
                <PwaInstallPrompt />
                <NetworkStatus />
              </ThemeProvider>
            </InstitutionProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
