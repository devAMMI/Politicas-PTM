import { useCallback, useEffect, useState } from 'react';
import { Page } from '../types';

function parsePath(pathname: string): Page {
  const path = pathname.replace(/^\//, '').replace(/\/$/, '') || '';

  if (path === '') return { name: 'home' };
  if (path === 'codigoetica') return { name: 'codigo-etica' };
  if (path === 'login') return { name: 'admin-login' };
  if (path === 'admin') return { name: 'admin-dashboard' };
  if (path === 'admin/nueva') return { name: 'admin-create' };
  if (path === 'admin/usuarios') return { name: 'admin-users' };
  if (path === 'admin/archivo') return { name: 'admin-archive' };
  if (path === 'admin/categorias') return { name: 'admin-categories' };
  if (path === 'admin/perfil') return { name: 'admin-profile' };
  if (path === 'admin/lista-envio') return { name: 'admin-recipients' };

  const editMatch = path.match(/^admin\/editar\/(.+)$/);
  if (editMatch) return { name: 'admin-edit', id: editMatch[1] };

  const policyMatch = path.match(/^politicas\/(.+)$/);
  if (policyMatch) return { name: 'policy', slug: policyMatch[1] };

  const categoryMatch = path.match(/^categoria\/(.+)$/);
  if (categoryMatch) return { name: 'category', category: decodeURIComponent(categoryMatch[1]) };

  if (path === 'politicas-publicadas') return { name: 'policies', category: 'Todas' };

  const policiesMatch = path.match(/^politicas-publicadas\/(.+)$/);
  if (policiesMatch) return { name: 'policies', category: decodeURIComponent(policiesMatch[1]) };

  return { name: 'home' };
}

export function useRouter() {
  const [page, setPage] = useState<Page>(() => parsePath(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => {
      setPage(parsePath(window.location.pathname));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to: string) => {
    window.history.pushState(null, '', to);
    setPage(parsePath(to));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return { page, navigate };
}
