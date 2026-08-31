import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home';
import SystemStatus from './pages/SystemStatus';
import Login from './pages/Login';

// Componente para vistas en desarrollo
function PlaceholderView({ title, description, badge }) {
  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', textAlign: 'center' }}>
      <div className="card" style={{ padding: '3rem 2rem' }}>
        <span className="badge badge-info" style={{ marginBottom: '1rem' }}>{badge}</span>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>{title}</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{description}</p>
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'inline-block', fontSize: '0.85rem', color: '#94a3b8' }}>
          Este módulo se activará en las siguientes tareas del Sprint 1 y Sprint 2.
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
            
            {/* Rutas de módulos futuros */}
            <Route 
              path="/ventanilla" 
              element={
                <PlaceholderView 
                  title="Módulo de Ventanilla Única" 
                  description="Recepción de trámites, correlativos automáticos e inicio de flujos institucionales."
                  badge="Sprint 2: Core del Proceso"
                />
              } 
            />
            <Route 
              path="/escritorio" 
              element={
                <PlaceholderView 
                  title="Escritorio Virtual y Bandejas" 
                  description="Bandejas de pendientes, derivación de procesos y atención de correspondencias."
                  badge="Sprint 3: Flujo de Trabajo"
                />
              } 
            />
            <Route 
              path="/admin" 
              element={
                <PlaceholderView 
                  title="Panel de Administración" 
                  description="Gestión de Personas, Usuarios, Roles, Usuario-Rol y Organigrama Institucional."
                  badge="Sprint 1: Tareas 4 y 5"
                />
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
