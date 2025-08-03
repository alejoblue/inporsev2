import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { Trip, TripStatus, TripEventType } from '../types';
import { Card, Button, Input, Modal } from './ui/Common';
import { PrintIcon } from './ui/Icons';

interface ProfitabilityData {
    trip: Trip;
    totalRevenue: number;
    totalCost: number;
    profit: number;
    margin: number;
    revenueDetails: { label: string; amount: number }[];
    costDetails: { label: string; amount: number }[];
}

const ProfitabilityReport: React.FC = () => {
    const { trips } = useData();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedReportItem, setSelectedReportItem] = useState<ProfitabilityData | null>(null);

    const profitabilityData = useMemo<ProfitabilityData[]>(() => {
        const completedTrips = trips.filter(t => t.status === TripStatus.COMPLETED && !t.isDeleted);
        
        let filteredByDate = completedTrips;
        if (startDate) {
            const start = new Date(startDate).getTime();
            filteredByDate = filteredByDate.filter(t => new Date(t.updatedAt).getTime() >= start);
        }
        if (endDate) {
            const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000 - 1); // include the whole day
            filteredByDate = filteredByDate.filter(t => new Date(t.updatedAt).getTime() <= end);
        }

        return filteredByDate.map(trip => {
            // Revenue Calculation
            const revenueDetails: { label: string; amount: number }[] = [];
            let totalRevenue = 0;
            trip.assignments.forEach((a, i) => {
                const detail = trip.cargoType === 'Contenedores' ? a.containerNumber : a.merchandiseType;
                revenueDetails.push({ label: `Flete (${detail || `Asig. ${i+1}`})`, amount: a.cost });
                totalRevenue += a.cost;
                if (a.dmtiCost) {
                    revenueDetails.push({ label: `Servicio DMTI (${a.containerNumber})`, amount: a.dmtiCost });
                    totalRevenue += a.dmtiCost;
                }
            });
            if (trip.unhookCost) {
                revenueDetails.push({ label: 'Cargos por Desenganche', amount: trip.unhookCost });
                totalRevenue += trip.unhookCost;
            }
            if (trip.demurrage) {
                revenueDetails.push({ label: 'Cargos por Estadía', amount: trip.demurrage });
                totalRevenue += trip.demurrage;
            }

            // Cost Calculation
            const costDetails: { label: string; amount: number }[] = [];
            let totalCost = 0;
            trip.assignments.forEach((a, i) => {
                // Driver payment for the assignment
                costDetails.push({ label: `Pago Motorista Flete (${a.containerNumber || a.merchandiseType || `Asig. ${i+1}`})`, amount: a.cost });
                totalCost += a.cost;
                
                // Costs from events
                a.events.forEach(e => {
                    if (e.type === TripEventType.MOVEMENT && e.amount) {
                        costDetails.push({ label: `Movimiento/Viático (${e.notes || 'N/A'})`, amount: e.amount });
                        totalCost += e.amount;
                    }
                    if (e.type === TripEventType.REPOSTAJE && e.galonaje && e.precioGalon) {
                        const fuelCost = e.galonaje * e.precioGalon;
                        costDetails.push({ label: `Repostaje (${e.numeroDocumento})`, amount: fuelCost });
                        totalCost += fuelCost;
                    }
                });
            });

            const profit = totalRevenue - totalCost;
            const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

            return {
                trip,
                totalRevenue,
                totalCost,
                profit,
                margin,
                revenueDetails,
                costDetails
            };
        }).sort((a,b) => new Date(b.trip.updatedAt).getTime() - new Date(a.trip.updatedAt).getTime());

    }, [trips, startDate, endDate]);
    
    const openModal = (item: ProfitabilityData) => {
        setSelectedReportItem(item);
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    return (
        <Card>
            <div className="flex justify-between items-start mb-6 no-print">
                <div>
                    <h1 className="text-2xl font-bold">Reporte de Rentabilidad</h1>
                    <p className="text-sm text-slate-600 mt-1">
                        Analice los ingresos, costos y ganancias de cada orden de trabajo completada.
                    </p>
                </div>
                 <div className="flex flex-wrap justify-end items-end gap-2">
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
                     <Button onClick={() => window.print()} variant="secondary">
                        <PrintIcon className="w-5 h-5 mr-2" />
                        Imprimir Reporte
                    </Button>
                </div>
            </div>

             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Orden de Trabajo</th>
                            <th scope="col" className="px-6 py-3">Cliente</th>
                            <th scope="col" className="px-6 py-3">Fecha Fin</th>
                            <th scope="col" className="px-6 py-3 text-right">Ingresos</th>
                            <th scope="col" className="px-6 py-3 text-right">Costos</th>
                            <th scope="col" className="px-6 py-3 text-right">Ganancia</th>
                            <th scope="col" className="px-6 py-3 text-right">Margen</th>
                            <th scope="col" className="px-6 py-3 text-center no-print">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {profitabilityData.map(item => (
                            <tr key={item.trip.id} className="bg-white border-b hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{item.trip.serviceOrder}</td>
                                <td className="px-6 py-4">{item.trip.clientName}</td>
                                <td className="px-6 py-4">{new Date(item.trip.updatedAt).toLocaleDateString('es-ES')}</td>
                                <td className="px-6 py-4 text-right font-mono text-green-700">${item.totalRevenue.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right font-mono text-red-700">${item.totalCost.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right font-mono font-bold">${item.profit.toFixed(2)}</td>
                                <td className={`px-6 py-4 text-right font-semibold ${item.margin >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{item.margin.toFixed(1)}%</td>
                                <td className="px-6 py-4 text-center no-print">
                                    <Button size="sm" variant="ghost" onClick={() => openModal(item)}>Ver Desglose</Button>
                                </td>
                            </tr>
                        ))}
                         {profitabilityData.length === 0 && (
                            <tr><td colSpan={8} className="text-center py-8 text-slate-500">No hay datos para los filtros seleccionados.</td></tr>
                        )}
                    </tbody>
                </table>
             </div>
             {selectedReportItem && (
                 <Modal isOpen={isModalOpen} onClose={closeModal} title={`Desglose de Rentabilidad - ${selectedReportItem.trip.serviceOrder}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold text-green-700 mb-2">Ingresos</h3>
                            <ul className="space-y-1 text-sm bg-green-50 p-3 rounded-md">
                                {selectedReportItem.revenueDetails.map((d, i) => (
                                    <li key={i} className="flex justify-between border-b border-green-200 py-1">
                                        <span>{d.label}</span>
                                        <span className="font-mono">${d.amount.toFixed(2)}</span>
                                    </li>
                                ))}
                                <li className="flex justify-between font-bold pt-2">
                                    <span>Total Ingresos:</span>
                                    <span className="font-mono">${selectedReportItem.totalRevenue.toFixed(2)}</span>
                                </li>
                            </ul>
                        </div>
                         <div>
                            <h3 className="text-lg font-semibold text-red-700 mb-2">Costos</h3>
                             <ul className="space-y-1 text-sm bg-red-50 p-3 rounded-md">
                                {selectedReportItem.costDetails.map((d, i) => (
                                    <li key={i} className="flex justify-between border-b border-red-200 py-1">
                                        <span>{d.label}</span>
                                        <span className="font-mono">${d.amount.toFixed(2)}</span>
                                    </li>
                                ))}
                                <li className="flex justify-between font-bold pt-2">
                                    <span>Total Costos:</span>
                                    <span className="font-mono">${selectedReportItem.totalCost.toFixed(2)}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 pt-4 border-t text-right">
                        <span className="text-xl font-bold">Ganancia Total: </span>
                        <span className={`text-2xl font-bold font-mono ${selectedReportItem.profit >= 0 ? 'text-slate-800' : 'text-red-700'}`}>
                            ${selectedReportItem.profit.toFixed(2)}
                        </span>
                        <span className="text-lg font-semibold text-slate-600 ml-4">
                            (Margen: {selectedReportItem.margin.toFixed(1)}%)
                        </span>
                    </div>
                 </Modal>
             )}
        </Card>
    );
};

export default ProfitabilityReport;