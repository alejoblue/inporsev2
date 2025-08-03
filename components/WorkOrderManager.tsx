import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { usePermissions } from '../hooks/useAuth';
import { api } from '../services/api';
import { Card, Button } from './ui/Common';
import { Trip, TripStatus, InvoiceStatus, CargoType } from '../types';
import { PrintIcon } from './ui/Icons';

const groupWorkOrdersByClient = (trips: Trip[]): Record<string, Trip[]> => {
    const completedTrips = trips.filter(trip => trip.status === TripStatus.COMPLETED && !trip.isDeleted);
    
    const grouped = completedTrips.reduce((acc, trip) => {
        const clientName = trip.clientName || 'Cliente no especificado';
        if (!acc[clientName]) {
            acc[clientName] = [];
        }
        acc[clientName].push(trip);
        return acc;
    }, {} as Record<string, Trip[]>);

    // Sort trips within each client group by date
    for (const clientName in grouped) {
        grouped[clientName].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return grouped;
};

const WorkOrderManager: React.FC = () => {
    const { trips, reloadData } = useData();
    const { canEdit } = usePermissions('/work-orders');

    const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

    const workOrdersByClient = useMemo(() => groupWorkOrdersByClient(trips), [trips]);
    const sortedClients = useMemo(() => Object.keys(workOrdersByClient).sort(), [workOrdersByClient]);

    const toggleClient = (clientName: string) => {
        const newSet = new Set(expandedClients);
        if (newSet.has(clientName)) {
            newSet.delete(clientName);
        } else {
            newSet.add(clientName);
        }
        setExpandedClients(newSet);
    };

    const toggleOrder = (tripId: string) => {
        const newSet = new Set(expandedOrders);
        if (newSet.has(tripId)) {
            newSet.delete(tripId);
        } else {
            newSet.add(tripId);
        }
        setExpandedOrders(newSet);
    };

    const handleMarkAsInvoiced = async (tripId: string) => {
        if (!canEdit) {
            alert('No tiene permiso para modificar órdenes de trabajo.');
            return;
        }
        if (window.confirm('¿Marcar esta orden como facturada? Esta acción no se puede deshacer.')) {
            try {
                await api.updateResource<Trip>('trips', tripId, { invoiceStatus: InvoiceStatus.INVOICED });
                reloadData();
            } catch (error) {
                console.error('Failed to mark as invoiced', error);
                alert('Error al actualizar el estado.');
            }
        }
    };

    const handlePrintOrder = (orderId: string) => {
        // Ensure the details are expanded to be part of the DOM for printing
        if (!expandedOrders.has(orderId)) {
            toggleOrder(orderId);
        }

        const body = document.body;
        const printElement = document.getElementById(`work-order-wrapper-${orderId}`);

        if (!printElement) return;

        // Use a timeout to ensure state update for expansion has rendered
        setTimeout(() => {
            body.classList.add('printing-active');
            printElement.classList.add('print-this');

            window.print();

            body.classList.remove('printing-active');
            printElement.classList.remove('print-this');
        }, 150);
    };

    return (
        <Card>
            <div className="flex justify-between items-start mb-6 no-print">
                <div>
                    <h1 className="text-2xl font-bold">Gestión de Ordenes de Trabajo</h1>
                    <p className="text-sm text-slate-600 mt-1">
                        Aquí se listan todos los viajes completados que están pendientes de facturación o ya han sido facturados.
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                {sortedClients.length === 0 && (
                    <p className="text-center text-slate-500 py-8">No hay órdenes de trabajo completadas para mostrar.</p>
                )}
                {sortedClients.map(clientName => {
                    const orders = workOrdersByClient[clientName];
                    const activeOrders = orders.filter(o => (o.invoiceStatus ?? InvoiceStatus.ACTIVE) === InvoiceStatus.ACTIVE).length;
                    const invoicedOrders = orders.length - activeOrders;
                    const isClientExpanded = expandedClients.has(clientName);

                    return (
                        <div key={clientName} className="border border-slate-200 rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleClient(clientName)}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors no-print"
                                aria-expanded={isClientExpanded}
                            >
                                <div className="text-left">
                                    <h2 className="font-bold text-lg text-slate-800">{clientName}</h2>
                                    <div className="text-sm text-slate-500">
                                        <span className="text-orange-600 font-semibold">{activeOrders} Activa(s)</span> / <span className="text-green-600">{invoicedOrders} Facturada(s)</span>
                                    </div>
                                </div>
                                <span className="text-2xl text-slate-500 transform transition-transform" style={{ transform: isClientExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                            </button>

                            {isClientExpanded && (
                                <div className="bg-white">
                                    {orders.map(order => {
                                        const isOrderExpanded = expandedOrders.has(order.id);
                                        const totalCost = order.assignments.reduce((sum, a) => sum + a.cost + (a.dmtiCost || 0), 0) + (order.demurrage || 0) + (order.unhookCost || 0);
                                        const invoiceStatus = order.invoiceStatus ?? InvoiceStatus.ACTIVE;
                                        const isBilled = invoiceStatus === InvoiceStatus.INVOICED;

                                        return (
                                            <div key={order.id} id={`work-order-wrapper-${order.id}`}>
                                                <div className="border-t border-slate-200">
                                                    <div className="flex items-center justify-between p-3 gap-4 hover:bg-slate-50">
                                                        <div className="flex-1 cursor-pointer" onClick={() => toggleOrder(order.id)}>
                                                            <p className="font-semibold text-slate-700">{order.serviceOrder} <span className="font-normal text-slate-500">(BL: {order.billOfLading})</span></p>
                                                            <p className="text-sm text-slate-600">Completado: {new Date(order.updatedAt).toLocaleDateString('es-ES')}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 no-print">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="p-1"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handlePrintOrder(order.id);
                                                                }}
                                                                title="Imprimir Orden"
                                                            >
                                                                <PrintIcon className="w-5 h-5 text-slate-500 hover:text-slate-700" />
                                                            </Button>
                                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                                isBilled ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                                            }`}>
                                                                {invoiceStatus}
                                                            </span>
                                                            <Button 
                                                                variant="secondary" 
                                                                size="sm"
                                                                onClick={(e) => { e.stopPropagation(); handleMarkAsInvoiced(order.id); }}
                                                                disabled={!canEdit || isBilled}
                                                            >
                                                                {isBilled ? 'Facturada' : 'Facturar'}
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {isOrderExpanded && (
                                                        <div className="p-4 bg-slate-100 border-t border-dashed">
                                                            <h4 className="font-semibold mb-2">Desglose de Costos</h4>
                                                            <ul className="space-y-1 text-sm">
                                                                {order.assignments.map(assignment => (
                                                                    <React.Fragment key={assignment.id}>
                                                                        <li className="flex justify-between items-start bg-white p-2 rounded-md">
                                                                            <div>
                                                                                <p className="text-slate-800">{`FLETE TERRESTRE ${order.origin} – ${order.destination}`}</p>
                                                                                <p className="text-xs text-slate-500 pl-2">
                                                                                    {order.cargoType === CargoType.CONTAINER 
                                                                                        ? `Cont. ${assignment.containerNumber}` 
                                                                                        : `${assignment.merchandiseType}`}
                                                                                </p>
                                                                            </div>
                                                                            <span className="font-mono pl-2 flex-shrink-0">${assignment.cost.toFixed(2)}</span>
                                                                        </li>
                                                                        {(assignment.dmtiCost ?? 0) > 0 && (
                                                                            <li className="flex justify-between items-center bg-white p-2 rounded-md">
                                                                                <span>{`Servicio DMTI (${assignment.containerNumber})`}</span>
                                                                                <span className="font-mono">${(assignment.dmtiCost as number).toFixed(2)}</span>
                                                                            </li>
                                                                        )}
                                                                    </React.Fragment>
                                                                ))}
                                                                {(order.unhookCost || 0) > 0 && (
                                                                    <li className="flex justify-between items-center bg-white p-2 rounded-md text-indigo-800">
                                                                        <span className="font-semibold">Cargos por Desenganche</span>
                                                                        <span className="font-mono font-semibold">${(order.unhookCost).toFixed(2)}</span>
                                                                    </li>
                                                                )}
                                                                {(order.demurrage || 0) > 0 && (
                                                                    <li className="flex justify-between items-center bg-white p-2 rounded-md text-amber-800">
                                                                        <span className="font-semibold">Cargos por Estadía</span>
                                                                        <span className="font-mono font-semibold">${(order.demurrage).toFixed(2)}</span>
                                                                    </li>
                                                                )}
                                                            </ul>
                                                            <div className="flex justify-end font-bold text-md mt-2 pt-2 border-t">
                                                                <span className="mr-4">Total:</span>
                                                                <span className="font-mono">${totalCost.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

export default WorkOrderManager;