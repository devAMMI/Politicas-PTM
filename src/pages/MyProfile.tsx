import React, { useState } from 'react';
import { User, KeyRound, CheckCircle, AlertCircle, Eye, EyeOff, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface MyProfileProps {
  navigate: (to: string) => void;
}

const MyProfile: React.FC<MyProfileProps> = () => {
  const { user, adminUser, session } = useAuth();

  const [fullName, setFullName] = useState(adminUser?.full_name ?? '');
  const [savingName, setSavingName] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSavingName(true);
    const res = await fetch(edgeFnUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: user?.id, full_name: fullName.trim() }),
    });
    const json = await res.json();
    setSavingName(false);
    if (!res.ok) {
      showToast('error', json.error || 'Error al guardar el nombre');
    } else {
      showToast('success', 'Nombre actualizado correctamente.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      showToast('error', 'Las contrasenas no coinciden');
      return;
    }
    if (newPw.length < 6) {
      showToast('error', 'La contrasena debe tener al menos 6 caracteres');
      return;
    }

    setSavingPw(true);

    // Re-authenticate with current password first
    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: currentPw,
    });

    if (reAuthError) {
      setSavingPw(false);
      showToast('error', 'La contrasena actual es incorrecta');
      return;
    }

    // Update password via Supabase auth
    const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);

    if (updateError) {
      showToast('error', updateError.message);
    } else {
      showToast('success', 'Contrasena actualizada correctamente.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    }
  };

  const roleName =
    adminUser?.role === 'superadmin' ? 'Super Admin' :
    adminUser?.role === 'admin'      ? 'Administrador' :
    adminUser?.role === 'auditor'    ? 'Auditor' :
    adminUser?.role === 'viewer'     ? 'Visor' : 'Admin';
  const initials = (adminUser?.full_name || user?.email || 'AD').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F7F8FA]">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.message}
        </div>
      )}

      <div className="max-w-xl mx-auto px-6 lg:px-8 py-8 space-y-5">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Cuenta</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mi Perfil</h1>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-[#0D1B2E] font-bold text-lg"
              style={{ backgroundColor: '#C9973A' }}
            >
              {initials}
            </div>
            <div>
              <p className="text-base font-bold text-slate-800">{adminUser?.full_name || '—'}</p>
              <p className="text-sm text-slate-400">{user?.email}</p>
              <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                adminUser?.role === 'superadmin'
                  ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                  : 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
              }`}>
                {roleName}
              </span>
            </div>
          </div>

          {/* Name form */}
          <form onSubmit={handleSaveName} className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                <User size={12} />
                Nombre completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Correo electronico
              </label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="w-full px-3.5 py-2.5 border border-gray-100 rounded-xl text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-1">El correo no se puede cambiar desde aqui.</p>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingName}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3060] transition-all disabled:opacity-60 shadow-sm"
              >
                <Save size={14} />
                {savingName ? 'Guardando...' : 'Guardar nombre'}
              </button>
            </div>
          </form>
        </div>

        {/* Password card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
              <KeyRound size={15} className="text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Cambiar contrasena</p>
              <p className="text-xs text-slate-400">Minimo 6 caracteres</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Contrasena actual
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Tu contrasena actual"
                  className="w-full px-3.5 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
                />
                <button type="button" onClick={() => setShowCurrent(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Nueva contrasena
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Nueva contrasena"
                  className="w-full px-3.5 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40 transition-all"
                />
                <button type="button" onClick={() => setShowNew(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Confirmar nueva contrasena
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repite la nueva contrasena"
                  className={`w-full px-3.5 pr-10 py-2.5 border rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                    confirmPw && confirmPw !== newPw
                      ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                      : 'border-gray-200 focus:ring-[#0A2647]/15 focus:border-[#0A2647]/40'
                  }`}
                />
                <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {confirmPw && confirmPw !== newPw && (
                <p className="text-xs text-red-500 mt-1">Las contrasenas no coinciden</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPw || (!!confirmPw && confirmPw !== newPw)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3060] transition-all disabled:opacity-60 shadow-sm"
              >
                <KeyRound size={14} />
                {savingPw ? 'Actualizando...' : 'Cambiar contrasena'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default MyProfile;
