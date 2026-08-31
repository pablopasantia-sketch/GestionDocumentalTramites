import React from 'react';
import { Layers, Database, Server, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Layers size={18} color="#3b82f6" />
          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
            WAYKA MVP 2026
          </span>
          <span>— Sistema de Gestión Documental y Workflow</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Globe size={14} color="#06b6d4" />
            <span>React + Vite SPA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Server size={14} color="#3b82f6" />
            <span>Node.js / Express</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Database size={14} color="#f59e0b" />
            <span>MySQL 8.0+</span>
          </div>
        </div>

        <div>
          <span>Sprint 1: Fundación & Entorno</span>
        </div>
      </div>
    </footer>
  );
}
