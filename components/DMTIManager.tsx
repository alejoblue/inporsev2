import React, { useState, useMemo } from 'react';
import { DMTI } from '../types';
import { useData } from '../hooks/useData';
import { usePermissions } from '../hooks/useAuth';
import { api } from '../services/api';
import { Card, Button, Input } from './ui/Common';
import { TrashIcon } from './ui/Icons';


const DMTIManager: React.FC = () => {
    const { dmtis, reloadData } = useData();
    const { canDelete } = usePermissions('/dmti');
    const [searchTerm, setSearchTerm] = useState('');

    const handleDelete = async (id: string) => {
        if (!canDelete) return;
        if (window.confirm('¿Estás seguro de que quieres borrar este registro de DMTI?')) {
            await api.deleteResource('dmtis', id);
            reloadData();
        }
    };
    
    const filteredDmtis = useMemo(() => {
        return [...dmtis]
            .filter(dmti => {
                if (!searchTerm) return true;
                const lowerSearch = searchTerm.toLowerCase();
                return (
                    dmti.clientName.toLowerCase().includes(lowerSearch) ||
                    dmti.containerNumber.toLowerCase().includes(lowerSearch) ||
                    dmti.id.toLowerCase().includes(lowerSearch)
                );
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [dmtis, searchTerm]);

    return (
        <Card>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                <h1 className="text-2xl font-bold">Gestión de DMTI</h1>
                <Input
                    id="search-dmti"
                    placeholder="Buscar por correlativo, cliente..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full md:w-72"
                    label=""
                />
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg" role="alert">
                <p className="text-sm text-blue-800">
                    <span className="font-bold">Información:</span> Los nuevos registros de DMTI ahora se crean directamente desde la sección de <span className="font-semibold">"Nuevo Viaje"</span> al seleccionar "DMTI" como tipo de proceso.
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Correlativo</th>
                            <th scope="col" className="px-6 py-3">Cliente</th>
                            <th scope="col" className="px-6 py-3">Contenedor</th>
                            <th scope="col" className="px-6 py-3">Fecha de Registro</th>
                            <th scope="col" className="px-6 py-3">Usuario</th>
                            <th scope="col" className="px-6 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDmtis.map(dmti => (
                            <tr key={dmti.id} className="bg-white hover:bg-slate-50 border-b">
                                <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{dmti.id}</th>
                                <td className="px-6 py-4">{dmti.clientName}</td>
                                <td className="px-6 py-4">{dmti.containerNumber}</td>
                                <td className="px-6 py-4">{new Date(`${dmti.registrationDate}T00:00:00.000Z`).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</td>
                                <td className="px-6 py-4">{dmti.user}</td>
                                <td className="px-6 py-4">
                                    <Button variant="ghost" onClick={() => handleDelete(dmti.id)} title="Borrar" disabled={!canDelete}>
                                        <TrashIcon className="w-5 h-5 text-red-600"/>
                                    </Button>
                                </td>
                            </tr>
                        ))}
                         {filteredDmtis.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-slate-500">No hay registros de DMTI que coincidan con la búsqueda.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default DMTIManager;