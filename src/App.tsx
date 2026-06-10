import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import SetPassword from '@/pages/SetPassword';
import Index from '@/pages/Index';
import DealerDashboard from '@/pages/DealerDashboard';
import DirectorDashboard from '@/pages/DirectorDashboard';
import ManageOffices from '@/pages/ManageOffices';
import ReportForm from '@/pages/ReportForm';
import SafetyAdvisors from '@/pages/SafetyAdvisors';
import Newsletter from '@/pages/Newsletter';
import NewsletterEditor from '@/pages/NewsletterEditor';
import NewsletterView from '@/pages/NewsletterView';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/" element={<Index />} />
            <Route
              path="/dealer"
              element={
                <ProtectedRoute>
                  <DealerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dealer/report"
              element={
                <ProtectedRoute>
                  <ReportForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/safety-advisors"
              element={
                <ProtectedRoute>
                  <SafetyAdvisors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/director"
              element={
                <ProtectedRoute requireFullAccess>
                  <DirectorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/director/dealers"
              element={
                <ProtectedRoute requireFullAccess>
                  <ManageOffices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/newsletter"
              element={
                <ProtectedRoute requireFullAccess>
                  <Newsletter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/newsletter/:weekEndingDate/edit"
              element={
                <ProtectedRoute requireFullAccess>
                  <NewsletterEditor />
                </ProtectedRoute>
              }
            />
            <Route path="/newsletter/:weekEndingDate/view" element={<NewsletterView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
