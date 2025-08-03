import React, { useState, useMemo } from 'react';
import { Client, CompanySize, UserRole } from '../types';
import { useData } from '../hooks/useData';
import { useAuth, usePermissions } from '../hooks/useAuth';
import { api } from '../services/api';
import { Card, Button, Modal, Input, Select } from './ui/Common';
import { PlusIcon, EditIcon, TrashIcon, RestoreIcon, UploadIcon } from './ui/Icons';
import * as XLSX from 'xlsx';

const ClientForm: React.FC<{
    client?: Client;
    onClose: () => void;
    onSave: () => void;
}> = ({ client, onClose, onSave }) => {
    
    const getInitialFormData = (): Partial<Client> => {
        if (client) return { ...client };
        return {
            razonSocial: '',
            nit: '',
            giroComercial: '',
            companySize: CompanySize.PEQUEÑA,
            phone: '',
            email: '',
            referencePerson: '',
            isDeleted: false,
            flete: 0,
            dmti: 0,
        };
    };

    const [formData, setFormData] = useState<Partial<Client>>(getInitialFormData());

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'flete' || name === 'dmti') {
            setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async () => {
        try {
            if (client) {
                await api.updateResource<Client>('clients', client.id, formData);
            } else {
                await api.createResource<Client>('clients', formData as Omit<Client, 'id'>);
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Failed to save client', error);
        }
    };
    
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Razón Social" name="razonSocial" value={formData.razonSocial || ''} onChange={handleChange} required />
                <Input label="NIT" name="nit" value={formData.nit || ''} onChange={handleChange} required />
                <Input label="Giro Comercial" name="giroComercial" value={formData.giroComercial || ''} onChange={handleChange} />
                 <Select label="Tamaño de la Empresa" name="companySize" value={formData.companySize} onChange={handleChange}>
                    {Object.values(CompanySize).map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Input label="Teléfono" name="phone" value={formData.phone || ''} onChange={handleChange} />
                <Input label="Email" name="email" type="email" value={formData.email || ''} onChange={handleChange} />
                <Input label="Persona de Referencia" name="referencePerson" value={formData.referencePerson || ''} onChange={handleChange} />
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    <Input label="Tarifa Flete (por contenedor/viaje)" name="flete" type="number" placeholder="0.00" value={formData.flete || ''} onChange={handleChange} />
                    <Input label="Tarifa DMTI (por contenedor)" name="dmti" type="number" placeholder="0.00" value={formData.dmti || ''} onChange={handleChange} />
                </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSubmit}>Guardar</Button>
            </div>
        </div>
    );
};

const ImportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess: () => void;
}> = ({ isOpen, onClose, onImportSuccess }) => {
    const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setImportResult(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json<any>(worksheet);

                if (json.length === 0) {
                    throw new Error("El archivo Excel está vacío o no tiene datos en la primera hoja.");
                }

                const requiredHeaders = ['razonSocial', 'nit', 'giroComercial', 'companySize', 'phone', 'email', 'referencePerson', 'flete', 'dmti'];
                const fileHeaders = Object.keys(json[0]);
                const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h));

                if (missingHeaders.length > 0) {
                    throw new Error(`Faltan las siguientes columnas en el archivo: ${missingHeaders.join(', ')}`);
                }

                let successCount = 0;
                const errorMessages: string[] = [];

                for (let i = 0; i < json.length; i++) {
                    const row = json[i];
                    try {
                        const newClient: Omit<Client, 'id' | 'isDeleted'> = {
                            razonSocial: String(row.razonSocial || '').trim(),
                            nit: String(row.nit || '').trim(),
                            giroComercial: String(row.giroComercial || '').trim(),
                            companySize: Object.values(CompanySize).includes(row.companySize) ? row.companySize : CompanySize.PEQUEÑA,
                            phone: String(row.phone || '').trim(),
                            email: String(row.email || '').trim(),
                            referencePerson: String(row.referencePerson || '').trim(),
                            flete: Number(row.flete) || 0,
                            dmti: Number(row.dmti) || 0,
                        };

                        if (!newClient.razonSocial || !newClient.nit) {
                            throw new Error("Razón Social y NIT son requeridos.");
                        }

                        await api.createResource<Client>('clients', newClient as Omit<Client, 'id'>);
                        successCount++;
                    } catch (err: any) {
                        errorMessages.push(`Fila ${i + 2}: ${err.message || 'Error desconocido'}`);
                    }
                }

                setImportResult({ success: successCount, errors: errorMessages });
                if (successCount > 0) {
                    onImportSuccess();
                }

            } catch (error: any) {
                setImportResult({ success: 0, errors: [error.message || 'Error al procesar el archivo. Asegúrese de que es un archivo Excel válido.'] });
            } finally {
                setIsProcessing(false);
            }
        };

        reader.onerror = () => {
             setImportResult({ success: 0, errors: ['No se pudo leer el archivo.'] });
             setIsProcessing(false);
        };
        
        reader.readAsArrayBuffer(file);
        if (e.target) e.target.value = ''; // Reset file input
    };

    const handleClose = () => {
        setImportResult(null);
        setIsProcessing(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Importar Clientes desde Excel">
             <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-slate-700">Instrucciones:</h4>
                    <p className="text-sm text-slate-600">
                        Suba un archivo <code>.xlsx</code> con las siguientes columnas exactas en la primera hoja:
                    </p>
                    <ul className="list-disc list-inside text-sm text-slate-500 mt-2 bg-slate-50 p-3 rounded-md">
                        <li><code>razonSocial</code> (Texto, requerido)</li>
                        <li><code>nit</code> (Texto, requerido)</li>
                        <li><code>giroComercial</code> (Texto)</li>
                        <li><code>companySize</code> (Valores permitidos: Pequeña, Mediana, Grande)</li>
                        <li><code>phone</code> (Texto)</li>
                        <li><code>email</code> (Texto)</li>
                        <li><code>referencePerson</code> (Texto)</li>
                        <li><code>flete</code> (Número)</li>
                        <li><code>dmti</code> (Número)</li>
                    </ul>
                </div>
                
                <div className="pt-4 border-t">
                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="excel-upload">Seleccionar archivo</label>
                    <input 
                      id="excel-upload"
                      type="file"
                      accept=".xlsx"
                      onChange={handleFileChange}
                      disabled={isProcessing}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>

                {isProcessing && <p className="text-sm text-blue-600">Procesando archivo, por favor espere...</p>}

                {importResult && (
                    <div className="mt-4 p-3 rounded-md bg-slate-100 max-h-60 overflow-y-auto">
                        <h5 className="font-semibold">Resultado de la Importación:</h5>
                        <p className="text-sm text-green-700">Se agregaron {importResult.success} clientes exitosamente.</p>
                        {importResult.errors.length > 0 && (
                            <>
                                <p className="text-sm text-red-700 mt-2">{importResult.errors.length} filas tuvieron errores:</p>
                                <ul className="list-disc list-inside text-xs text-red-600">
                                    {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            </>
                        )}
                    </div>
                )}
             </div>
        </Modal>
    )
};

const ClientManager: React.FC = () => {
    const { clients, reloadData } = useData();
    const { user } = useAuth();
    const { canCreate, canEdit, canDelete } = usePermissions('/clients');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);
    const [showDeleted, setShowDeleted] = useState(false);

    const openModal = (client?: Client) => {
        setSelectedClient(client);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedClient(undefined);
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (!canDelete) return;
        if (window.confirm('¿Estás seguro de que quieres borrar este cliente?')) {
            await api.deleteResource('clients', id);
            reloadData();
        }
    };

    const handleRecover = async (id: string) => {
        await api.recoverResource('clients', id);
        reloadData();
    };
    
    const filteredClients = useMemo(() => {
        return clients.filter(c => (user?.role === UserRole.ADMIN && showDeleted) ? c.isDeleted : !c.isDeleted);
    }, [clients, showDeleted, user]);

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Gestión de Clientes</h1>
                <div className="flex items-center gap-2">
                    {user?.role === UserRole.ADMIN && (
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={showDeleted} onChange={() => setShowDeleted(!showDeleted)} className="form-checkbox h-5 w-5 text-blue-600 rounded" />
                            <span className="text-sm text-slate-600">Mostrar borrados</span>
                        </label>
                    )}
                    <Button onClick={() => setIsImportModalOpen(true)} variant="secondary" disabled={!canCreate}>
                        <UploadIcon className="w-5 h-5 mr-1 inline"/>
                        Importar
                    </Button>
                    <Button onClick={() => openModal()} disabled={!canCreate}><PlusIcon className="w-5 h-5 mr-1 inline"/> Nuevo Cliente</Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Razón Social</th>
                            <th scope="col" className="px-6 py-3">NIT</th>
                            <th scope="col" className="px-6 py-3">Giro Comercial</th>
                            <th scope="col" className="px-6 py-3">Teléfono</th>
                            <th scope="col" className="px-6 py-3">Email</th>
                            <th scope="col" className="px-6 py-3">Referencia</th>
                            <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClients.map(client => (
                            <tr key={client.id} className={`bg-white border-b ${client.isDeleted ? 'bg-red-50' : ''}`}>
                                <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{client.razonSocial}</th>
                                <td className="px-6 py-4">{client.nit}</td>
                                <td className="px-6 py-4">{client.giroComercial}</td>
                                <td className="px-6 py-4">{client.phone}</td>
                                <td className="px-6 py-4">{client.email}</td>
                                <td className="px-6 py-4">{client.referencePerson}</td>
                                <td className="px-6 py-4 text-right flex justify-end space-x-2">
                                     {client.isDeleted ? (
                                        user?.role === UserRole.ADMIN && <Button variant="ghost" onClick={() => handleRecover(client.id)} title="Recuperar"><RestoreIcon className="w-5 h-5 text-green-600"/></Button>
                                    ) : (
                                        <>
                                            <Button variant="ghost" onClick={() => openModal(client)} title="Editar" disabled={!canEdit}><EditIcon className="w-5 h-5 text-blue-600"/></Button>
                                            <Button variant="ghost" onClick={() => handleDelete(client.id)} title="Borrar" disabled={!canDelete}><TrashIcon className="w-5 h-5 text-red-600"/></Button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={selectedClient ? 'Editar Cliente' : 'Nuevo Cliente'}>
                <ClientForm client={selectedClient} onClose={closeModal} onSave={reloadData} />
            </Modal>
            
            <ImportModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)}
                onImportSuccess={reloadData}
            />
        </Card>
    );
};

export default ClientManager;