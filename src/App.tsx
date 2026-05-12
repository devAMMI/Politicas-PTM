import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useRouter } from './hooks/useRouter';
import Header from './components/Header';
import AdminLayout from './components/AdminLayout';
import Footer from './components/Footer';
import Hero from './components/Hero';
import Home from './pages/Home';
import PolicyDetail from './pages/PolicyDetail';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import PolicyForm from './pages/PolicyForm';
import UserManagement from './pages/UserManagement';
import AdminArchive from './pages/AdminArchive';
import CategoriesManager from './pages/CategoriesManager';
import MyProfile from './pages/MyProfile';
import EmailRecipients from './pages/EmailRecipients';

const ADMIN_PAGES = new Set([
  'admin-dashboard', 'admin-create', 'admin-edit',
  'admin-users', 'admin-archive', 'admin-categories',
  'admin-profile', 'admin-recipients',
]);

const AppContent: React.FC = () => {
  const { page, navigate } = useRouter();
  const { session, loading } = useAuth();

  const isAdminArea = ADMIN_PAGES.has(page.name);

  useEffect(() => {
    if (loading) return;
    // Unauthenticated user trying to access admin → send to login
    if (isAdminArea && !session) {
      navigate('/login');
      return;
    }
    // Already logged-in user lands on login page → send to admin
    if (page.name === 'admin-login' && session) {
      navigate('/admin');
    }
  }, [loading, session, page.name]);

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
    return (
      <AdminLayout navigate={navigate} currentPage={page.name}>
        {page.name === 'admin-dashboard' && <AdminDashboard navigate={navigate} />}
        {page.name === 'admin-create' && <PolicyForm navigate={navigate} />}
        {page.name === 'admin-edit' && <PolicyForm editId={page.id} navigate={navigate} />}
        {page.name === 'admin-users' && <UserManagement navigate={navigate} />}
        {page.name === 'admin-archive' && <AdminArchive navigate={navigate} />}
        {page.name === 'admin-categories' && <CategoriesManager navigate={navigate} />}
        {page.name === 'admin-profile' && <MyProfile navigate={navigate} />}
        {page.name === 'admin-recipients' && <EmailRecipients navigate={navigate} />}
      </AdminLayout>
    );
  }

  return (
    <>
      <Header navigate={navigate} currentPage={page.name} />
      <div className="pt-14">
        {page.name === 'home' && (
          <Hero navigate={navigate} />
        )}
        {page.name === 'policies' && (
          <Home navigate={navigate} initialCategory={page.category} showBackButton={true} />
        )}
        {page.name === 'category' && (
          <Home navigate={navigate} initialCategory={page.category} showBackButton={true} />
        )}
        {page.name === 'policy' && (
          <PolicyDetail slug={page.slug} navigate={navigate} />
        )}
      </div>
      <Footer navigate={navigate} />
    </>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
