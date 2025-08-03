import { v4 as uuidv4 } from 'uuid';

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum PermissionAction {
  VIEW = 'view',
  CREATE = 'create',
  EDIT = 'edit',
  DELETE = 'delete',
}

export interface User {
  id: string;
  username: string;
  password?: string; // Should be a hash in a real app. Here for mock API.
  role: UserRole;
  createdAt: string;
  permissions: { [resource: string]: PermissionAction[] };
}

export enum TripStatus {
  QUOTED = 'Cotizado',
  CONFIRMED = 'Confirmado',
  IN_PROGRESS = 'En Progreso',
  COMPLETED = 'Completado',
  CANCELED = 'Cancelado',
}

export enum TripEventType {
  ASSIGNED = 'Asignado',
  PORT_DEPARTURE = 'Salida de puerto',
  REPOSTAJE = 'Repostaje',
  ARRIVAL_DESTINATION = 'Llegada a Destino',
  UNLOADING_START = 'Inicio de descarga',
  STAY_START = 'Inicio de Estadías',
  UNHOOK = 'Desenganche',
  STAY_END = 'Fin de Estadías',
  UNLOADING_END = 'Fin de descarga',
  EMPTY_RETURN_START = 'Inicio de Retorno Vacío',
  EMPTY_RETURN_END = 'Fin de Retorno Vacío',
  MOVEMENT = 'Movimiento',
}

export interface TripEvent {
  type: TripEventType;
  timestamp: string;
  notes?: string;
  amount?: number;
  assignedDriverId?: string;
  galonaje?: number;
  precioGalon?: number;
  numeroDocumento?: string;
  unhookCost?: number;
  demurrageRate?: number;
}

export interface TripAssignment {
  id: string; // for react keys
  containerNumber: string;
  merchandiseType?: string;
  driverId: string;
  truckId: string;
  trailerId: string;
  cost: number;
  events: TripEvent[];
  dmtiCost?: number;
  dmti?: { // Temporary data for DMTI creation form
    registrationDate: string;
    startingCustoms: string;
    user: DMTIUser;
  };
}

export enum CargoType {
    CONTAINER = 'Contenedores',
    LOOSE_CARGO = 'Carga suelta',
}

export enum InvoiceStatus {
    ACTIVE = 'Activa',
    INVOICED = 'Facturada',
}

export interface Trip {
  id: string;
  serviceOrder: string;
  clientName: string;
  status: TripStatus;
  isDeleted: boolean;
  
  origin: string;
  destination: string;
  billOfLading: string;
  shippingLine: string;
  weightKg: number;
  
  cargoType: CargoType;
  assignments: TripAssignment[];

  demurrage: number;
  unhookCost?: number;
  invoiceStatus?: InvoiceStatus;

  createdAt: string;
  updatedAt: string;
}


export interface Driver {
  id: string;
  name: string;
  contact: string;
  licenseNumber: string;
  duiNumber: string;
  truckPlate: string;
  observations: string;
  isDeleted: boolean;
}

export enum VehicleStatus {
  ACTIVE = 'Activo',
  MAINTENANCE = 'Mantenimiento',
  OUT_OF_SERVICE = 'Fuera de servicio',
}

export interface Vehicle {
  id: string;
  plate: string;
  type: 'truck' | 'trailer';
  trailerType?: string; // e.g., 'Contenedor', 'Plataforma'
  trailerSize?: string; // e.g., '40ft', '20ft'
  status?: VehicleStatus;
  lastMaintenanceDate?: string;
  isDeleted: boolean;
}

export enum DMTIUser {
  TRANSPORTE = 'Transporte',
  US_NAVIERA = 'US Naviera',
}

export interface DMTI {
  id: string;
  clientName: string;
  containerNumber: string;
  registrationDate: string; // Format: YYYY-MM-DD
  user: DMTIUser;
  startingCustoms: string;
  createdAt: string; // ISO Timestamp
}

export enum CompanySize {
  PEQUEÑA = 'Pequeña',
  MEDIANA = 'Mediana',
  GRANDE = 'Grande',
}

export interface Client {
  id: string;
  razonSocial: string;
  nit: string;
  giroComercial: string;
  companySize: CompanySize;
  phone: string;
  email: string;
  referencePerson: string;
  isDeleted: boolean;
  flete?: number;
  dmti?: number;
}

export enum ResourceType {
    TRIP = 'trips',
    DRIVER = 'drivers',
    TRUCK = 'trucks',
    TRAILER = 'trailers',
    DMTI = 'dmtis',
    CLIENT = 'clients',
    WORK_ORDER = 'work-orders',
}