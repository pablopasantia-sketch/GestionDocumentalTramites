import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home';
import SystemStatus from './pages/SystemStatus';
import Login from './pages/Login';
import { Landmark, ArrowLeft } from 'lucide-react';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Componente para vistas en desarrollo con estilo Gaceta Sucre
function PlaceholderView({ title, description, badge }) {
  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', textAlign: 'center' }}>
      <div className="card" style={{ padding: '3rem 2rem', borderTop: '5px solid #800000' }}>
        <div style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: '4px', 
          background: '#800000', 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: 'white',
          marginBottom: '1rem',
          boxShadow: '0 2px 8px rgba(128, 0, 0, 0.25)'
        }}>
          <Landmark size={28} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <span className="badge badge-sucre">{badge}</span>
        </div>
        <h1 style={{ fontSize: '1.6rem', color: '#1B365D', marginBottom: '0.75rem' }}>{title}</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '1rem', maxWidth: '550px', margin: '0 auto 1.5rem' }}>
          {description}
        </p>
        
        <div style={{ background: 'var(--color-bg-container)', padding: '12px 20px', borderRadius: '4px', border: '1px solid var(--color-border)', display: 'inline-block', fontSize: '0.85rem', color: '#6C757D', marginBottom: '1.5rem' }}>
          Este módulo está planificado en el cronograma institucional de Wayka (Sprint 1 / Sprint 2).
        </div>

        <div>
          <Link to="/" className="btn btn-primary btn-sm">
            <ArrowLeft size={14} />
            <span>Volver a Inicio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/status" element={<SystemStatus />} />
            <Route path="/login" element={<Login />} />
            
            {/* Rutas de módulos protegidos según rol */}
            <Route 
              path="/ventanilla" 
              element={
                <ProtectedRoute allowedRoles={['VENTANILLA_UNICA', 'ADMIN_SISTEMA', 'ADMIN_WAYKA']}>
                  <PlaceholderView 
                    title="Módulo de Ventanilla Única" 
                    description="Recepción centralizada de trámites y correspondencia, emisión de Hoja de Ruta institucional con correlativo automático."
                    badge="Sprint 2: Core del Proceso"
                  />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/escritorio" 
              element={
                <ProtectedRoute allowedRoles={['FUNCIONARIO', 'VENTANILLA_UNICA', 'ADMIN_SISTEMA', 'ADMIN_WAYKA']}>
                  <PlaceholderView 
                    title="Escritorio Virtual y Bandejas" 
                    description="Bandejas de pendientes, recibidos y despachados. Atención con proveídos y derivación libre a destinatarios."
                    badge="Sprint 3: Flujo de Trabajo"
                  />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['ADMIN_SISTEMA', 'ADMIN_WAYKA']}>
                  <PlaceholderView 
                    title="Panel de Administración Institucional" 
                    description="Gestión de Personas, Usuarios, Roles, Usuario-Rol y Estructura Jerárquica del Organigrama de Sucre."
                    badge="Sprint 1: Tareas 4 y 5"
                  />
                </ProtectedRoute>
              } 
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </AuthProvider>
  );
}
