import React, { useState, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Trip, TripStatus, Driver, Vehicle, UserRole, TripEvent, TripEventType, VehicleStatus, TripAssignment, CargoType, Client, DMTI, DMTIUser, InvoiceStatus } from '../types';
import { useData } from '../hooks/useData';
import { useAuth, usePermissions } from '../hooks/useAuth';
import { api } from '../services/api';
import { Card, Button, Modal, Input, Select } from './ui/Common';
import { PlusIcon, EditIcon, TrashIcon, RestoreIcon } from './ui/Icons';


const AssignmentEventManager: React.FC<{
    events: TripEvent[];
    drivers: Driver[];
    onUpdateEvents: (newEvents: TripEvent[]) => void;
    disabled?: boolean;
}> = ({ events, drivers, onUpdateEvents, disabled }) => {
    const [newEvent, setNewEvent] = useState<{ type: TripEventType | ''; notes: string; amount: string; assignedDriverId: string; galonaje: string; precioGalon: string; numeroDocumento: string; unhookCost: string; demurrageRate: string; }>({ type: '', notes: '', amount: '', assignedDriverId: '', galonaje: '', precioGalon: '', numeroDocumento: '', unhookCost: '', demurrageRate: '' });

    const handleAddEvent = () => {
        if (!newEvent.type) {
            alert("Por favor seleccione un tipo de evento.");
            return;
        }
        const eventToAdd: TripEvent = {
            type: newEvent.type,
            notes: newEvent.notes,
            timestamp: new Date().toISOString(),
        };

        if (newEvent.type === TripEventType.MOVEMENT) {
            if (!newEvent.amount || isNaN(parseFloat(newEvent.amount))) {
                alert("Por favor ingrese un valor numérico válido para el monto.");
                return;
            }
            eventToAdd.amount = parseFloat(newEvent.amount);
            if (newEvent.assignedDriverId) eventToAdd.assignedDriverId = newEvent.assignedDriverId;
        }
        
        if (newEvent.type === TripEventType.REPOSTAJE) {
            if (!newEvent.galonaje || isNaN(parseFloat(newEvent.galonaje))) {
                alert("Por favor ingrese un valor numérico válido para el galonaje.");
                return;
            }
            if (!newEvent.precioGalon || isNaN(parseFloat(newEvent.precioGalon))) {
                alert("Por favor ingrese un valor numérico válido para el precio por galón.");
                return;
            }
            if (!newEvent.numeroDocumento?.trim()) {
                alert("Por favor ingrese el número de documento.");
                return;
            }
            eventToAdd.galonaje = parseFloat(newEvent.galonaje);
            eventToAdd.precioGalon = parseFloat(newEvent.precioGalon);
            eventToAdd.numeroDocumento = newEvent.numeroDocumento.trim();
        }

        if (newEvent.type === TripEventType.UNHOOK) {
            if (!newEvent.unhookCost || isNaN(parseFloat(newEvent.unhookCost))) {
                alert("Por favor ingrese un valor numérico válido para el costo de desenganche.");
                return;
            }
            eventToAdd.unhookCost = parseFloat(newEvent.unhookCost);
        }

        if (newEvent.type === TripEventType.STAY_START) {
            if (!newEvent.demurrageRate || isNaN(parseFloat(newEvent.demurrageRate))) {
                alert("Por favor ingrese un valor numérico válido para la tarifa de estadía.");
                return;
            }
            eventToAdd.demurrageRate = parseFloat(newEvent.demurrageRate);
        }

        const updatedEvents = [...(events || []), eventToAdd].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        onUpdateEvents(updatedEvents);
        setNewEvent({ type: '', notes: '', amount: '', assignedDriverId: '', galonaje: '', precioGalon: '', numeroDocumento: '', unhookCost: '', demurrageRate: '' }); // Reset form
    };

    return (
        <div className="mt-4 pt-4 border-t border-slate-200">
            <h5 className="text-md font-semibold mb-2">Eventos de la Asignación</h5>
            <div className="space-y-4">
                <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-50 p-2 rounded-md border">
                    {events && events.length > 0 ? [...events].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((event, index) => (
                        <div key={index} className="p-2 rounded-md bg-white shadow-sm">
                            <div className="flex justify-between items-start">
                                <div><span className="font-semibold text-sm text-slate-700">{event.type}</span></div>
                                <span className="text-xs text-slate-500">{new Date(event.timestamp).toLocaleString('es-ES')}</span>
                            </div>
                            {event.notes && <p className="text-sm text-slate-600 mt-1">Notas: {event.notes}</p>}
                            {event.type === TripEventType.MOVEMENT && event.amount && (
                                <p className="text-sm text-slate-600 mt-1 font-semibold">Monto: ${event.amount.toFixed(2)}</p>
                            )}
                             {event.type === TripEventType.STAY_START && event.demurrageRate && (
                                <p className="text-sm text-slate-600 mt-1 font-semibold">Tarifa Estadía: ${event.demurrageRate.toFixed(2)} / día</p>
                            )}
                            {event.type === TripEventType.UNHOOK && event.unhookCost && (
                                <p className="text-sm text-slate-600 mt-1 font-semibold">Costo Desenganche: ${event.unhookCost.toFixed(2)}</p>
                            )}
                            {event.type === TripEventType.REPOSTAJE && (
                                <div className="text-sm text-slate-600 mt-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                                    <p><span className="font-semibold">Galones:</span> {event.galonaje?.toFixed(2)}</p>
                                    <p><span className="font-semibold">Precio/Gal:</span> ${event.precioGalon?.toFixed(2)}</p>
                                    <p className="col-span-2 sm:col-span-1"><span className="font-semibold">Doc:</span> {event.numeroDocumento}</p>
                                    <p className="col-span-2 sm:col-span-1 font-semibold text-slate-800">Total: ${( (event.galonaje || 0) * (event.precioGalon || 0) ).toFixed(2)}</p>
                                </div>
                            )}
                        </div>
                    )) : <p className="text-sm text-slate-500 text-center py-4">No hay eventos registrados.</p>}
                </div>
                {!disabled && (
                  <div className="pt-2 border-t">
                       <div className="space-y-4">
                         <Select label="Tipo de Evento" value={newEvent.type} onChange={e => setNewEvent(p => ({...p, type: e.target.value as TripEventType, amount: '', assignedDriverId: '', galonaje: '', precioGalon: '', numeroDocumento: '', unhookCost: '', demurrageRate: ''}))}>
                             <option value="" disabled>Añadir nuevo evento...</option>
                             {Object.values(TripEventType).map(et => <option key={et} value={et}>{et}</option>)}
                         </Select>
                         {newEvent.type && (
                           <>
                             <Input label="Notas Adicionales" value={newEvent.notes} onChange={e => setNewEvent(p => ({...p, notes: e.target.value}))} />
                             {newEvent.type === TripEventType.MOVEMENT && (
                                 <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-blue-50">
                                     <Input label="Monto (USD)" type="number" placeholder="Ej: 20.00" value={newEvent.amount} onChange={e => setNewEvent(p => ({...p, amount: e.target.value}))}/>
                                     <Select label="Asignar a Motorista (Opcional)" value={newEvent.assignedDriverId} onChange={e => setNewEvent(p => ({...p, assignedDriverId: e.target.value}))}>
                                         <option value="">Motorista de la asignación</option>
                                         {drivers.filter(d => !d.isDeleted).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                     </Select>
                                 </div>
                             )}
                              {newEvent.type === TripEventType.UNHOOK && (
                                 <div className="grid grid-cols-1 gap-4 p-4 border rounded-md bg-indigo-50">
                                     <Input label="Costo Desenganche (USD)" type="number" placeholder="Ej: 50.00" value={newEvent.unhookCost} onChange={e => setNewEvent(p => ({...p, unhookCost: e.target.value}))}/>
                                 </div>
                             )}
                             {newEvent.type === TripEventType.REPOSTAJE && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md bg-yellow-50">
                                    <Input label="Galonaje" type="number" placeholder="Ej: 15.5" value={newEvent.galonaje} onChange={e => setNewEvent(p => ({...p, galonaje: e.target.value}))}/>
                                    <Input label="Precio del Galón (USD)" type="number" placeholder="Ej: 4.50" value={newEvent.precioGalon} onChange={e => setNewEvent(p => ({...p, precioGalon: e.target.value}))}/>
                                    <Input label="Número de Documento" type="text" placeholder="Factura/Ticket #" value={newEvent.numeroDocumento} onChange={e => setNewEvent(p => ({...p, numeroDocumento: e.target.value}))}/>
                                </div>
                            )}
                             {newEvent.type === TripEventType.STAY_START && (
                                <div className="grid grid-cols-1 gap-4 p-4 border rounded-md bg-green-50">
                                    <Input label="Tarifa Estadía (por día, USD)" type="number" placeholder="Ej: 75.00" value={newEvent.demurrageRate} onChange={e => setNewEvent(p => ({...p, demurrageRate: e.target.value}))}/>
                                </div>
                            )}
                             <div className="flex justify-end">
                                  <Button type="button" variant="secondary" onClick={handleAddEvent}>Añadir Evento</Button>
                             </div>
                           </>
                         )}
                      </div>
                  </div>
                )}
            </div>
        </div>
    );
};


const TripForm: React.FC<{ 
    trip?: Trip, 
    onClose: () => void, 
    onSave: () => void,
    trailerInfo: Map<string, { status: string; driverName: string | null; tripServiceOrder: string | null; }>
}> = ({ trip, onClose, onSave, trailerInfo }) => {
    const { drivers, trucks, trailers, clients } = useData();
    const { canEdit } = usePermissions('/trips');

    const isCompleted = trip?.status === TripStatus.COMPLETED;
    const isReadOnly = !canEdit || isCompleted;
    const isEditMode = !!trip;
    
    const [processType, setProcessType] = useState<'TRIP' | 'DMTI'>('TRIP');

    const getInitialFormData = (): Partial<Trip> => {
        if (trip) {
            return { ...trip };
        }
        return {
            serviceOrder: '',
            clientName: '',
            status: TripStatus.CONFIRMED,
            isDeleted: false,
            origin: 'Puerto Cortés',
            destination: '',
            billOfLading: '',
            shippingLine: '',
            weightKg: 0,
            cargoType: CargoType.CONTAINER,
            assignments: [],
            demurrage: 0,
            unhookCost: 0,
            invoiceStatus: InvoiceStatus.ACTIVE,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    };

    const [formData, setFormData] = useState<Partial<Trip>>(getInitialFormData());

    const defaultDmtiData = {
        registrationDate: new Date().toISOString().split('T')[0],
        startingCustoms: '',
        user: DMTIUser.TRANSPORTE,
    };

    useEffect(() => {
        if (processType === 'DMTI' && !isEditMode) {
             setFormData(prev => {
                let newAssignments = [...(prev.assignments || [])];
                if (newAssignments.length === 0) {
                     newAssignments.push({
                        id: uuidv4(), containerNumber: '', merchandiseType: '', cost: 0, driverId: '', truckId: '', trailerId: '', events: [],
                        dmti: defaultDmtiData
                    });
                } else {
                    newAssignments = newAssignments.map(a => ({...a, dmti: a.dmti || defaultDmtiData}));
                }
                 return {
                    ...prev,
                    cargoType: CargoType.CONTAINER,
                    assignments: newAssignments
                };
            });
        }
    }, [processType, isEditMode]);

    const handleProcessTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newProcessType = e.target.value as 'TRIP' | 'DMTI';
        setProcessType(newProcessType);

        const selectedClient = clients.find(c => c.razonSocial === formData.clientName);
        if (selectedClient) {
            const dmtiCost = selectedClient.dmti || 0;
            setFormData(prev => {
                const updatedAssignments = (prev.assignments || []).map(a => ({
                    ...a,
                    dmtiCost: newProcessType === 'DMTI' ? dmtiCost : undefined
                }));
                return { ...prev, assignments: updatedAssignments };
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'clientName') {
            const selectedClient = clients.find(c => c.razonSocial === value);
            const freightCost = selectedClient?.flete || 0;
            const dmtiCost = selectedClient?.dmti || 0;

            setFormData(prev => {
                const updatedAssignments = (prev.assignments || []).map(a => ({
                    ...a,
                    cost: freightCost,
                    dmtiCost: processType === 'DMTI' ? dmtiCost : a.dmtiCost
                }));
                return { 
                    ...prev, 
                    clientName: value,
                    assignments: updatedAssignments
                };
            });
            return;
        }
        
        if (name === 'cargoType') {
            const newCargoType = value as CargoType;
             setFormData(prev => {
                let newAssignments = [...(prev.assignments || [])];
                if (newAssignments.length === 0) {
                    const selectedClient = clients.find(c => c.razonSocial === prev.clientName);
                    const freightCost = selectedClient?.flete || 0;
                    newAssignments.push({ id: uuidv4(), containerNumber: '', merchandiseType: '', cost: freightCost, driverId: '', truckId: '', trailerId: '', events: [] });
                }
                return { ...prev, cargoType: newCargoType, assignments: newAssignments };
            });
            return;
        }

        const val = name === 'weightKg' || name === 'cost' ? parseFloat(value) || 0 : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };
    
    const handleAssignmentChange = (index: number, field: keyof Omit<TripAssignment, 'dmti' | 'dmtiCost'>, value: any) => {
        const newAssignments = [...(formData.assignments || [])];
        const currentAssignment = newAssignments[index];

        if (field === 'driverId') {
            currentAssignment.driverId = value;
            const selectedDriver = drivers.find(d => d.id === value);
            if (selectedDriver && selectedDriver.truckPlate) {
                const assignedTruck = trucks.find(t => 
                    t.plate === selectedDriver.truckPlate && 
                    !t.isDeleted && 
                    t.status === VehicleStatus.ACTIVE
                );
                // Set truckId if found, otherwise clear it to force user selection
                currentAssignment.truckId = assignedTruck ? assignedTruck.id : '';
            } else {
                // If no driver or no plate, clear truck
                currentAssignment.truckId = '';
            }
        } else {
            const val = field === 'cost' ? parseFloat(value) || 0 : value;
            (currentAssignment as any)[field] = val;
        }

        setFormData(prev => ({ ...prev, assignments: newAssignments }));
    };

    const handleAssignmentDmtiChange = (index: number, field: string, value: any) => {
        const newAssignments = [...(formData.assignments || [])];
        if (newAssignments[index] && newAssignments[index].dmti) {
            (newAssignments[index].dmti as any)[field] = value;
            setFormData(prev => ({ ...prev, assignments: newAssignments }));
        }
    };

    const handleAssignmentEventsChange = (index: number, newEvents: TripEvent[]) => {
        const newAssignments = [...(formData.assignments || [])];
        newAssignments[index] = { ...newAssignments[index], events: newEvents };
        setFormData(prev => ({ ...prev, assignments: newAssignments }));
    };
    
    const handleAddAssignment = () => {
        const selectedClient = clients.find(c => c.razonSocial === formData.clientName);
        const freightCost = selectedClient?.flete || 0;
        const dmtiCost = selectedClient?.dmti || 0;

        const newAssignment: TripAssignment = {
            id: uuidv4(), containerNumber: '', merchandiseType: '', cost: freightCost, driverId: '', truckId: '', trailerId: '', events: []
        };
        if (processType === 'DMTI') {
             if (!isEditMode) newAssignment.dmti = defaultDmtiData;
             newAssignment.dmtiCost = dmtiCost;
        }
        setFormData(prev => ({ ...prev, assignments: [...(prev.assignments || []), newAssignment] }));
    };

    const handleRemoveAssignment = (index: number) => {
        const newAssignments = [...(formData.assignments || [])];
        newAssignments.splice(index, 1);
        setFormData(prev => ({ ...prev, assignments: newAssignments }));
    };

    const handleSubmit = async () => {
        if (formData.status === TripStatus.COMPLETED) {
            const hasEmptyReturnEndEvent = formData.assignments?.some(a =>
                a.events.some(e => e.type === TripEventType.EMPTY_RETURN_END)
            );

            if (!hasEmptyReturnEndEvent) {
                alert("Confirme el Fin de Retorno Vacío para poder completar el viaje.");
                return;
            }
        }

        // --- Demurrage Calculation ---
        let calculatedDemurrage = 0;
        if (formData.assignments) {
            formData.assignments.forEach(assignment => {
                const stayStartEvent = assignment.events.find(e => e.type === TripEventType.STAY_START);
                const stayEndEvent = assignment.events.find(e => e.type === TripEventType.STAY_END);
                const demurrageRate = stayStartEvent?.demurrageRate || 0;

                if (demurrageRate > 0 && stayStartEvent && stayEndEvent) {
                    const startTime = new Date(stayStartEvent.timestamp).getTime();
                    const endTime = new Date(stayEndEvent.timestamp).getTime();
                    const durationMillis = Math.max(0, endTime - startTime);
                    
                    if (durationMillis > 0) {
                        const durationDays = Math.ceil(durationMillis / (1000 * 60 * 60 * 24));
                        calculatedDemurrage += durationDays * demurrageRate;
                    }
                }
            });
        }
        
        // --- Unhook Cost Calculation ---
        let calculatedUnhookCost = 0;
        if (formData.assignments) {
            formData.assignments.forEach(assignment => {
                assignment.events.forEach(event => {
                    if (event.type === TripEventType.UNHOOK && event.unhookCost) {
                        calculatedUnhookCost += event.unhookCost;
                    }
                });
            });
        }

        const dataWithCosts = { 
            ...formData, 
            demurrage: calculatedDemurrage,
            unhookCost: calculatedUnhookCost
        };

        try {
            if (isEditMode) {
                 const finalData = { ...dataWithCosts };
                 finalData.assignments?.forEach(a => {
                    if (finalData.cargoType === CargoType.CONTAINER) a.merchandiseType = ''; else a.containerNumber = '';
                });
                if (finalData.status === TripStatus.COMPLETED && !finalData.invoiceStatus) {
                    finalData.invoiceStatus = InvoiceStatus.ACTIVE;
                }
                await api.updateResource<Trip>('trips', trip.id, { ...finalData, updatedAt: new Date().toISOString() });
            } else {
                if (processType === 'DMTI') {
                    if (!formData.clientName || !formData.assignments || formData.assignments.length === 0) {
                        alert('Para un proceso DMTI, el Cliente es obligatorio y debe haber al menos un contenedor.');
                        return;
                    }

                    for (const assignment of (formData.assignments || [])) {
                        if (!assignment.containerNumber?.trim() || !assignment.dmti?.startingCustoms?.trim()) {
                           alert('Para cada contenedor en un proceso DMTI, el número de contenedor y la Aduana de Inicio son obligatorios.');
                           return;
                        }
                    }
                    
                    for (const assignment of (formData.assignments || [])) {
                        if (assignment.dmti) {
                            const dmtiToCreate: Omit<DMTI, 'id' | 'createdAt'> = {
                                clientName: formData.clientName as string,
                                containerNumber: assignment.containerNumber,
                                registrationDate: assignment.dmti.registrationDate,
                                startingCustoms: assignment.dmti.startingCustoms,
                                user: assignment.dmti.user,
                            };
                            await api.createDMTI(dmtiToCreate);
                        }
                    }
                }
                
                const serviceOrder = await api.getNextServiceOrder();
                const cleanedAssignments = dataWithCosts.assignments?.map(a => {
                    const { dmti, ...rest } = a;
                    if (dataWithCosts.cargoType === CargoType.CONTAINER) rest.merchandiseType = ''; else rest.containerNumber = '';
                    return rest;
                });

                const newTripData: Omit<Trip, 'id'> = {
                    ...getInitialFormData(),
                    ...dataWithCosts,
                    assignments: cleanedAssignments,
                    serviceOrder,
                } as Omit<Trip, 'id'>;

                if (newTripData.status === TripStatus.COMPLETED && !newTripData.invoiceStatus) {
                    newTripData.invoiceStatus = InvoiceStatus.ACTIVE;
                }

                await api.createResource<Trip>('trips', newTripData);
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Failed to save trip', error);
            alert('Error al guardar: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    return (
        <div className="space-y-6">
            {!isEditMode && (
                <div className="p-4 border-b bg-slate-50 rounded-t-lg">
                    <Select label="Tipo de Proceso" value={processType} onChange={handleProcessTypeChange}>
                        <option value="TRIP">Declaración de Mercancías (Viaje Estándar)</option>
                        <option value="DMTI">DMTI (Viaje con DMTI)</option>
                    </Select>
                </div>
            )}
            
            <fieldset disabled={isReadOnly} className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold border-b pb-2 mb-4">Información General del Viaje</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Select label="Cliente" name="clientName" value={formData.clientName || ''} onChange={handleChange} required>
                            <option value="" disabled>Seleccione un cliente</option>
                            {clients.filter(c => !c.isDeleted).map(client => (
                                <option key={client.id} value={client.razonSocial}>{client.razonSocial}</option>
                            ))}
                        </Select>
                        <Select label="Estado" name="status" value={formData.status} onChange={handleChange} required>
                            {Object.values(TripStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        <Input label="Bill of Landing (BL)" name="billOfLading" value={formData.billOfLading || ''} onChange={handleChange} required />
                        <Input label="Origen" name="origin" value={formData.origin || ''} onChange={handleChange} required />
                        <Input label="Destino" name="destination" value={formData.destination || ''} onChange={handleChange} required />
                        <Input label="Naviera" name="shippingLine" value={formData.shippingLine || ''} onChange={handleChange} />
                        <Input label="Peso (Kg)" type="number" name="weightKg" value={formData.weightKg || ''} onChange={handleChange} />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold border-b pb-2 mb-4">Información de Carga</h3>
                    <Select label="Tipo de Carga" name="cargoType" value={formData.cargoType} onChange={handleChange} disabled={!isEditMode && processType === 'DMTI'}>
                        {Object.values(CargoType).map(ct => <option key={ct} value={ct}>{ct}</option>)}
                    </Select>

                    <div className="mt-4 space-y-4">
                        {formData.assignments?.map((assignment, index) => {
                            const selectedDriverForAssignment = drivers.find(d => d.id === assignment.driverId);
                            const recommendedTruckPlate = selectedDriverForAssignment?.truckPlate;

                            return (
                                <div key={assignment.id} className="p-4 border rounded-lg bg-slate-50 relative">
                                    {!isReadOnly && (formData.assignments?.length ?? 0) > 0 && (
                                        <button type="button" onClick={() => handleRemoveAssignment(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 disabled:text-slate-400 disabled:cursor-not-allowed" title="Eliminar asignación" disabled={isReadOnly}>
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                    <h4 className="font-semibold text-md mb-3">
                                        {formData.cargoType === CargoType.CONTAINER ? `Contenedor #${index + 1}` : `Carga Suelta #${index + 1}`}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {formData.cargoType === CargoType.CONTAINER ? (
                                            <Input label="Nº Contenedor" name="containerNumber" value={assignment.containerNumber} onChange={e => handleAssignmentChange(index, 'containerNumber', e.target.value)} required />
                                        ) : (
                                            <Input label="Tipo de Mercancía" name="merchandiseType" value={assignment.merchandiseType || ''} onChange={e => handleAssignmentChange(index, 'merchandiseType', e.target.value)} required />
                                        )}
                                        
                                        <Select label="Motorista" name="driverId" value={assignment.driverId} onChange={e => handleAssignmentChange(index, 'driverId', e.target.value)} required>
                                            <option value="" disabled>Seleccionar</option>
                                            {drivers.filter(d => !d.isDeleted).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </Select>
                                        <Select label="Cabezal" name="truckId" value={assignment.truckId} onChange={e => handleAssignmentChange(index, 'truckId', e.target.value)} required>
                                            <option value="" disabled>Seleccionar</option>
                                            {trucks
                                                .filter(t => !t.isDeleted && t.status === VehicleStatus.ACTIVE)
                                                .map(truck => {
                                                    const isRecommended = truck.plate === recommendedTruckPlate;
                                                    return (
                                                        <option key={truck.id} value={truck.id}>
                                                            {truck.plate}{isRecommended ? ' (recomendado)' : ''}
                                                        </option>
                                                    );
                                            })}
                                        </Select>
                                        <Select label="Remolque" name="trailerId" value={assignment.trailerId} onChange={e => handleAssignmentChange(index, 'trailerId', e.target.value)} required>
                                            <option value="" disabled>Seleccionar</option>
                                            {trailers.filter(t => !t.isDeleted).map(v => {
                                                const info = trailerInfo.get(v.id);
                                                const isUsedByAnotherTrip = info?.status === 'En uso' && info?.tripServiceOrder !== trip?.serviceOrder;

                                                return (
                                                    <option 
                                                        key={v.id} 
                                                        value={v.id}
                                                        disabled={isUsedByAnotherTrip}
                                                        style={isUsedByAnotherTrip ? { color: 'red' } : {}}
                                                    >
                                                        {v.plate} ({v.trailerType}{v.trailerSize ? ` ${v.trailerSize}` : ''})
                                                        {isUsedByAnotherTrip ? ` - No elegible, en uso por ${info.driverName}` : ''}
                                                    </option>
                                                );
                                            })}
                                        </Select>
                                        <Input label="Costo Flete (USD)" type="number" name="cost" value={assignment.cost} onChange={e => handleAssignmentChange(index, 'cost', e.target.value)} required />
                                    </div>
                                    {processType === 'DMTI' && !isEditMode && (
                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                            <h5 className="text-md font-semibold mb-2 text-blue-700">Información de DMTI para este Contenedor</h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-md bg-blue-50">
                                                <Input
                                                    label="Fecha de Registro DMTI"
                                                    name="registrationDate"
                                                    type="date"
                                                    value={assignment.dmti?.registrationDate || ''}
                                                    onChange={e => handleAssignmentDmtiChange(index, 'registrationDate', e.target.value)}
                                                    required
                                                />
                                                <Input
                                                    label="Aduana de Inicio"
                                                    name="startingCustoms"
                                                    placeholder="Ej: SVPS01"
                                                    value={assignment.dmti?.startingCustoms || ''}
                                                    onChange={e => handleAssignmentDmtiChange(index, 'startingCustoms', e.target.value)}
                                                    required
                                                />
                                                <Select
                                                    label="Usuario"
                                                    name="user"
                                                    value={assignment.dmti?.user || DMTIUser.TRANSPORTE}
                                                    onChange={e => handleAssignmentDmtiChange(index, 'user', e.target.value)}
                                                >
                                                    {Object.values(DMTIUser).map(u => <option key={u} value={u}>{u}</option>)}
                                                </Select>
                                            </div>
                                        </div>
                                    )}
                                    <AssignmentEventManager
                                        events={assignment.events || []}
                                        drivers={drivers}
                                        onUpdateEvents={(newEvents) => handleAssignmentEventsChange(index, newEvents)}
                                        disabled={isReadOnly}
                                    />
                                </div>
                            )
                        })}
                        {!isReadOnly && (
                             <Button variant="secondary" onClick={handleAddAssignment} className="w-full">
                                <PlusIcon className="w-5 h-5 mr-1 inline" /> 
                                {formData.cargoType === CargoType.CONTAINER ? 'Agregar Contenedor' : 'Agregar Carga Suelta'}
                            </Button>
                        )}
                    </div>
                </div>
            </fieldset>

            <div className="flex justify-end space-x-2 mt-6 border-t pt-4">
                 {isReadOnly && !isCompleted ? (
                    <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                ) : isCompleted ? (
                    <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                ) : (
                    <>
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSubmit}>Guardar Viaje</Button>
                    </>
                )}
            </div>
        </div>
    );
};


const TripManager: React.FC = () => {
    const { trips, drivers, trucks, trailers, reloadData, clients } = useData();
    const { user } = useAuth();
    const { canCreate, canEdit, canDelete } = usePermissions('/trips');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<Trip | undefined>(undefined);
    const [showDeleted, setShowDeleted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const trailerInfo = useMemo(() => {
        const info = new Map<string, { status: string; driverName: string | null; tripServiceOrder: string | null; }>();
        
        trailers.forEach(trailer => {
            info.set(trailer.id, { status: 'Disponible', driverName: null, tripServiceOrder: null });
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
                        info.set(assignment.trailerId, {
                            status: 'En uso',
                            driverName: driver?.name || 'N/A',
                            tripServiceOrder: trip.serviceOrder
                        });
                    }
                }
            });
        });

        return info;
    }, [trips, trailers, drivers]);

    const demurrageAlerts = useMemo(() => {
        const alerts = new Set<string>(); // Set of trip IDs
        const now = new Date().getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        trips.forEach(trip => {
            if (trip.status !== TripStatus.IN_PROGRESS || trip.isDeleted) return;

            trip.assignments.forEach(assignment => {
                const arrivalEvent = assignment.events.find(e => e.type === TripEventType.ARRIVAL_DESTINATION);
                const stayStartEvent = assignment.events.find(e => e.type === TripEventType.STAY_START);

                if (arrivalEvent && !stayStartEvent) {
                    const arrivalTime = new Date(arrivalEvent.timestamp).getTime();
                    if (now > arrivalTime + twentyFourHours) {
                        alerts.add(trip.id);
                    }
                }
            });
        });
        return alerts;
    }, [trips]);


    const openFormModal = (trip?: Trip) => {
        setSelectedTrip(trip);
        setIsFormModalOpen(true);
    };

    const closeFormModal = () => {
        setSelectedTrip(undefined);
        setIsFormModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (!canDelete) {
            alert("No tiene permiso para borrar viajes.");
            return;
        }
        if (window.confirm('¿Estás seguro de que quieres borrar este viaje?')) {
            await api.deleteResource('trips', id);
            reloadData();
        }
    };
    
    const handleRecover = async (id: string) => {
        await api.recoverResource('trips', id);
        reloadData();
    };
    
    const filteredTrips = useMemo(() => {
        const baseTrips = trips
          .filter(t => (user?.role === UserRole.ADMIN && showDeleted) ? t.isDeleted : !t.isDeleted)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (!searchTerm) {
            return baseTrips;
        }

        return baseTrips.filter(trip => {
            const lowerSearch = searchTerm.toLowerCase();
            const containerMatch = trip.assignments.some(a => a.containerNumber.toLowerCase().includes(lowerSearch));
            const merchandiseMatch = trip.assignments.some(a => a.merchandiseType?.toLowerCase().includes(lowerSearch));
            return (
                trip.serviceOrder.toLowerCase().includes(lowerSearch) ||
                trip.clientName.toLowerCase().includes(lowerSearch) ||
                trip.billOfLading.toLowerCase().includes(lowerSearch) ||
                containerMatch ||
                merchandiseMatch
            );
        });
    }, [trips, showDeleted, user, searchTerm]);

    return (
        <Card>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                <h1 className="text-2xl font-bold">Gestión de Viajes</h1>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                 <Input 
                    label="" 
                    id="search-trip" 
                    placeholder="Buscar por OS, cliente, BL..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="order-2 md:order-1"
                 />
                 <div className="flex items-center gap-2 order-1 md:order-2">
                    {user?.role === UserRole.ADMIN && (
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={showDeleted} onChange={() => setShowDeleted(!showDeleted)} className="form-checkbox h-5 w-5 text-blue-600 rounded" />
                            <span className="text-sm text-slate-600">Mostrar borrados</span>
                        </label>
                    )}
                    <Button onClick={() => openFormModal()} className="flex-grow" disabled={!canCreate}><PlusIcon className="w-5 h-5 mr-1 inline"/> Nuevo Viaje</Button>
                 </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Orden de trabajo</th>
                            <th scope="col" className="px-6 py-3">Cliente</th>
                            <th scope="col" className="px-6 py-3">BL</th>
                            <th scope="col" className="px-6 py-3">Motorista</th>
                            <th scope="col" className="px-6 py-3">Cabezal</th>
                            <th scope="col" className="px-6 py-3">Remolque</th>
                            <th scope="col" className="px-6 py-3 text-center">Asignaciones</th>
                            <th scope="col" className="px-6 py-3">Estado</th>
                            <th scope="col" className="px-6 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTrips.map(trip => {
                            const isMultiAssignment = trip.assignments.length > 1;
                            const isCompleted = trip.status === TripStatus.COMPLETED;
                            const firstAssignment = trip.assignments[0];
                            const driverName = isMultiAssignment ? 'Varios' : (firstAssignment ? drivers.find(d => d.id === firstAssignment.driverId)?.name : 'N/A');
                            const truckPlate = isMultiAssignment ? 'Varios' : (firstAssignment ? trucks.find(t => t.id === firstAssignment.truckId)?.plate : 'N/A');
                            const trailerPlate = isMultiAssignment ? 'Varios' : (firstAssignment ? trailers.find(t => t.id === firstAssignment.trailerId)?.plate : 'N/A');
                            const needsAlert = demurrageAlerts.has(trip.id);

                            return (
                                <tr 
                                    key={trip.id} 
                                    onClick={() => !trip.isDeleted && openFormModal(trip)}
                                    className={`border-b transition-colors ${
                                        trip.isDeleted ? 'bg-red-50 opacity-60' : 
                                        isCompleted ? 'bg-green-50' : `bg-white ${canEdit ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}`
                                    }`}
                                >
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{trip.serviceOrder}</th>
                                    <td className="px-6 py-4">{trip.clientName}</td>
                                    <td className="px-6 py-4">{trip.billOfLading}</td>
                                    <td className="px-6 py-4">{driverName}</td>
                                    <td className="px-6 py-4">{truckPlate}</td>
                                    <td className="px-6 py-4">{trailerPlate}</td>
                                    <td className="px-6 py-4 text-center">{trip.assignments.length}</td>
                                    <td className="px-6 py-4">
                                        {trip.status}
                                        {needsAlert && <div className="text-xs font-bold text-red-600 animate-pulse mt-1">Inserte Inicio de Estadías</div>}
                                    </td>
                                    <td className="px-6 py-4 flex space-x-2">
                                        {trip.isDeleted ? (
                                            user?.role === UserRole.ADMIN && <Button variant="ghost" onClick={(e) => { e.stopPropagation(); handleRecover(trip.id); }} title="Recuperar"><RestoreIcon className="w-5 h-5 text-green-600"/></Button>
                                        ) : (
                                            <>
                                                <Button variant="ghost" onClick={(e) => { e.stopPropagation(); openFormModal(trip); }} title="Editar / Ver" disabled={!canEdit && !isCompleted}><EditIcon className={`w-5 h-5 ${!canEdit || isCompleted ? 'text-slate-400' : 'text-blue-600'}`}/></Button>
                                                <Button variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(trip.id); }} title="Borrar" disabled={!canDelete || isCompleted}><TrashIcon className={`w-5 h-5 ${!canDelete || isCompleted ? 'text-slate-400' : 'text-red-600'}`}/></Button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isFormModalOpen} onClose={closeFormModal} title={selectedTrip ? `${canEdit ? 'Detalles / Editar' : 'Ver'} Viaje - ${selectedTrip.serviceOrder}` : 'Nuevo Viaje'}>
                <TripForm trip={selectedTrip} onClose={closeFormModal} onSave={() => reloadData()} trailerInfo={trailerInfo} />
            </Modal>
        </Card>
    );
};

export default TripManager;