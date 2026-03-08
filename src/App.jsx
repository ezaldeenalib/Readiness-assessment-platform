import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EntityManagement from './pages/EntityManagement';
import MinistryDashboard from './pages/MinistryDashboard';
import ComprehensiveStatistics from './pages/ComprehensiveStatistics';
import QuestionBankNew from './pages/QuestionBankNew';
import TemplateList from './pages/TemplateList';
import TemplateBuilder from './pages/TemplateBuilder';
import TemplateWeightManager from './pages/TemplateWeightManager';
import TemplateAssessmentList from './pages/TemplateAssessmentList';
import TemplateAssessmentWizard from './pages/TemplateAssessmentWizard';
import CategoryManagement from './pages/CategoryManagement';
import ReferencesDictionaryManagement from './pages/ReferencesDictionaryManagement';
import PermissionsManagement from './pages/PermissionsManagement';
import Layout from './components/Layout';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } catch {
          const userData = authService.getCurrentUserFromStorage();
          setUser(userData);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            !user ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        
        <Route
          path="/"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <Dashboard user={user} />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route
          path="/dashboard"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <Dashboard user={user} />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route
          path="/entities"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <EntityManagement user={user} />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route
          path="/ministry-dashboard"
          element={
            user && (user.role === 'ministry_admin' || user.role === 'super_admin') ? (
              <Layout user={user} onLogout={handleLogout}>
                <MinistryDashboard user={user} />
              </Layout>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        
        <Route
          path="/statistics"
          element={
            user && user.role === 'super_admin' ? (
              <Layout user={user} onLogout={handleLogout}>
                <ComprehensiveStatistics user={user} />
              </Layout>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        <Route
          path="/permissions"
          element={
            user && (user.role === 'super_admin' || user.permissions?.includes('manage_users')) ? (
              <Layout user={user} onLogout={handleLogout}>
                <PermissionsManagement />
              </Layout>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        
        {/* Template-based Evaluation Engine Routes */}
        <Route
          path="/question-bank"
          element={
            user && (user.role === 'super_admin' || user.role === 'ministry_admin') ? (
              <Layout user={user} onLogout={handleLogout}>
                <QuestionBankNew />
              </Layout>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/categories"
          element={
            user && (user.role === 'super_admin' || user.role === 'ministry_admin') ? (
              <Layout user={user} onLogout={handleLogout}>
                <CategoryManagement />
              </Layout>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/references-dictionary"
          element={
            user && (user.role === 'super_admin' || user.role === 'ministry_admin') ? (
              <Layout user={user} onLogout={handleLogout}>
                <ReferencesDictionaryManagement />
              </Layout>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        
        <Route
          path="/templates"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <TemplateList />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route
          path="/templates/new"
          element={
            user && (user.role === 'super_admin' || user.role === 'ministry_admin') ? (
              <Layout user={user} onLogout={handleLogout}>
                <TemplateBuilder />
              </Layout>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        
        <Route
          path="/templates/:templateId/edit"
          element={
            user && (user.role === 'super_admin' || user.role === 'ministry_admin') ? (
              <Layout user={user} onLogout={handleLogout}>
                <TemplateBuilder />
              </Layout>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        <Route
          path="/templates/:templateId/weights"
          element={
            user && (user.role === 'super_admin' || user.role === 'ministry_admin') ? (
              <Layout user={user} onLogout={handleLogout}>
                <TemplateWeightManager />
              </Layout>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        
        <Route
          path="/template-assessments"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <TemplateAssessmentList />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route
          path="/template-assessments/:assessmentId"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <TemplateAssessmentWizard />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
