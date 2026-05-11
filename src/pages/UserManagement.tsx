import React, { useEffect, useState } from 'react';
import {
  Plus, Trash2, UserCheck, UserX, Users, Shield, ShieldCheck,
  AlertCircle, CheckCircle, X, Eye, EyeOff, Pencil, KeyRound,
  BookOpen, ClipboardCheck,
} from 'lucide-react';
import { useAuth, AdminUser } from '../context/AuthContext';

type Role = 'superadmin' | 'admin' | 'auditor' | 'viewer';

interface UserManagementProps {
  navigate: (to: string) => void;
}

interface NewUserForm {
  email: string;
  password: string;
  full_name: string;
  role: Role;
}

interface EditUserForm {
  id: string;
  full_name: string;
  role: Role;
  password: string;
}

const ROLE_RANK: Record<Role, number> = { superadmin: 3, admin: 2, auditor: 1, viewer: 0 };

function canManage(callerRole: Role, targetRole: Role): boolean {
  return ROLE_RANK[callerRole] >= ROLE_RANK[targetRole];
}

// Roles a caller can assign (same level and below)
function assignableRoles(callerRole: Role): Role[] {
  return (['superadmin', 'admin', 'auditor', 'viewer'] as Role[]).filter(r =>
    canManage(callerRole, r)
  );
}

const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  auditor: 'Auditor',
  viewer: 'Visor',
};

const ROLE_BADGE: Record<Role, string> = {
  superadmin: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  admin:      'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  auditor:    'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
  viewer:     'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

const ROLE_ICON: Record<Role, React.ReactNode> = {
  superadmin: <ShieldCheck size={17} className="text-amber-600" />,
  admin:      <Shield size={17} className="text-sky-600" />,
  auditor:    <ClipboardCheck size={17} className="text-teal-600" />,
  viewer:     <BookOpen size={17} className="text-slate-500" />,
};

const ROLE_AVATAR_BG: Record<Role, string> = {
  superadmin: 'bg-amber-50',
  admin:      'bg-sky-50',
  auditor:    'bg-teal-50',
  viewer:     'bg-slate-100',
};

const EMPTY_FORM: NewUserForm = { email: '', password: '', full_name: '', role: 'admin' };

const UserManagement: React.FC<UserManagementProps> = () => {
  const { session, adminUser: currentAdmin } = useAuth();
  const callerRole = (currentAdmin?.role ?? 'viewer') as Role;
  const canCreate = callerRole === 'superadmin' || callerRole === 'admin';

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewUserForm>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editUser, setEditUser] = useState<EditUserForm | null>(null);
  const [showEditPasswordSection, setShowEditPasswordSection] = useState(false);
  const [showEditPasswordText, setShowEditPasswordText] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

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
    const res = await fetch(edgeFnUrl, { method: 'GET', headers: authHeaders() });
    const data = await res.json();
    if (res.ok && data.users) setUsers(data.users as AdminUser[]);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch(edgeFnUrl, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      showToast('error', data.error || 'Error al crear usuario');
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
    const data = await res.json();
    if (!res.ok) {
      showToast('error', data.error || 'Error al cambiar estado del usuario');
    } else {
      showToast('success', user.is_active ? 'Usuario desactivado.' : 'Usuario activado.');
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`${edgeFnUrl}?id=${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();
    setConfirmDelete(null);
    if (!res.ok) {
      showToast('error', data.error || 'Error al eliminar usuario');
    } else {
      showToast('success', 'Usuario eliminado.');
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const openEdit = (user: AdminUser) => {
    setEditUser({ id: user.id, full_name: user.full_name || '', role: user.role as Role, password: '' });
    setShowEditPasswordSection(false);
    setShowEditPasswordText(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditSubmitting(true);
    const payload: Record<string, unknown> = {
      id: editUser.id,
      full_name: editUser.full_name,
      role: editUser.role,
    };
    if (editUser.password) payload.password = editUser.password;
    const res = await fetch(edgeFnUrl, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
    const data = await res.json();
    setEditSubmitting(false);
    if (!res.ok) {
      showToast('error', data.error || 'Error al actualizar usuario');
    } else {
      showToast('success', 'Usuario actualizado correctamente.');
      setUsers(prev => prev.map(u =>
        u.id === editUser.id ? { ...u, full_name: editUser.full_name, role: editUser.role } : u
      ));
      setEditUser(null);
    }
  };

  const roleOptions = assignableRoles(callerRole);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.message}
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-7 max-w-sm w-full">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center mb-1.5">Eliminar Usuario</h3>
            <p className="text-slate-500 text-sm text-center mb-6 leading-relaxed">
              Esta accion es irreversible. Se eliminara permanentemente el acceso de este usuario.
            </p>
            <div className="flex gap-2.5">
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

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">Editar Usuario</h3>
                <p className="text-xs text-slate-400 mt-0.5">Modifica los datos del usuario</p>
              </div>
              <button onClick={() => setEditUser(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEdit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={editUser.full_name}
                  onChange={e => setEditUser(f => f ? { ...f, full_name: e.target.value } : f)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Rol</label>
                <select
                  value={editUser.role}
                  onChange={e => setEditUser(f => f ? { ...f, role: e.target.value as Role } : f)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
                >
                  {roleOptions.map(r => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4">
                <button
                  type="button"
                  onClick={() => { setShowEditPasswordSection(s => !s); setShowEditPasswordText(false); }}
                  className="flex items-center gap-2 text-sm font-semibold text-[#0A2647] hover:text-[#0d3060] transition-colors w-full"
                >
                  <KeyRound size={14} />
                  {showEditPasswordSection ? 'Cancelar cambio de contrasena' : 'Cambiar contrasena'}
                </button>
                {showEditPasswordSection && (
                  <div className="mt-3">
                    <div className="relative">
                      <input
                        type={showEditPasswordText ? 'text' : 'password'}
                        minLength={6}
                        value={editUser.password}
                        onChange={e => setEditUser(f => f ? { ...f, password: e.target.value } : f)}
                        placeholder="Nueva contrasena (min. 6 caracteres)"
                        className="w-full px-3.5 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
                      />
                      <button type="button" onClick={() => setShowEditPasswordText(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showEditPasswordText ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">Dejar vacio para no cambiar la contrasena.</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3060] transition-all disabled:opacity-60 shadow-sm"
                >
                  {editSubmitting ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-7">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Administracion</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Usuarios</h1>
          </div>
          {canCreate && (
            <button
              onClick={() => { setShowForm(true); setForm({ ...EMPTY_FORM, role: roleOptions[0] }); }}
              className="inline-flex items-center gap-2 bg-[#0A2647] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d3060] transition-all shadow-sm hover:shadow-md"
            >
              <Plus size={15} />
              Nuevo usuario
            </button>
          )}
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Nuevo Usuario</h2>
                <p className="text-xs text-slate-400 mt-0.5">Crea una cuenta de acceso al panel</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Juan Perez"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Correo electronico</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="usuario@empresa.com"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Contrasena</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Minimo 6 caracteres"
                    className="w-full px-3.5 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Rol</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
                >
                  {roleOptions.map(r => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2.5 pt-1">
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
                  className="px-5 py-2.5 rounded-xl bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3060] transition-all disabled:opacity-60 shadow-sm"
                >
                  {submitting ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Role legend — only show roles visible to the caller */}
        <div className="flex flex-wrap gap-2 mb-4">
          {roleOptions.map(r => (
            <span key={r} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE[r]}`}>
              {ROLE_ICON[r]}
              {ROLE_LABEL[r]}
            </span>
          ))}
        </div>

        {/* Users list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-slate-50/60 flex items-center gap-2">
            <Users size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              {users.length} usuario{users.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-[#0A2647]/20 border-t-[#0A2647] rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Cargando usuarios...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-slate-300" />
              </div>
              <p className="text-slate-600 font-semibold">No hay usuarios</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {users.map(u => {
                const uRole = u.role as Role;
                const canAct = canCreate && canManage(callerRole, uRole);
                return (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors group">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ROLE_AVATAR_BG[uRole] ?? 'bg-slate-100'}`}>
                      {ROLE_ICON[uRole]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800">{u.full_name || u.email}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[uRole] ?? ''}`}>
                          {ROLE_LABEL[uRole] ?? uRole}
                        </span>
                        {!u.is_active && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                            Inactivo
                          </span>
                        )}
                        {u.id === currentAdmin?.id && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                            Tu cuenta
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>
                    </div>

                    {canAct && (
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(u)}
                          title="Editar"
                          className="p-2 rounded-xl text-slate-400 hover:text-[#0A2647] hover:bg-slate-100 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        {u.id !== currentAdmin?.id && (
                          <>
                            <button
                              onClick={() => handleToggleActive(u)}
                              title={u.is_active ? 'Desactivar' : 'Activar'}
                              className={`p-2 rounded-xl transition-colors ${u.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                            >
                              {u.is_active ? <UserCheck size={14} /> : <UserX size={14} />}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(u.id)}
                              title="Eliminar"
                              className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
