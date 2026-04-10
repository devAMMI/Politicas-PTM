import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useRouter } from './hooks/useRouter';
import Header from './components/Header';
import Footer from './components/Footer';
import Hero from './components/Hero';
import Home from './pages/Home';
import PolicyDetail from './pages/PolicyDetail';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import PolicyForm from './pages/PolicyForm';
import UserManagement from './pages/UserManagement';
import EvaluationList from './pages/EvaluationList';
import EvaluationForm from './pages/EvaluationForm';
import EvaluationPrint from './pages/EvaluationPrint';

const AppContent: React.FC = () => {
  const { page, navigate } = useRouter();
  const { session, loading, adminUser } = useAuth();

  const isAdminArea =
    page.name === 'admin-dashboard' ||
    page.name === 'admin-create' ||
    page.name === 'admin-edit' ||
    page.name === 'admin-users' ||
    page.name === 'admin-evaluations' ||
    page.name === 'admin-evaluation-new' ||
    page.name === 'admin-evaluation-edit' ||
    page.name === 'admin-evaluation-view';

  useEffect(() => {
    if (!loading && isAdminArea && !session) {
      navigate('/gestion');
    }
    if (!loading && page.name === 'admin-users' && session && adminUser && adminUser.role !== 'superadmin') {
      navigate('/panel');
    }
  }, [loading, session, isAdminArea, adminUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0A2647]/20 border-t-[#0A2647] rounded-full animate-spin" />
      </div>
    );
  }

  if (page.name === 'admin-login') {
    return <AdminLogin navigate={navigate} />;
  }

  if (isAdminArea) {
    if (!session) return null;
    const showHeader =
      page.name !== 'admin-evaluation-view';
    return (
      <>
        {showHeader && <Header navigate={navigate} currentPage="admin" />}
        {page.name === 'admin-dashboard' && <AdminDashboard navigate={navigate} />}
        {page.name === 'admin-create' && <PolicyForm navigate={navigate} />}
        {page.name === 'admin-edit' && <PolicyForm editId={page.id} navigate={navigate} />}
        {page.name === 'admin-users' && adminUser?.role === 'superadmin' && <UserManagement navigate={navigate} />}
        {page.name === 'admin-evaluations' && <EvaluationList navigate={navigate} />}
        {page.name === 'admin-evaluation-new' && <EvaluationForm navigate={navigate} />}
        {page.name === 'admin-evaluation-edit' && <EvaluationForm editId={page.id} navigate={navigate} />}
        {page.name === 'admin-evaluation-view' && <EvaluationPrint id={page.id} navigate={navigate} />}
      </>
    );
  }

  return (
    <>
      <Header navigate={navigate} currentPage={page.name} />
      <div className="pt-[101px]">
        {page.name === 'home' && (
          <>
            <Hero />
            <Home navigate={navigate} />
          </>
        )}
        {page.name === 'policy' && (
          <PolicyDetail id={page.id} navigate={navigate} />
        )}
      </div>
      <Footer />
    </>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
