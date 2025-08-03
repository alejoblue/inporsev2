import React, { useState, useEffect } from 'react';
import { User, UserRole, PermissionAction } from '../types';
import { api } from '../services/api';
import { Card, Button, Modal, Input } from './ui/Common';
import { TrashIcon, EditIcon, PlusIcon, KeyIcon } from './ui/Icons';
import { useAuth } from '../hooks/useAuth';

const PERMISSION_OPTIONS = [
    { value: '/trips', label: 'Viajes' },
    { value: '/work-orders', label: 'Orden de Trabajo' },
    { value: '/clients', label: 'Clientes' },
    { value: '/drivers', label: 'Motoristas' },
    { value: '/trucks', label: 'Cabezales' },
    { value: '/trailers', label: 'Remolques' },
    { value: '/driver-payments', label: 'Pago a Motoristas' },
    { value: '/reports', label: 'Reportes de Rentabilidad' },
    { value: '/dmti', label: 'DMTI' },
];

const permissionActions = [
    { id: PermissionAction.VIEW, label: 'Ver' },
    { id: PermissionAction.CREATE, label: 'Crear' },
    { id: PermissionAction.EDIT, label: 'Editar' },
    { id: PermissionAction.DELETE, label: 'Borrar' },
];

const validatePassword = (password: string): { isValid: boolean, message: string } => {
    if (password.length < 10) {
        return { isValid: false, message: 'La contraseña debe tener al menos 10 caracteres.' };
    }
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: 'La contraseña debe contener al menos una letra mayúscula.' };
    }
    if (!/[a-z]/.test(password)) {
        return { isValid: false, message: 'La contraseña debe contener al menos una letra minúscula.' };
    }
    if (!/[0-9]/.test(password)) {
        return { isValid: false, message: 'La contraseña debe contener al menos un número.' };
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        return { isValid: false, message: 'La contraseña debe contener al menos un símbolo (ej. !@#$%).' };
    }
    return { isValid: true, message: 'Contraseña válida.' };
};

const UserFormModal: React.FC<{
    isOpen: boolean;
    userToEdit?: User | null;
    onClose: () => void;
    onSave: () => void;
}> = ({ isOpen, userToEdit, onClose, onSave }) => {
    const isEditMode = !!userToEdit;
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [permissions, setPermissions] = useState<{ [resource: string]: PermissionAction[] }>({});
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && userToEdit) {
                setUsername(userToEdit.username);
                setPermissions(userToEdit.permissions || {});
            } else {
                setUsername('');
                setPassword('');
                setConfirmPassword('');
                setPermissions({});
            }
            setError('');
        }
    }, [isOpen, userToEdit, isEditMode]);

    const handlePermissionChange = (resource: string, action: PermissionAction) => {
        setPermissions(prev => {
            const newPermissions = JSON.parse(JSON.stringify(prev));
            let resourceActions: PermissionAction[] = newPermissions[resource] || [];
            const hasAction = resourceActions.includes(action);

            if (hasAction) {
                resourceActions = resourceActions.filter((a) => a !== action);
                if (action === PermissionAction.VIEW) {
                    resourceActions = []; // Removing view removes all others
                }
            } else {
                resourceActions.push(action);
                if (action !== PermissionAction.VIEW && !resourceActions.includes(PermissionAction.VIEW)) {
                    resourceActions.push(PermissionAction.VIEW); // Adding any other perm adds view
                }
            }

            if (resourceActions.length === 0) {
                delete newPermissions[resource];
            } else {
                newPermissions[resource] = resourceActions;
            }
            return newPermissions;
        });
    };
    
    const handleSubmit = async () => {
        setError('');
        if (!isEditMode) {
            if (!username.trim()) {
                 setError('El nombre de usuario es requerido.');
                 return;
            }
            if (password !== confirmPassword) {
                setError('Las contraseñas no coinciden.');
                return;
            }
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                setError(passwordValidation.message);
                return;
            }
        }

        try {
            if (isEditMode && userToEdit) {
                await api.updateUser(userToEdit.id, { permissions });
            } else {
                await api.createUser({ username, password, permissions });
            }
            onSave();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error.');
        }
    };

    return (
       <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? `Editar Permisos: ${userToEdit?.username}` : 'Crear Nuevo Usuario'}>
            <div className="space-y-6">
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm">{error}</p>}
                <Input
                    label="Nombre de Usuario"
                    id="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={isEditMode}
                    required
                />
                {!isEditMode && (
                    <>
                        <Input label="Contraseña" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                        <Input label="Confirmar Contraseña" id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                    </>
                )}
                <div>
                    <h4 className="block text-sm font-medium text-slate-700 mb-2">Permisos de Acceso</h4>
                    <div className="border rounded-md bg-slate-50 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-200">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Módulo</th>
                                    {permissionActions.map(action => (
                                        <th key={action.id} className="px-4 py-2 text-center font-semibold text-slate-600">{action.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {PERMISSION_OPTIONS.map(opt => {
                                    const resourcePerms = permissions[opt.value] || [];
                                    const canView = resourcePerms.includes(PermissionAction.VIEW);
                                    return (
                                        <tr key={opt.value} className="border-b border-slate-200 last:border-b-0">
                                            <td className="px-4 py-2 font-medium text-slate-800">{opt.label}</td>
                                            {permissionActions.map(action => (
                                                <td key={action.id} className="px-4 py-2 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={resourcePerms.includes(action.id)}
                                                        onChange={() => handlePermissionChange(opt.value, action.id)}
                                                        className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500 disabled:bg-slate-300"
                                                        disabled={action.id !== PermissionAction.VIEW && !canView}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSubmit}>Guardar Cambios</Button>
                </div>
            </div>
        </Modal>
    );
};

const PasswordResetModal: React.FC<{ user: User, onClose: () => void, onSave: () => void }> = ({ user, onClose, onSave }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    
    const handleSubmit = async () => {
        setError('');
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            setError(passwordValidation.message);
            return;
        }
        if(password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        try {
            await api.updateUserPassword(user.id, password);
            onSave();
            onClose();
        } catch(err) {
            setError('No se pudo cambiar la contraseña.');
        }
    }

    return (
        <div className="space-y-4">
            {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm">{error}</p>}
            <p>Cambiando contraseña para: <span className="font-bold">{user.username}</span></p>
            <Input label="Nueva Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <Input label="Confirmar Nueva Contraseña" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
             <div className="flex justify-end space-x-2 mt-6">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSubmit}>Establecer Contraseña</Button>
            </div>
        </div>
    );
};

const UserManager: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isUserFormModalOpen, setIsUserFormModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const { user: currentUser } = useAuth();

    const fetchUsers = async () => {
        const userList = await api.getUsers();
        setUsers(userList);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (userId: string) => {
        if (userId === currentUser?.id) {
            alert('No puedes borrar tu propio usuario.');
            return;
        }
        if (window.confirm('¿Estás seguro de que quieres borrar este usuario permanentemente?')) {
            await api.deleteUser(userId);
            fetchUsers();
        }
    };
    
    const openUserFormModal = (user: User | null = null) => {
        setSelectedUser(user);
        setIsUserFormModalOpen(true);
    };

    const openPasswordModal = (user: User) => {
        setSelectedUser(user);
        setIsPasswordModalOpen(true);
    };
    
    const closeModal = () => {
        setSelectedUser(null);
        setIsUserFormModalOpen(false);
        setIsPasswordModalOpen(false);
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
                <Button onClick={() => openUserFormModal(null)}><PlusIcon className="w-5 h-5 mr-1 inline"/> Nuevo Usuario</Button>
            </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Nombre de Usuario</th>
                            <th scope="col" className="px-6 py-3">Rol</th>
                            <th scope="col" className="px-6 py-3">Módulos Asignados</th>
                            <th scope="col" className="px-6 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="bg-white border-b">
                                <td className="px-6 py-4 font-medium text-slate-900">{user.username}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === UserRole.ADMIN ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {user.role === UserRole.ADMIN ? 'Todos' : 
                                       Object.keys(user.permissions).length > 0 ? `${Object.keys(user.permissions).length} módulos` : 'Ninguno'
                                    }
                                </td>
                                <td className="px-6 py-4 flex space-x-1">
                                    {user.role === UserRole.USER && (
                                        <>
                                            <Button variant="ghost" onClick={() => openUserFormModal(user)} title="Editar permisos">
                                                <EditIcon className="w-5 h-5 text-blue-600"/>
                                            </Button>
                                            <Button variant="ghost" onClick={() => openPasswordModal(user)} title="Cambiar contraseña">
                                                <KeyIcon className="w-5 h-5 text-slate-600"/>
                                            </Button>
                                        </>
                                    )}
                                    <Button variant="ghost" onClick={() => handleDelete(user.id)} title="Borrar usuario" disabled={user.id === currentUser?.id || user.role === UserRole.ADMIN}>
                                        <TrashIcon className="w-5 h-5 text-red-600"/>
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <UserFormModal 
                isOpen={isUserFormModalOpen}
                userToEdit={selectedUser}
                onClose={closeModal}
                onSave={() => { fetchUsers(); closeModal(); }}
            />
            
            {selectedUser && (
                <Modal isOpen={isPasswordModalOpen} onClose={closeModal} title="Cambiar Contraseña">
                    <PasswordResetModal user={selectedUser} onClose={closeModal} onSave={fetchUsers} />
                </Modal>
            )}
        </Card>
    );
};

export default UserManager;