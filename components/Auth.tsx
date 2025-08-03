
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { APP_NAME } from '../constants';
import { Button, Input } from './ui/Common';

const Auth: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center">
        <div className="text-4xl font-bold text-slate-800 mb-2 flex items-center gap-3">
             <span className="text-5xl">🚚</span> {APP_NAME}
        </div>
        <p className="text-slate-600 mb-8">Sistema de Gestión de Fletes</p>
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-6">
          Iniciar Sesión
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm">{error}</p>}
          <Input 
            label="Nombre de Usuario"
            id="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <Input
            label="Contraseña"
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Procesando...' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Auth;