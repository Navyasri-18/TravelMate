import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import TripDetails from './pages/TripDetails';
import { useAuthStore } from './stores/authStore';
import { useAuthListener } from './hooks/useAuthListener';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';

import JoinTripPage from './pages/JoinTripPage';
import ProfilePage from './pages/ProfilePage';
import ExpensesPage from './pages/ExpensesPage';

const queryClient = new QueryClient();

function App() {
  useAuthListener();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
      <div className="min-h-screen bg-background font-sans antialiased">
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/signup" 
            element={!isAuthenticated ? <SignupPage /> : <Navigate to="/dashboard" />} 
          />
          
          <Route path="/join/:code" element={<JoinTripPage />} />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/signup" />} />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/trip/:id" 
            element={isAuthenticated ? <TripDetails /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/trip/:id/chat" 
            element={isAuthenticated ? <TripDetails /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/trip/:id/expenses" 
            element={isAuthenticated ? <ExpensesPage /> : <Navigate to="/login" />} 
          />
          <Route path="/profile-setup" element={<div>Profile Setup Placeholder</div>} />
          <Route 
            path="/profile" 
            element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />} 
          />
        </Routes>
        <Toaster position="top-center" richColors closeButton />
      </div>
    </Router>
    </QueryClientProvider>
  );
}

export default App;
