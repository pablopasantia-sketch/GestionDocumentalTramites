import React from 'react';
import { Landmark, MapPin, Shield } from 'lucide-react';

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
            <MapPin size={14} color="#81D4FA" />
            <span>Plaza 25 de Mayo N° 1, Sucre - Bolivia</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} color="#A5D6A7" />
            <span>Plataforma Oficial de Workflow y Gestión Documental</span>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>
          <span>Gobierno Autónomo Municipal de Sucre | Gestión 2026</span>
        </div>
      </div>
    </footer>
  );
}
