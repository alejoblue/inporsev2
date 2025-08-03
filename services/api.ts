import { v4 as uuidv4 } from 'uuid';
import { User, UserRole, Trip, Driver, Vehicle, ResourceType, DMTI, Client } from '../types';
import { ADMIN_USERNAME, ADMIN_PASSWORD, INITIAL_DRIVERS, INITIAL_TRUCKS, INITIAL_TRAILERS, generateInitialTrips, INITIAL_CLIENTS } from '../constants';

const MOCK_API_LATENCY = 150; // Simulate network latency in milliseconds

/**
 * This is NOT a secure hash function. It's for demonstration purposes only.
 * In a real-world application, use a strong, standard library like bcrypt.
 * @param password The plain text password.
 * @returns A mock "hashed" password.
 */
const fakeHash = (password: string): string => {
    if (!password) return '';
    // A simple, reversible transformation to simulate hashing.
    return `hashed_${password.split('').reverse().join('')}`;
}

class ApiService {
  private users: User[] = [];
  private drivers: Driver[] = [];
  private trucks: Vehicle[] = [];
  private trailers: Vehicle[] = [];
  private trips: Trip[] = [];
  private dmtis: DMTI[] = [];
  private clients: Client[] = [];
  
  private lastServiceNumber = 0;
  private dbInitialized = false;

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    if (this.dbInitialized) return;

    // Users
    const adminUser: User = {
      id: uuidv4(),
      username: ADMIN_USERNAME,
      password: fakeHash(ADMIN_PASSWORD), // In a real app, this would be hashed
      role: UserRole.ADMIN,
      createdAt: new Date().toISOString(),
      permissions: {}, // Admin has all permissions implicitly
    };
    this.users = [adminUser];

    // Clients
    this.clients = INITIAL_CLIENTS.map(c => ({...c, id: uuidv4(), isDeleted: false }));

    // Drivers
    this.drivers = INITIAL_DRIVERS.map(d => ({ ...d, id: uuidv4(), isDeleted: false }));
    
    // Vehicles
    this.trucks = INITIAL_TRUCKS.map(t => ({ ...t, id: uuidv4(), type: 'truck' as const, isDeleted: false }));
    this.trailers = INITIAL_TRAILERS.map(t => ({ ...t, id: uuidv4(), type: 'trailer' as const, isDeleted: false }));

    // Trips
    this.trips = generateInitialTrips(this.drivers, this.trucks, this.trailers, this.clients);
    this.lastServiceNumber = this.trips.length;

    this.dbInitialized = true;
    console.log('In-memory database initialized with seed data.');
  }

  private getResourceList(resource: string) {
    switch(resource) {
        case ResourceType.TRIP: return this.trips;
        case ResourceType.DRIVER: return this.drivers;
        case ResourceType.TRUCK: return this.trucks;
        case ResourceType.TRAILER: return this.trailers;
        case ResourceType.DMTI: return this.dmtis;
        case ResourceType.CLIENT: return this.clients;
        case 'users': return this.users;
        default: throw new Error(`Unknown resource type: ${resource}`);
    }
  }

  // --- Auth ---
  async login(username: string, password_raw: string): Promise<User | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Find user and compare "hashed" password
        const user = this.users.find(u => u.username === username && u.password === fakeHash(password_raw));
        if (!user) {
          resolve(null);
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = user;
        resolve(userWithoutPassword);
      }, MOCK_API_LATENCY);
    });
  }
  
  // --- Generic Resource CRUD ---
  async getResource<T>(resource: string): Promise<T[]> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(this.getResourceList(resource) as unknown as T[]);
        }, MOCK_API_LATENCY);
    });
  }

  async createResource<T extends {id: string}>(resource: string, data: Omit<T, 'id'>): Promise<T> {
      return new Promise((resolve) => {
          setTimeout(() => {
              const items = this.getResourceList(resource) as unknown as T[];
              const newItem = { ...data, id: uuidv4() } as T;
              items.push(newItem);
              resolve(newItem);
          }, MOCK_API_LATENCY);
      });
  }

  async updateResource<T extends {id: string}>(resource: string, id: string, data: Partial<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const items = this.getResourceList(resource) as unknown as T[];
            const itemIndex = items.findIndex(i => i.id === id);
            if (itemIndex === -1) {
              reject(new Error('Item not found'));
              return;
            }
            const updatedItem = { ...items[itemIndex], ...data };
            items[itemIndex] = updatedItem;
            resolve(updatedItem);
        }, MOCK_API_LATENCY);
    });
  }

  async deleteResource<T extends {id: string, isDeleted?: boolean}>(resource: string, id: string): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            const items = this.getResourceList(resource) as unknown as T[];
            const itemIndex = items.findIndex(i => i.id === id);

            if (itemIndex === -1) {
                resolve(); // Item not found, do nothing
                return;
            }
            
            const item = items[itemIndex];

            if(typeof item.isDeleted !== 'undefined') {
                // Soft delete
                item.isDeleted = true;
            } else {
                // Hard delete
                items.splice(itemIndex, 1);
            }
            resolve();
        }, MOCK_API_LATENCY);
    });
  }

  async recoverResource<T extends {id: string, isDeleted?: boolean}>(resource: string, id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const items = this.getResourceList(resource) as unknown as T[];
        const item = items.find(i => i.id === id);
        if(item && typeof item.isDeleted !== 'undefined') {
            item.isDeleted = false;
        }
        resolve();
      }, MOCK_API_LATENCY);
    });
  }

  // --- Users ---
  async getUsers(): Promise<User[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        resolve(this.users.map(({ password, ...user }) => user));
      }, MOCK_API_LATENCY);
    });
  }

   async createUser(data: Omit<User, 'id' | 'createdAt' | 'role' | 'password'> & { password?: string }): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.users.some(u => u.username === data.username)) {
          reject(new Error('El nombre de usuario ya existe.'));
          return;
        }
        const newUser: User = {
          id: uuidv4(),
          username: data.username,
          password: fakeHash(data.password || ''),
          role: UserRole.USER,
          permissions: data.permissions || {},
          createdAt: new Date().toISOString(),
        };
        this.users.push(newUser);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = newUser;
        resolve(userWithoutPassword);
      }, MOCK_API_LATENCY);
    });
  }

  async updateUser(userId: string, data: Partial<Pick<User, 'permissions'>>): Promise<User> {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const userIndex = this.users.findIndex(u => u.id === userId);
          if (userIndex === -1) {
            reject(new Error('User not found'));
            return;
          }
          
          const updatedUser = { ...this.users[userIndex], ...data };
          this.users[userIndex] = updatedUser;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { password, ...userWithoutPassword } = updatedUser;
          resolve(userWithoutPassword);
        }, MOCK_API_LATENCY);
      });
  }

  async deleteUser(id: string): Promise<void> {
     return this.deleteResource('users', id);
  }

  async updateUserPassword(userId: string, newPassword_raw: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
          reject(new Error('User not found'));
          return;
        }
        this.users[userIndex].password = fakeHash(newPassword_raw);
        resolve();
      }, MOCK_API_LATENCY);
    });
  }

  // --- DMTI Specific ---
  async createDMTI(data: Omit<DMTI, 'id' | 'createdAt'>): Promise<DMTI> {
    return new Promise((resolve) => {
        setTimeout(() => {
            const year = new Date(data.registrationDate + 'T00:00:00.000Z').getFullYear();
            
            // Filter for DMTIs of the same year that follow the new correlative format
            const dmtisThisYearWithNewFormat = this.dmtis.filter(d => {
                const dYear = new Date(d.registrationDate + 'T00:00:00.000Z').getFullYear();
                const isNumericSuffix = !isNaN(parseInt(d.id.slice(-5)));
                return dYear === year && isNumericSuffix && d.id.length < 36; 
            });

            let nextSequence: number;

            if (year === 2025) {
                const sequences = dmtisThisYearWithNewFormat.map(d => parseInt(d.id.slice(-5)));
                if (sequences.length > 0) {
                    nextSequence = Math.max(...sequences) + 1;
                } else {
                    nextSequence = 428;
                }
            } else { // For other years
                const sequences = dmtisThisYearWithNewFormat.map(d => parseInt(d.id.slice(-5)));
                if (sequences.length > 0) {
                    nextSequence = Math.max(...sequences) + 1;
                } else {
                    nextSequence = 1;
                }
            }
            
            const sequenceString = nextSequence.toString().padStart(5, '0');
            const customsCode = data.startingCustoms.replace(/[^a-zA-Z0-9]/g, '');
            const userCode = 'SV02347';
            
            const correlative = `${year}${customsCode}${userCode}${sequenceString}`;
            
            const newDMTI: DMTI = {
                ...data,
                id: correlative,
                createdAt: new Date().toISOString(),
            };

            this.dmtis.push(newDMTI);
            resolve(newDMTI);
        }, MOCK_API_LATENCY);
    });
  }

  // --- Service Order ---
  async getNextServiceOrder(): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.lastServiceNumber++;
        const year = new Date().getFullYear();
        resolve(`IPS${this.lastServiceNumber.toString().padStart(4, '0')}TT${year}`);
      }, MOCK_API_LATENCY);
    });
  }
}

export const api = new ApiService();