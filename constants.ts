import { UserRole, Driver, Vehicle, Trip, TripStatus, TripEventType, VehicleStatus, TripAssignment, CargoType, Client, CompanySize, InvoiceStatus } from './types';
import { v4 as uuidv4 } from 'uuid';

export const APP_NAME = "Grupo INPORSE";
export const ADMIN_USERNAME = "administrador";
export const ADMIN_PASSWORD = "InporseAdmin2024!";

export const INITIAL_DRIVERS: Omit<Driver, 'id' | 'isDeleted'>[] = [
  { name: 'Juan Pérez', contact: '555-1234', licenseNumber: 'A1234567', duiNumber: '0801-1980-12345', truckPlate: 'AAB 1234', observations: 'Experto en rutas largas.' },
  { name: 'Carlos Gomez', contact: '555-5678', licenseNumber: 'B8901234', duiNumber: '0801-1990-54321', truckPlate: 'BBC 5678', observations: 'Disponible fines de semana.' },
  { name: 'Luis Martinez', contact: '555-9012', licenseNumber: 'C5678901', duiNumber: '0502-1985-00112', truckPlate: 'CCD 9012', observations: '' },
];

export const INITIAL_TRUCKS: Omit<Vehicle, 'id' | 'isDeleted' | 'type' >[] = [
  { plate: 'AAB 1234', status: VehicleStatus.ACTIVE },
  { plate: 'BBC 5678', status: VehicleStatus.ACTIVE },
  { plate: 'CCD 9012', status: VehicleStatus.ACTIVE },
];

export const INITIAL_TRAILERS: Omit<Vehicle, 'id' | 'isDeleted' | 'type'>[] = [
  { plate: 'RA 1111', trailerType: 'Contenedor', trailerSize: '40ft' },
  { plate: 'RB 2222', trailerType: 'Contenedor', trailerSize: '20ft' },
  { plate: 'RC 3333', trailerType: 'Plataforma', trailerSize: '' },
];

export const INITIAL_CLIENTS: Omit<Client, 'id' | 'isDeleted'>[] = [
  { razonSocial: 'Importadora del Atlántico S.A.', nit: '05019000123456', giroComercial: 'Importación de Electrónicos', companySize: CompanySize.GRANDE, phone: '2233-4455', email: 'contacto@importadoraatlantico.com', referencePerson: 'Ana Rodriguez' },
  { razonSocial: 'Textiles de Centroamérica', nit: '08011995123456', giroComercial: 'Manufactura de Ropa', companySize: CompanySize.MEDIANA, phone: '2550-8090', email: 'info@textilesca.com', referencePerson: 'Carlos Fuentes' },
  { razonSocial: 'Agroexportadora del Valle', nit: '12012001123456', giroComercial: 'Exportación de Frutas y Vegetales', companySize: CompanySize.GRANDE, phone: '2668-1122', email: 'ventas@agroexportadora.com', referencePerson: 'Sofia Loren' },
  { razonSocial: 'Soluciones Logisticas Express', nit: '18012010123456', giroComercial: 'Servicios de Logística', companySize: CompanySize.PEQUEÑA, phone: '9988-7766', email: 'servicio@logisticasexpress.com', referencePerson: 'Mario Lopez' },
];

const generateServiceOrder = (index: number) => {
    const year = new Date().getFullYear();
    const serviceNumber = (index + 1).toString().padStart(4, '0');
    return `IPS${serviceNumber}TT${year}`;
}

const createPastDate = (daysAgo: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
}

export const generateInitialTrips = (drivers: Driver[], trucks: Vehicle[], trailers: Vehicle[], clients: Client[]): Trip[] => {
    const trips: Trip[] = [];
    for (let i = 0; i < 15; i++) {
        const daysAgo = 8 - (i % 7); // trips over the last week
        const driver1 = drivers[i % drivers.length];
        const truck1 = trucks[i % trucks.length];
        const trailer1 = trailers[i % trailers.length];
        const cargoType = i % 5 === 0 ? CargoType.LOOSE_CARGO : CargoType.CONTAINER;
        const client = clients[i % clients.length];

        const assignment1: TripAssignment = {
            id: uuidv4(),
            containerNumber: cargoType === CargoType.CONTAINER ? `MSKU${Math.floor(100000 + Math.random() * 900000)}` : '',
            merchandiseType: cargoType === CargoType.LOOSE_CARGO ? `Carga variada #${i + 1}` : undefined,
            driverId: driver1.id,
            truckId: truck1.id,
            trailerId: trailer1.id,
            cost: Math.floor(500 + Math.random() * 200),
            events: i < 10 ? [
                { type: TripEventType.ASSIGNED, timestamp: createPastDate(daysAgo) },
                { type: TripEventType.PORT_DEPARTURE, timestamp: createPastDate(daysAgo) },
                { type: TripEventType.ARRIVAL_DESTINATION, timestamp: createPastDate(daysAgo - 1) },
                { type: TripEventType.UNLOADING_END, timestamp: createPastDate(daysAgo - 1) },
                { type: TripEventType.EMPTY_RETURN_END, timestamp: createPastDate(daysAgo - 1) },
            ] : [
                { type: TripEventType.ASSIGNED, timestamp: createPastDate(daysAgo) },
            ],
        };
        
        const assignments = [assignment1];

        // For some container trips, add a second container
        if (cargoType === CargoType.CONTAINER && i % 4 === 0 && drivers.length > 1 && trucks.length > 1 && trailers.length > 1) {
             const driver2 = drivers[(i + 1) % drivers.length];
             const truck2 = trucks[(i + 1) % trucks.length];
             const trailer2 = trailers[(i + 1) % trailers.length];
             const assignment2: TripAssignment = {
                id: uuidv4(),
                containerNumber: `CMAU${Math.floor(100000 + Math.random() * 900000)}`,
                driverId: driver2.id,
                truckId: truck2.id,
                trailerId: trailer2.id,
                cost: Math.floor(450 + Math.random() * 200),
                events: [{ type: TripEventType.ASSIGNED, timestamp: createPastDate(daysAgo) }],
            };
            assignments.push(assignment2);
        }

        // For some loose cargo trips, add a second assignment
         if (cargoType === CargoType.LOOSE_CARGO && i > 0 && drivers.length > 1 && trucks.length > 1 && trailers.length > 1) {
             const driver2 = drivers[(i + 1) % drivers.length];
             const truck2 = trucks[(i + 1) % trucks.length];
             const trailer2 = trailers[(i + 1) % trailers.length];
             const assignment2: TripAssignment = {
                id: uuidv4(),
                containerNumber: '',
                merchandiseType: `Otra carga #${i + 1}`,
                driverId: driver2.id,
                truckId: truck2.id,
                trailerId: trailer2.id,
                cost: Math.floor(300 + Math.random() * 150),
                events: [{ type: TripEventType.ASSIGNED, timestamp: createPastDate(daysAgo) }],
            };
            assignments.push(assignment2);
        }
        
        const status = i < 10 ? TripStatus.COMPLETED : (i < 13 ? TripStatus.IN_PROGRESS : TripStatus.CONFIRMED);

        const trip: Trip = {
            id: uuidv4(),
            serviceOrder: generateServiceOrder(i),
            clientName: client.razonSocial,
            status,
            isDeleted: false,
            billOfLading: `BL${1000 + i}`,
            shippingLine: i % 2 === 0 ? 'Maersk' : 'CMA CGM',
            weightKg: 22000 + (i * 100),
            origin: 'Puerto Cortés',
            destination: 'Tegucigalpa',
            cargoType: cargoType,
            assignments,
            demurrage: 0,
            createdAt: createPastDate(daysAgo),
            updatedAt: createPastDate(daysAgo - (i < 10 ? 1 : 0)),
        };
        
        if (status === TripStatus.COMPLETED) {
            trip.invoiceStatus = i % 2 === 0 ? InvoiceStatus.INVOICED : InvoiceStatus.ACTIVE;
        }

        trips.push(trip);
    }
    return trips;
};