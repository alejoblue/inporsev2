import React from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Card } from './ui/Common';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Trip, TripStatus, Driver, Vehicle, CargoType } from '../types';

const KpiCard: React.FC<{ title: string; value: string | number; description: string }> = ({ title, value, description }) => (
  <Card className="flex flex-col">
    <h4 className="text-sm font-medium text-slate-500">{title}</h4>
    <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
    <p className="text-xs text-slate-400 mt-1">{description}</p>
  </Card>
);

const ActiveTripCard: React.FC<{
    trip: Trip;
    drivers: Driver[];
    trucks: Vehicle[];
}> = ({ trip, drivers, trucks }) => {
    const firstAssignment = trip.assignments?.[0];
    const driver = firstAssignment ? drivers.find(d => d.id === firstAssignment.driverId) : undefined;
    const truck = firstAssignment ? trucks.find(v => v.id === firstAssignment.truckId) : undefined;

    return (
        <Card className="border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-lg text-slate-800">{trip.serviceOrder}</p>
                    <p className="text-sm text-slate-600">{trip.clientName} (BL: {trip.billOfLading})</p>
                </div>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{trip.status}</span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
                 {trip.cargoType === CargoType.LOOSE_CARGO ? (
                     <>
                        <p><span className="font-semibold">Tipo de Carga:</span> Carga Suelta ({trip.assignments.length})</p>
                        <p><span className="font-semibold">1ra Mercancía:</span> {firstAssignment?.merchandiseType || 'N/A'}</p>
                     </>
                 ) : (
                     <p><span className="font-semibold">Contenedores:</span> {trip.assignments.length}</p>
                 )}

                 {firstAssignment && (
                     <>
                        {trip.cargoType === CargoType.CONTAINER && <p><span className="font-semibold">1er Contenedor:</span> {firstAssignment.containerNumber}</p>}
                        <p><span className="font-semibold">Motorista:</span> {driver?.name || 'N/A'}</p>
                        <p><span className="font-semibold">Cabezal:</span> {truck?.plate || 'N/A'}</p>
                     </>
                 )}
            </div>
        </Card>
    );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { trips, drivers, trucks, trailers, loading } = useData();

  if (loading) {
    return <div>Cargando dashboard...</div>;
  }

  const now = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(now.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const weeklyTrips = trips.filter(t => new Date(t.createdAt) >= oneWeekAgo).length;
  const monthlyTrips = trips.filter(t => new Date(t.createdAt) >= startOfMonth).length;
  const yearlyTrips = trips.filter(t => new Date(t.createdAt) >= startOfYear).length;

  const activeTrips = trips.filter(t => t.status === TripStatus.IN_PROGRESS && !t.isDeleted);
  
  const toLocalYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return { 
        name: d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }), 
        date: toLocalYYYYMMDD(d),
        viajes: 0 
    };
  }).reverse();

  trips.forEach(trip => {
    const tripCreationDate = new Date(trip.createdAt);
    const tripDate = toLocalYYYYMMDD(tripCreationDate);
    const dayData = last7DaysData.find(d => d.date === tripDate);
    if(dayData) {
        dayData.viajes++;
    }
  });


  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Bienvenido, {user?.username}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KpiCard title="Viajes esta Semana" value={weeklyTrips} description="Total de los últimos 7 días" />
        <KpiCard title="Viajes este Mes" value={monthlyTrips} description={`Desde el 1ro de ${now.toLocaleDateString('es-ES', { month: 'long' })}`} />
        <KpiCard title="Viajes este Año" value={yearlyTrips} description={`Desde el 1ro de Enero, ${now.getFullYear()}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Viajes Activos">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activeTrips.length > 0 ? activeTrips.map(trip => (
                <ActiveTripCard key={trip.id} trip={trip} drivers={drivers} trucks={trucks} />
            )) : <p className="text-slate-500">No hay viajes en progreso actualmente.</p>}
          </div>
        </Card>
        <Card title="Actividad de la Última Semana">
             <ResponsiveContainer width="100%" height={300}>
                <BarChart data={last7DaysData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="viajes" fill="#3b82f6" />
                </BarChart>
            </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;