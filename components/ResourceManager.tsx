

import React, { useState, useMemo } from 'react';
import { ResourceType, Driver, Vehicle, UserRole, VehicleStatus, TripStatus, TripEventType, CargoType } from '../types';
import { useData } from '../hooks/useData';
import { useAuth, usePermissions } from '../hooks/useAuth';
import { api } from '../services/api';
import { Card, Button, Modal, Input, Select } from './ui/Common';
import { PlusIcon, EditIcon, TrashIcon, RestoreIcon } from './ui/Icons';

type Resource = Driver | Vehicle;

const ResourceForm: React.FC<{ resourceType: ResourceType; resource?: Resource; onClose: () => void; onSave: () => void; }> = ({ resourceType, resource, onClose, onSave }) => {
    const [formData, setFormData] = useState(resource || (resourceType === ResourceType.TRUCK ? { status: VehicleStatus.ACTIVE } : {}));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        try {
            const dataToSave: Partial<Driver & Vehicle> = { ...formData, isDeleted: false };
            
            if (resourceType === ResourceType.TRUCK && !dataToSave.status) {
                dataToSave.status = VehicleStatus.ACTIVE;
            }

            if (resource) {
                // Update: Use explicit generic types for the API call to resolve ambiguity
                if (resourceType === ResourceType.DRIVER) {
                    await api.updateResource<Driver>(resourceType, resource.id, dataToSave as Partial<Driver>);
                } else {
                    await api.updateResource<Vehicle>(resourceType, resource.id, dataToSave as Partial<Vehicle>);
                }
            } else {
                // Create
                if (resourceType === ResourceType.TRUCK || resourceType === ResourceType.TRAILER) {
                    (dataToSave as Vehicle).type = resourceType === ResourceType.TRUCK ? 'truck' : 'trailer';
                    await api.createResource<Vehicle>(resourceType, dataToSave as Omit<Vehicle, 'id'>);
                } else {
                    await api.createResource<Driver>(resourceType, dataToSave as Omit<Driver, 'id'>);
                }
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Failed to save resource', error);
        }
    };


    return (
        <div className="space-y-4">
            {resourceType === ResourceType.DRIVER && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Nombre Completo" name="name" value={(formData as Driver).name || ''} onChange={handleChange} required />
                    <Input label="Contacto" name="contact" value={(formData as Driver).contact || ''} onChange={handleChange} required/>
                    <Input label="Licencia" name="licenseNumber" value={(formData as Driver).licenseNumber || ''} onChange={handleChange} required/>
                    <Input label="Nº de DUI" name="duiNumber" value={(formData as Driver).duiNumber || ''} onChange={handleChange} required/>
                    <Input label="Camión" name="truckPlate" value={(formData as Driver).truckPlate || ''} onChange={handleChange} />
                    <div className="md:col-span-2">
                        <Input label="Observaciones" name="observations" value={(formData as Driver).observations || ''} onChange={handleChange} />
                    </div>
                </div>
            )}
            {(resourceType === ResourceType.TRUCK || resourceType === ResourceType.TRAILER) && (
                 <div className="space-y-4">
                    <Input label="Número de Placa" name="plate" value={(formData as Vehicle).plate || ''} onChange={handleChange} required />
                    {resourceType === ResourceType.TRAILER && (
                        <>
                            <Input label="Tipo de Remolque" name="trailerType" value={(formData as Vehicle).trailerType || ''} onChange={handleChange} />
                            <Input label="Tamaño del Remolque" name="trailerSize" value={(formData as Vehicle).trailerSize || ''} onChange={handleChange} />
                        </>
                    )}
                     {resourceType === ResourceType.TRUCK && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select label="Estatus" name="status" value={(formData as Vehicle).status || VehicleStatus.ACTIVE} onChange={handleChange}>
                                {Object.values(VehicleStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                            <Input
                                label="Fecha del Último Mantenimiento"
                                name="lastMaintenanceDate"
                                type="date"
                                value={(formData as Vehicle).lastMaintenanceDate || ''}
                                onChange={handleChange}
                            />
                        </div>
                    )}
                </div>
            )}
            <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSubmit}>Guardar</Button>
            </div>
        </div>
    );
};

const ResourceManager: React.FC<{ resourceType: ResourceType }> = ({ resourceType }) => {
    const { drivers, trucks, trailers, trips, reloadData } = useData();
    const { user } = useAuth();
    
    const permissionPathMap: { [key in ResourceType]?: string } = {
        [ResourceType.DRIVER]: '/drivers',
        [ResourceType.TRUCK]: '/trucks',
        [ResourceType.TRAILER]: '/trailers',
    };
    const permissionPath = permissionPathMap[resourceType] || '';
    const { canCreate, canEdit, canDelete } = usePermissions(permissionPath);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedResource, setSelectedResource] = useState<Resource | undefined>(undefined);
    const [showDeleted, setShowDeleted] = useState(false);
    const [sizeFilter, setSizeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');

    const dataMap = {
        [ResourceType.DRIVER]: drivers,
        [ResourceType.TRUCK]: trucks,
        [ResourceType.TRAILER]: trailers,
    };

    const titleMap = {
        [ResourceType.DRIVER]: 'Motoristas',
        [ResourceType.TRUCK]: 'Cabezales',
        [ResourceType.TRAILER]: 'Remolques',
    };

    const trailerInfo = useMemo(() => {
        const info = new Map<string, { status: string; driverName: string | null; tripServiceOrder: string | null; displayStatus: string }>();

        trailers.forEach(trailer => {
            info.set(trailer.id, { status: 'Disponible', driverName: null, tripServiceOrder: null, displayStatus: 'Disponible' });
        });

        const activeTrips = trips.filter(t => 
            t.status !== TripStatus.COMPLETED && 
            t.status !== TripStatus.CANCELED && 
            !t.isDeleted
        );

        activeTrips.forEach(trip => {
            trip.assignments.forEach(assignment => {
                if (assignment.trailerId) {
                    const sortedEvents = [...(assignment.events || [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    const lastEvent = sortedEvents.length > 0 ? sortedEvents[0] : null;

                    if (!lastEvent || lastEvent.type !== TripEventType.EMPTY_RETURN_END) {
                        const driver = drivers.find(d => d.id === assignment.driverId);

                        const cargoIdentifier = trip.cargoType === CargoType.CONTAINER 
                                                  ? assignment.containerNumber 
                                                  : assignment.merchandiseType;
                        const identifierString = cargoIdentifier || 'Carga no especificada';
                        const lastEventString = lastEvent ? lastEvent.type : 'Sin Eventos';
                        const displayStatus = `${identifierString} / ${lastEventString}`;

                        info.set(assignment.trailerId, {
                            status: 'En uso',
                            driverName: driver?.name || 'N/A',
                            tripServiceOrder: trip.serviceOrder,
                            displayStatus: displayStatus
                        });
                    }
                }
            });
        });

        return info;
    }, [trips, trailers, drivers]);
    
    const monthlyFuelConsumption = useMemo(() => {
        if (resourceType !== ResourceType.TRUCK) {
            return new Map<string, number>();
        }

        const consumptionMap = new Map<string, number>();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        trips.forEach(trip => {
            trip.assignments.forEach(assignment => {
                const truckId = assignment.truckId;
                if (!truckId) return;

                assignment.events.forEach(event => {
                    if (event.type === TripEventType.REPOSTAJE && event.galonaje) {
                        const eventDate = new Date(event.timestamp);
                        if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
                            const currentConsumption = consumptionMap.get(truckId) || 0;
                            consumptionMap.set(truckId, currentConsumption + event.galonaje);
                        }
                    }
                });
            });
        });

        return consumptionMap;
    }, [trips, resourceType]);

    const uniqueTrailerSizes = useMemo(() => {
        if (resourceType !== ResourceType.TRAILER) return [];
        const sizes = new Set(trailers.map(t => t.trailerSize).filter((size): size is string => !!size));
        return Array.from(sizes);
    }, [trailers, resourceType]);


    const resources = dataMap[resourceType];
    const title = titleMap[resourceType];

    const openModal = (resource?: Resource) => {
        setSelectedResource(resource);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedResource(undefined);
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (!canDelete) return;
        if (window.confirm('¿Estás seguro de que quieres borrar este elemento?')) {
            await api.deleteResource(resourceType, id);
            reloadData();
        }
    };

    const handleRecover = async (id: string) => {
        await api.recoverResource(resourceType, id);
        reloadData();
    };

    const filteredResources = useMemo(() => {
        let filtered = resources.filter(r => (user?.role === UserRole.ADMIN && showDeleted) ? r.isDeleted : !r.isDeleted);
        
        if (resourceType === ResourceType.TRAILER) {
            if (sizeFilter) {
                filtered = filtered.filter(r => (r as Vehicle).trailerSize === sizeFilter);
            }
            if (statusFilter) {
                filtered = filtered.filter(r => {
                    const info = trailerInfo.get(r.id);
                    return info?.status === statusFilter;
                });
            }
        }
        
        return filtered;
    }, [resources, showDeleted, user, resourceType, sizeFilter, statusFilter, trailerInfo]);

    const renderHeaders = () => {
        const thClass = "px-6 py-3";
        switch (resourceType) {
            case ResourceType.DRIVER: return (
                <>
                    <th scope="col" className={thClass}>Nombre</th>
                    <th scope="col" className={thClass}>CAMION</th>
                    <th scope="col" className={thClass}>LICENCIA</th>
                    <th scope="col" className={thClass}>DUI</th>
                    <th scope="col" className={thClass}>Contacto</th>
                    <th scope="col" className={thClass}>Observaciones</th>
                </>
            );
            case ResourceType.TRUCK: return <>
                <th scope="col" className={thClass}>Placa</th>
                <th scope="col" className={thClass}>Estatus</th>
                <th scope="col" className={thClass}>Consumo Mensual (Gal)</th>
                <th scope="col" className={thClass}>Último Mantenimiento</th>
            </>;
            case ResourceType.TRAILER: return <>
                <th scope="col" className={thClass}>Placa</th>
                <th scope="col" className={thClass}>Tipo</th>
                <th scope="col" className={thClass}>Tamaño</th>
                <th scope="col" className={thClass}>Estatus</th>
                <th scope="col" className={thClass}>En Uso Por</th>
            </>;
        }
    };

    const renderRow = (res: Resource) => {
        const tdClass = "px-6 py-4";
        switch (resourceType) {
            case ResourceType.DRIVER: 
                const d = res as Driver;
                return <>
                    <th scope="row" className={`${tdClass} font-medium text-slate-900 whitespace-nowrap`}>{d.name}</th>
                    <td className={tdClass}>{d.truckPlate || 'N/A'}</td>
                    <td className={tdClass}>{d.licenseNumber}</td>
                    <td className={tdClass}>{d.duiNumber}</td>
                    <td className={tdClass}>{d.contact}</td>
                    <td className={`${tdClass} max-w-xs truncate`} title={d.observations}>{d.observations || '-'}</td>
                </>;
            case ResourceType.TRUCK:
                 const t = res as Vehicle;
                 const consumption = monthlyFuelConsumption.get(t.id) || 0;
                return <>
                    <th scope="row" className={`${tdClass} font-medium text-slate-900 whitespace-nowrap`}>{t.plate}</th>
                    <td className={tdClass}>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            t.status === VehicleStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                            t.status === VehicleStatus.MAINTENANCE ? 'bg-yellow-100 text-yellow-800' :
                            t.status === VehicleStatus.OUT_OF_SERVICE ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                            {t.status || VehicleStatus.ACTIVE}
                        </span>
                    </td>
                    <td className={`${tdClass} font-mono`}>{consumption.toFixed(2)}</td>
                    <td className={tdClass}>
                        {t.lastMaintenanceDate 
                            ? new Date(`${t.lastMaintenanceDate}T00:00:00Z`).toLocaleDateString('es-ES', { timeZone: 'UTC' }) 
                            : 'N/A'}
                    </td>
                </>;
            case ResourceType.TRAILER:
                 const tr = res as Vehicle;
                 const info = trailerInfo.get(tr.id) || { status: 'Disponible', driverName: null, displayStatus: 'Disponible' };
                return <>
                    <th scope="row" className={`${tdClass} font-medium text-slate-900 whitespace-nowrap`}>{tr.plate}</th>
                    <td className={tdClass}>{tr.trailerType}</td>
                    <td className={tdClass}>{tr.trailerSize || 'N/A'}</td>
                    <td className={tdClass}>
                        {info.status === 'En uso' ? (
                            <span>{info.displayStatus}</span>
                        ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                {info.displayStatus}
                            </span>
                        )}
                    </td>
                    <td className={tdClass}>{info.status === 'En uso' ? info.driverName : '-'}</td>
                </>;
        }
    };
    
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Gestión de {title}</h1>
                 <div className="flex items-center gap-2">
                 {resourceType === ResourceType.TRAILER && (
                    <div className="flex items-center gap-2">
                        <Select label="" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-36 text-sm">
                            <option value="">Todo Estatus</option>
                            <option value="Disponible">Disponible</option>
                            <option value="En uso">En uso</option>
                        </Select>
                        <Select label="" value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} className="w-36 text-sm">
                            <option value="">Todo Tamaño</option>
                            {uniqueTrailerSizes.map(size => <option key={size} value={size}>{size}</option>)}
                        </Select>
                    </div>
                 )}
                 {user?.role === UserRole.ADMIN && (
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={showDeleted} onChange={() => setShowDeleted(!showDeleted)} className="form-checkbox h-5 w-5 text-blue-600 rounded" />
                        <span className="text-sm text-slate-600">Mostrar borrados</span>
                    </label>
                  )}
                <Button onClick={() => openModal()} disabled={!canCreate}><PlusIcon className="w-5 h-5 mr-1 inline"/> Nuevo</Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                            {renderHeaders()}
                            <th scope="col" className="px-6 py-3 text-right">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredResources.map(res => (
                            <tr key={res.id} className={`bg-white border-b ${res.isDeleted ? 'bg-red-50' : ''}`}>
                                {renderRow(res)}
                                <td className="px-6 py-4 text-right flex justify-end space-x-2">
                                     {res.isDeleted ? (
                                        user?.role === UserRole.ADMIN && <Button variant="ghost" onClick={() => handleRecover(res.id)} title="Recuperar"><RestoreIcon className="w-5 h-5 text-green-600"/></Button>
                                    ) : (
                                        <>
                                            <Button variant="ghost" onClick={() => openModal(res)} title="Editar" disabled={!canEdit}><EditIcon className="w-5 h-5 text-blue-600"/></Button>
                                            <Button variant="ghost" onClick={() => handleDelete(res.id)} title="Borrar" disabled={!canDelete}><TrashIcon className="w-5 h-5 text-red-600"/></Button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={selectedResource ? `Editar ${title}` : `Nuevo ${title}`}>
                <ResourceForm resourceType={resourceType} resource={selectedResource} onClose={closeModal} onSave={reloadData} />
            </Modal>
        </Card>
    );
};

export default ResourceManager;