import { useCallback, useEffect, useState } from 'react';
import { Page } from '../types';

function parsePath(hash: string): Page {
  const path = hash.replace(/^#\/?/, '') || '';

  if (path === '') return { name: 'home' };
  if (path === 'gestion') return { name: 'admin-login' };
  if (path === 'panel') return { name: 'admin-dashboard' };
  if (path === 'panel/nueva') return { name: 'admin-create' };
  if (path === 'panel/usuarios') return { name: 'admin-users' };

  const editMatch = path.match(/^panel\/editar\/(.+)$/);
  if (editMatch) return { name: 'admin-edit', id: editMatch[1] };

  const policyMatch = path.match(/^politica\/(.+)$/);
  if (policyMatch) return { name: 'policy', id: policyMatch[1] };

  return { name: 'home' };
}

export function useRouter() {
  const [page, setPage] = useState<Page>(() => parsePath(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => {
      setPage(parsePath(window.location.hash));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return { page, navigate };
}
