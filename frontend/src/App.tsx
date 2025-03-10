import { Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
import BomUpload from './pages/BomUpload';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import WorkflowEditor from './pages/WorkflowEditor';
import WorkflowReport from './pages/WorkflowReport';
import { userApi } from './services/api';

// 受保护的路由组件
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        // 验证 token 有效性
        await userApi.getCurrentUser();
        setIsAuthenticated(true);
      } catch (error) {
        console.error('验证失败:', error);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" tip="验证身份中..." />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/workflow/new" element={
            <ProtectedRoute>
              <WorkflowEditor />
            </ProtectedRoute>
          } />
          
          <Route path="/workflow/:id" element={
            <ProtectedRoute>
              <WorkflowEditor />
            </ProtectedRoute>
          } />
          
          <Route path="/report/:id" element={
            <ProtectedRoute>
              <WorkflowReport />
            </ProtectedRoute>
          } />
          
          <Route path="/bom/upload" element={
            <ProtectedRoute>
              <BomUpload />
            </ProtectedRoute>
          } />
          
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App; 