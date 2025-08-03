import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { APP_NAME } from '../constants';
import { UserRole, PermissionAction } from '../types';
import { DashboardIcon, TruckIcon, UserGroupIcon, DocumentReportIcon, LogoutIcon, UsersIcon, EditIcon, BuildingOfficeIcon, ChartPieIcon } from './ui/Icons';
import { Modal, Input, Button } from './ui/Common';


const PasswordChangeModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { updateCurrentUserPassword } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError('');
        setSuccess('');
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        setLoading(true);
        try {
            await updateCurrentUserPassword(password);
            setSuccess('Contraseña actualizada con éxito.');
            setPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                onClose();
                setSuccess('');
            }, 2000);
        } catch (err) {
            setError('No se pudo cambiar la contraseña.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cambiar mi Contraseña">
            <div className="space-y-4">
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm">{error}</p>}
                {success && <p className="bg-green-100 text-green-700 p-3 rounded-md text-sm">{success}</p>}
                <Input label="Nueva Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                <Input label="Confirmar Nueva Contraseña" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                 <div className="flex justify-end space-x-2 mt-6">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Button>
                </div>
            </div>
        </Modal>
    );
};

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const navItems = [
    { to: '/', text: 'Dashboard', icon: DashboardIcon, role: [UserRole.ADMIN, UserRole.USER], permission: '/' },
    { to: '/trips', text: 'Viajes', icon: TruckIcon, role: [UserRole.ADMIN, UserRole.USER], permission: '/trips' },
    { to: '/work-orders', text: 'Orden de trabajo', icon: DocumentReportIcon, role: [UserRole.ADMIN, UserRole.USER], permission: '/work-orders' },
    { to: '/clients', text: 'Clientes', icon: BuildingOfficeIcon, role: [UserRole.ADMIN, UserRole.USER], permission: '/clients' },
    { to: '/drivers', text: 'Motoristas', icon: UserGroupIcon, role: [UserRole.ADMIN, UserRole.USER], permission: '/drivers' },
    { to: '/trucks', text: 'Cabezales', icon: TruckIcon, role: [UserRole.ADMIN, UserRole.USER], permission: '/trucks' },
    { to: '/trailers', text: 'Remolques', icon: TruckIcon, role: [UserRole.ADMIN, UserRole.USER], permission: '/trailers' },
    { to: '/driver-payments', text: 'Pago a Motoristas', icon: DocumentReportIcon, role: [UserRole.ADMIN, UserRole.USER], permission: '/driver-payments' },
    { to: '/reports', text: 'Reportes', icon: ChartPieIcon, role: [UserRole.ADMIN, UserRole.USER], permission: '/reports' },
    { to: '/dmti', text: 'DMTI', icon: DocumentReportIcon, role: [UserRole.ADMIN, UserRole.USER], permission: '/dmti' },
    { to: '/admin/users', text: 'Usuarios', icon: UsersIcon, role: [UserRole.ADMIN] },
  ];

  return (
    <>
      <div className="flex h-screen bg-slate-100">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-800 text-slate-100 flex flex-col no-print">
          <div className="h-16 flex items-center justify-center text-2xl font-bold text-white border-b border-slate-700">
            {APP_NAME}
          </div>
          <nav className="flex-1 px-4 py-4">
            <ul>
              {navItems.filter(item => {
                  if (!user) return false;
                  if (user.role === UserRole.ADMIN) return true;
                  
                  if (user.role === UserRole.USER) {
                      // Dashboard is always visible
                      if (item.to === '/') return true;
                      // For other items, check for 'view' permission
                      return user.permissions?.[item.permission as string]?.includes(PermissionAction.VIEW);
                  }
                  return false;
              }).map(item => (
                <li key={item.to}>
                  <NavLink 
                    to={item.to}
                    className={({ isActive }) => `flex items-center px-3 py-2 my-1 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.text}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="p-4 border-t border-slate-700">
            <div className="flex justify-between items-center">
                <div>
                    <div className="text-sm text-slate-400">Conectado como:</div>
                    <div className="font-semibold text-white">{user?.username} ({user?.role})</div>
                </div>
                <button onClick={() => setIsPasswordModalOpen(true)} title="Cambiar contraseña" className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-700">
                    <EditIcon className="w-5 h-5" />
                </button>
            </div>
            <button onClick={logout} className="w-full mt-4 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium bg-slate-700 hover:bg-red-600 transition-colors">
              <LogoutIcon className="h-5 w-5 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100">
            <div className="container mx-auto px-6 py-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <PasswordChangeModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
    </>
  );
};

export default Layout;