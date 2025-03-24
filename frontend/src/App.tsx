import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Spin } from 'antd';
import "./App.css";
import ErrorBoundary from "./components/ErrorBoundary";
import BomUpload from "./pages/BomUpload";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import WorkflowEditor from "./pages/WorkflowEditor";
import WorkflowReport from "./pages/WorkflowReport";
import { authService } from './services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => {
  return useContext(AuthContext);
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spin size="large" className="global-spinner" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize auth service
        await authService.init();
        
        // Get initial user
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/dashboard/*" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route
              path="/workflow/new"
              element={
                <ProtectedRoute>
                  <WorkflowEditor />
                </ProtectedRoute>
              }
            />

            <Route
              path="/workflow/:id"
              element={
                <ProtectedRoute>
                  <WorkflowEditor />
                </ProtectedRoute>
              }
            />

            <Route
              path="/report/:id"
              element={
                <ProtectedRoute>
                  <WorkflowReport />
                </ProtectedRoute>
              }
            />

            <Route
              path="/bom/upload"
              element={
                <ProtectedRoute>
                  <BomUpload />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
