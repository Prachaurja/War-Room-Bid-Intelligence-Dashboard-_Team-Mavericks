import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/layout/ProtectedRoute'; 
import LoginPage from './pages/LoginPage/LoginPage';
import OverviewPage from './pages/OverviewPage/OverviewPage';
import TendersPage from './pages/TendersPage/TendersPage';
import AnalyticsPage from './pages/AnalyticsPage/AnalyticsPage';
import ReportsPage from './pages/ReportsPage/ReportsPage';
import CustomersPage from './pages/CustomersPage/CustomersPage';
import AlertsPage from './pages/AlertsPage/AlertsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="tenders"   element={<TendersPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="reports"   element={<ReportsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="alerts"    element={<AlertsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}