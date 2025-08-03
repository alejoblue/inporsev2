import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DataProvider } from './hooks/useData';
import Auth from './components/Auth';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TripManager from './components/TripManager';
import ClientManager from './components/ClientManager';
import ResourceManager from './components/ResourceManager';
import ReportManager from './components/ReportManager';
import UserManager from './components/UserManager';
import DMTIManager from './components/DMTIManager';
import WorkOrderManager from './components/WorkOrderManager';
import ProfitabilityReport from './components/ProfitabilityReport';
import { ResourceType, UserRole, PermissionAction } from './types';

const PermissionGuard: React.FC<{ children: React.ReactNode; requiredPermission: string }> = ({ children, requiredPermission }) => {
  const { user } = useAuth();
  
  if (user?.role === UserRole.ADMIN) {
    return <>{children}</>;
  }

  if (user?.permissions?.[requiredPermission]?.includes(PermissionAction.VIEW)) {
    return <>{children}</>;
  }

  return <Navigate to="/" />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <Router />
      </DataProvider>
    </AuthProvider>
  );
};

const Router: React.FC = () => {
  const { user } = useAuth();

  return (
    <HashRouter>
      <Routes>
        <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="trips" element={<PermissionGuard requiredPermission="/trips"><TripManager /></PermissionGuard>} />
          <Route path="work-orders" element={<PermissionGuard requiredPermission="/work-orders"><WorkOrderManager /></PermissionGuard>} />
          <Route path="clients" element={<PermissionGuard requiredPermission="/clients"><ClientManager /></PermissionGuard>} />
          <Route path="drivers" element={<PermissionGuard requiredPermission="/drivers"><ResourceManager resourceType={ResourceType.DRIVER} /></PermissionGuard>} />
          <Route path="trucks" element={<PermissionGuard requiredPermission="/trucks"><ResourceManager resourceType={ResourceType.TRUCK} /></PermissionGuard>} />
          <Route path="trailers" element={<PermissionGuard requiredPermission="/trailers"><ResourceManager resourceType={ResourceType.TRAILER} /></PermissionGuard>} />
          <Route path="driver-payments" element={<PermissionGuard requiredPermission="/driver-payments"><ReportManager /></PermissionGuard>} />
          <Route path="reports" element={<PermissionGuard requiredPermission="/reports"><ProfitabilityReport /></PermissionGuard>} />
          <Route path="dmti" element={<PermissionGuard requiredPermission="/dmti"><DMTIManager /></PermissionGuard>} />
          
          <Route path="admin/users" element={<AdminRoute><UserManager /></AdminRoute>} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
        
        <Route path="*" element={<Navigate to={user ? "/" : "/auth"} />} />
      </Routes>
    </HashRouter>
  );
};

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }
  return user ? <>{children}</> : <Navigate to="/auth" />;
};

const AdminRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  return user?.role === UserRole.ADMIN ? <>{children}</> : <Navigate to="/" />;
};


export default App;