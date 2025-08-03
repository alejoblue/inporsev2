import React, { useMemo, useState } from 'react';
import { useData } from '../hooks/useData';
import { TripStatus, Trip, Driver, TripEventType, TripEvent, TripAssignment, CargoType } from '../types';
import { Card, Select, Modal, Button, Input } from './ui/Common';
import { PrintIcon } from './ui/Icons';

interface DriverMovement extends TripEvent {
    tripServiceOrder: string;
}

interface DriverDetails {
    driver: Driver;
    completedAssignments: (TripAssignment & { trip: Trip })[];
    movements: DriverMovement[];
}

const ReportManager: React.FC = () => {
    const { trips, drivers } = useData();
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [viewingDriverDetails, setViewingDriverDetails] = useState<DriverDetails | null>(null);

    const driverPaymentReport = useMemo(() => {
        const report: { [driverId: string]: { driverId: string; name: string; tripCount: number; totalPayment: number; tripIds: Set<string> } } = {};
        const driverNameMap = new Map(drivers.map(d => [d.name.trim().toLowerCase(), d.id]));

        drivers.forEach(driver => {
            if (!driver.isDeleted) {
                report[driver.id] = {
                    driverId: driver.id,
                    name: driver.name,
                    tripCount: 0,
                    totalPayment: 0,
                    tripIds: new Set(),
                };
            }
        });

        trips.forEach(trip => {
            if (trip.isDeleted) return;

            // Contabilizar costo de asignaciones completadas
            if (trip.status === TripStatus.COMPLETED) {
                const completionDate = new Date(trip.updatedAt);
                // The date from input is like 'YYYY-MM-DD'. new Date() parses this as UTC midnight.
                // We compare this with the trip's update timestamp.
                const startDateObj = startDate ? new Date(startDate) : null;
                const endDateObj = endDate ? new Date(endDate) : null;

                if(startDateObj) startDateObj.setUTCHours(0, 0, 0, 0);
                if(endDateObj) endDateObj.setUTCHours(23, 59, 59, 999);

                const isAfterStart = !startDateObj || completionDate >= startDateObj;
                const isBeforeEnd = !endDateObj || completionDate <= endDateObj;

                if (isAfterStart && isBeforeEnd) {
                    trip.assignments.forEach(assignment => {
                        if (report[assignment.driverId]) {
                            report[assignment.driverId].totalPayment += assignment.cost || 0;
                            report[assignment.driverId].tripIds.add(trip.id);
                        }
                    });
                }
            }

            // Contabilizar eventos de movimiento
            trip.assignments.forEach(assignment => {
                assignment.events?.forEach(event => {
                    if (event.type === TripEventType.MOVEMENT && event.amount) {
                        let targetDriverId: string | undefined = undefined;
                        if (event.assignedDriverId && report[event.assignedDriverId]) {
                            targetDriverId = event.assignedDriverId;
                        } 
                        else if (event.notes) {
                            const driverIdFromName = driverNameMap.get(event.notes.trim().toLowerCase());
                            if (driverIdFromName && report[driverIdFromName]) targetDriverId = driverIdFromName;
                        }
                        
                        if (targetDriverId) {
                             report[targetDriverId].totalPayment += event.amount;
                        } else if (report[assignment.driverId]) { // Fallback to assignment driver if no other is specified
                           report[assignment.driverId].totalPayment += event.amount;
                        }
                    }
                });
            });
        });
        
        let filteredReport = Object.values(report).map(r => ({ ...r, tripCount: r.tripIds.size }));

        if (selectedDriverId) {
            filteredReport = filteredReport.filter(r => r.driverId === selectedDriverId);
        }

        return filteredReport
            .filter(r => r.tripCount > 0 || r.totalPayment > 0)
            .sort((a, b) => b.totalPayment - a.totalPayment);

    }, [trips, drivers, selectedDriverId, startDate, endDate]);

    const handleViewDetails = (driverId: string) => {
        const driver = drivers.find(d => d.id === driverId);
        if (!driver) return;

        const driverNameMap = new Map(drivers.map(d => [d.name.trim().toLowerCase(), d.id]));

        const completedAssignments: (TripAssignment & { trip: Trip })[] = [];
        trips.forEach(trip => {
            if (trip.status === TripStatus.COMPLETED && !trip.isDeleted) {
                const completionDate = new Date(trip.updatedAt);
                const startDateObj = startDate ? new Date(startDate) : null;
                const endDateObj = endDate ? new Date(endDate) : null;

                if (startDateObj) startDateObj.setUTCHours(0, 0, 0, 0);
                if (endDateObj) endDateObj.setUTCHours(23, 59, 59, 999);

                const isAfterStart = !startDateObj || completionDate >= startDateObj;
                const isBeforeEnd = !endDateObj || completionDate <= endDateObj;

                if(isAfterStart && isBeforeEnd) {
                    trip.assignments.forEach(assignment => {
                        if (assignment.driverId === driverId) {
                            completedAssignments.push({ ...assignment, trip });
                        }
                    });
                }
            }
        });

        const driverMovements: DriverMovement[] = [];
        trips.forEach(trip => {
            if (trip.isDeleted) return;
            trip.assignments.forEach(assignment => {
                assignment.events?.forEach(event => {
                    if (event.type === TripEventType.MOVEMENT && event.amount) {
                        let movementBelongsToThisDriver = false;
                        if (event.assignedDriverId === driverId) {
                            movementBelongsToThisDriver = true;
                        } else if (!event.assignedDriverId && event.notes) {
                            const noteDriverId = driverNameMap.get(event.notes.trim().toLowerCase());
                            if (noteDriverId === driverId) movementBelongsToThisDriver = true;
                        } else if (!event.assignedDriverId && !event.notes && assignment.driverId === driverId) {
                             movementBelongsToThisDriver = true;
                        }
                        
                        if (movementBelongsToThisDriver) {
                            driverMovements.push({ ...event, tripServiceOrder: trip.serviceOrder });
                        }
                    }
                });
            });
        });
        driverMovements.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setViewingDriverDetails({ driver, completedAssignments, movements: driverMovements });
    };

    const closeModal = () => setViewingDriverDetails(null);

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-6 no-print">Pago a Motoristas</h1>
            <Card title="Reporte de Pago a Motoristas">
                <div className="flex flex-wrap justify-end items-end gap-4 mb-4 no-print">
                    <Input 
                        label="Fecha de Inicio"
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                    <Input 
                        label="Fecha de Fin"
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                    <div className="w-full sm:w-64">
                        <Select label="Filtrar por Motorista" id="driver-filter" value={selectedDriverId} onChange={(e) => setSelectedDriverId(e.target.value)}>
                            <option value="">Todos los motoristas</option>
                            {drivers.filter(d => !d.isDeleted).map(driver => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                        </Select>
                    </div>
                     <Button onClick={() => window.print()} variant="secondary">
                        <PrintIcon className="w-5 h-5 mr-2" />
                        Imprimir Reporte
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Motorista</th>
                                <th scope="col" className="px-6 py-3 text-center">Viajes Completados</th>
                                <th scope="col" className="px-6 py-3 text-right">Total a Pagar (USD)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {driverPaymentReport.length > 0 ? driverPaymentReport.map(data => (
                                <tr key={data.driverId} className="bg-white border-b">
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                                        <button onClick={() => handleViewDetails(data.driverId)} className="text-blue-600 hover:underline focus:outline-none font-medium no-print">{data.name}</button>
                                        <span className="hidden print:inline">{data.name}</span>
                                    </th>
                                    <td className="px-6 py-4 text-center">{data.tripCount}</td>
                                    <td className="px-6 py-4 text-right font-mono">${data.totalPayment.toFixed(2)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={3} className="px-6 py-4 text-center text-slate-500">No hay datos para mostrar con los filtros seleccionados.</td></tr>
                            )}
                        </tbody>
                        {driverPaymentReport.length > 0 && (
                            <tfoot className="font-semibold text-slate-900">
                                <tr>
                                    <td className="px-6 py-3 text-right" colSpan={2}>Total General</td>
                                    <td className="px-6 py-3 text-right font-mono">${driverPaymentReport.reduce((acc, curr) => acc + curr.totalPayment, 0).toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </Card>

            {viewingDriverDetails && (
                <Modal isOpen={true} onClose={closeModal} title={`Detalles de Pago para ${viewingDriverDetails.driver.name}`}>
                    <div className="overflow-y-auto max-h-[70vh] space-y-6">
                        <div className="flex justify-end no-print">
                            <Button onClick={() => window.print()} variant="secondary" size="sm">
                                <PrintIcon className="w-5 h-5 mr-1"/>
                                Imprimir Detalles
                            </Button>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Asignaciones Completadas</h3>
                             {viewingDriverDetails.completedAssignments.length > 0 ? (
                                <table className="w-full text-sm text-left text-slate-500">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-4 py-3">OS</th>
                                            <th scope="col" className="px-4 py-3">Detalle Carga</th>
                                            <th scope="col" className="px-4 py-3">Fecha</th>
                                            <th scope="col" className="px-4 py-3 text-right">Costo (USD)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewingDriverDetails.completedAssignments.map(a => (
                                            <tr key={a.id} className="bg-white border-b">
                                                <td className="px-4 py-2 font-medium">{a.trip.serviceOrder}</td>
                                                <td className="px-4 py-2">{a.trip.cargoType === CargoType.CONTAINER ? a.containerNumber : a.merchandiseType}</td>
                                                <td className="px-4 py-2">{new Date(a.trip.updatedAt).toLocaleDateString('es-ES')}</td>
                                                <td className="px-4 py-2 text-right font-mono">${a.cost.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-50 font-bold">
                                            <td colSpan={3} className="px-4 py-2 text-right">Subtotal Asignaciones:</td>
                                            <td className="px-4 py-2 text-right font-mono">${viewingDriverDetails.completedAssignments.reduce((acc, a) => acc + a.cost, 0).toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                             ) : <p className="text-sm text-slate-500 px-4">No hay asignaciones completadas en el rango de fechas seleccionado.</p>}
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Movimientos Adicionales</h3>
                            {viewingDriverDetails.movements.length > 0 ? (
                                <table className="w-full text-sm text-left text-slate-500">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-4 py-3">Fecha</th>
                                            <th scope="col" className="px-4 py-3">OS Asociada</th>
                                            <th scope="col" className="px-4 py-3">Notas</th>
                                            <th scope="col" className="px-4 py-3 text-right">Monto (USD)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewingDriverDetails.movements.map((m, i) => (
                                            <tr key={i} className="bg-white border-b">
                                                <td className="px-4 py-2">{new Date(m.timestamp).toLocaleDateString('es-ES')}</td>
                                                <td className="px-4 py-2">{m.tripServiceOrder}</td>
                                                <td className="px-4 py-2">{m.notes}</td>
                                                <td className="px-4 py-2 text-right font-mono">${(m.amount || 0).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                         <tr className="bg-slate-50 font-bold">
                                            <td colSpan={3} className="px-4 py-2 text-right">Subtotal Movimientos:</td>
                                            <td className="px-4 py-2 text-right font-mono">${viewingDriverDetails.movements.reduce((acc, m) => acc + (m.amount || 0), 0).toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            ) : <p className="text-sm text-slate-500 px-4">No hay movimientos adicionales registrados.</p>}
                        </div>

                        <div className="pt-4 border-t text-right">
                            <span className="text-lg font-bold text-slate-900">Total General a Pagar: </span>
                            <span className="text-xl font-bold font-mono text-green-700">
                                ${(
                                    viewingDriverDetails.completedAssignments.reduce((acc, a) => acc + a.cost, 0) + 
                                    viewingDriverDetails.movements.reduce((acc, m) => acc + (m.amount || 0), 0)
                                ).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ReportManager;