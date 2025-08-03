import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Trip, Driver, Vehicle, DMTI, Client } from '../types';
import { api } from '../services/api';

interface DataContextType {
  trips: Trip[];
  drivers: Driver[];
  trucks: Vehicle[];
  trailers: Vehicle[];
  dmtis: DMTI[];
  clients: Client[];
  loading: boolean;
  reloadData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Vehicle[]>([]);
  const [trailers, setTrailers] = useState<Vehicle[]>([]);
  const [dmtis, setDmtis] = useState<DMTI[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [tripsData, driversData, trucksData, trailersData, dmtisData, clientsData] = await Promise.all([
        api.getResource<Trip>('trips'),
        api.getResource<Driver>('drivers'),
        api.getResource<Vehicle>('trucks'),
        api.getResource<Vehicle>('trailers'),
        api.getResource<DMTI>('dmtis'),
        api.getResource<Client>('clients'),
      ]);
      setTrips(tripsData);
      setDrivers(driversData);
      setTrucks(trucksData);
      setTrailers(trailersData);
      setDmtis(dmtisData);
      setClients(clientsData);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return (
    <DataContext.Provider value={{ trips, drivers, trucks, trailers, dmtis, clients, loading, reloadData: loadAllData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};