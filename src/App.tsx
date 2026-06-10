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
              path="/director"
              element={
                <ProtectedRoute requireFullAccess>
                  <DirectorDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
