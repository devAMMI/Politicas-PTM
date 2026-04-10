import React, { useEffect, useState } from 'react';
import { Plus, Trash2, UserCheck, UserX, Users, Shield, ShieldCheck, AlertCircle, CheckCircle, X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth, AdminUser } from '../context/AuthContext';

interface UserManagementProps {
  navigate: (to: string) => void;
}

interface NewUserForm {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'superadmin';
}

const EMPTY_FORM: NewUserForm = { email: '', password: '', full_name: '', role: 'admin' };

const UserManagement: React.FC<UserManagementProps> = () => {
  const { session, adminUser: currentAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewUserForm>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;

  const authHeaders = () => ({
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role, is_active')
      .order('created_at', { ascending: true });
    if (data) setUsers(data as AdminUser[]);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch(edgeFnUrl, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      showToast('error', json.error || 'Error al crear usuario');
    } else {
      showToast('success', `Usuario ${form.email} creado correctamente.`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchUsers();
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    const res = await fetch(edgeFnUrl, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ id: user.id, is_active: !user.is_active }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast('error', json.error || 'Error al actualizar usuario');
    } else {
      showToast('success', user.is_active ? 'Usuario desactivado.' : 'Usuario activado.');
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`${edgeFnUrl}?id=${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const json = await res.json();
    setConfirmDelete(null);
    if (!res.ok) {
      showToast('error', json.error || 'Error al eliminar usuario');
    } else {
      showToast('success', 'Usuario eliminado.');
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const roleLabel = (role: string) => role === 'superadmin' ? 'Super Admin' : 'Admin';
  const roleBadge = (role: string) =>
    role === 'superadmin'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-blue-100 text-blue-700';

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Eliminar Usuario</h3>
            <p className="text-slate-500 text-sm text-center mb-6">Esta accion es irreversible. Se eliminara permanentemente el acceso de este usuario.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Gestion de Usuarios</h1>
            <p className="text-slate-500 text-sm mt-0.5">Administra los usuarios con acceso al panel</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setForm(EMPTY_FORM); }}
            className="inline-flex items-center gap-2 bg-[#0A2647] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#144272] transition-all hover:shadow-lg"
          >
            <Plus size={16} />
            Nuevo usuario
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-800">Nuevo Usuario</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Juan Perez"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Correo electronico</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="usuario@plihsa.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contrasena</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Minimo 6 caracteres"
                    className="w-full px-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'superadmin' }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2647]/20 focus:border-[#0A2647] transition-all bg-white"
                >
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#144272] transition-all disabled:opacity-60"
                >
                  {submitting ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-[#0A2647]/20 border-t-[#0A2647] rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16">
              <Users size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No hay usuarios</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-4 p-5 hover:bg-slate-50/50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${u.role === 'superadmin' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                    {u.role === 'superadmin' ? <ShieldCheck size={18} className="text-amber-600" /> : <Shield size={18} className="text-blue-600" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">{u.full_name || u.email}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge(u.role)}`}>
                        {roleLabel(u.role)}
                      </span>
                      {!u.is_active && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                          Inactivo
                        </span>
                      )}
                      {u.id === currentAdmin?.id && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          Tu cuenta
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>
                  </div>

                  {u.id !== currentAdmin?.id && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleToggleActive(u)}
                        title={u.is_active ? 'Desactivar' : 'Activar'}
                        className={`p-2 rounded-lg transition-colors ${u.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                      >
                        {u.is_active ? <UserCheck size={15} /> : <UserX size={15} />}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(u.id)}
                        title="Eliminar"
                        className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
