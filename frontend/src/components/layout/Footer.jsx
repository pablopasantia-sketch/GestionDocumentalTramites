import React from 'react';
import { Landmark, Server, Database, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer-sucre">
      <div className="footer-content">
        <div className="footer-brand">
          <Landmark size={20} color="#FFC107" />
          <span>GACETA MUNICIPAL DE SUCRE — SISTEMA WAYKA</span>
        </div>

        <div className="footer-links">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={14} color="#81D4FA" />
            <span>Frontend React 19</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={14} color="#A5D6A7" />
            <span>Node.js / Express</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={14} color="#FFE082" />
            <span>MySQL 8.0</span>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>
          <span>Sprint 1: Fundación del Sistema | Gestión 2026</span>
        </div>
      </div>
    </footer>
  );
}
