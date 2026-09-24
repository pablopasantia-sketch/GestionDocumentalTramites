import React, { useState } from 'react';
import { institucionalService } from '../../services/api';
import { Search, UserCheck, AlertCircle, Loader2, Sparkles } from 'lucide-react';

/**
 * Componente Reutilizable: Buscador y Autocompletado desde Padrón TEmpleados (DB_TRAMITES_EXTERNOS)
 * 
 * Props:
 *  - onSelectEmpleado: (empleadoData) => void
 *  - currentCi: string (CI actual en el formulario para pre-cargar)
 */
export default function EmpleadoSearchAutocomplete({ onSelectEmpleado, currentCi = '' }) {
  const [ciInput, setCiInput] = useState(currentCi || '');
  const [searching, setSearching] = useState(false);
  const [foundEmpleado, setFoundEmpleado] = useState(null);
  const [searchStatus, setSearchStatus] = useState(null); // 'found' | 'not_found' | 'error' | null

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const cleanCi = ciInput.toString().trim();
    if (!cleanCi) return;

    setSearching(true);
    setSearchStatus(null);
    setFoundEmpleado(null);

    try {
      // Intentar búsqueda por CI exacto (int)
      const parsedCi = parseInt(cleanCi, 10);
      if (!isNaN(parsedCi)) {
        try {
          const res = await institucionalService.getEmpleadoPorCi(parsedCi);
          const emp = res?.data || res;
          if (emp && emp.ci) {
            setFoundEmpleado(emp);
            setSearchStatus('found');
            setSearching(false);
            return;
          }
        } catch (err) {
          // Si es 404, continuar buscando por texto
        }
      }

      // Si no es solo número o no se encontró por CI exacto, buscar en lista
      const rawList = await institucionalService.getEmpleados({ search: cleanCi, activo: true });
      const list = Array.isArray(rawList) ? rawList : (rawList?.data || []);
      if (list && list.length > 0) {
        setFoundEmpleado(list[0]);
        setSearchStatus('found');
      } else {
        setSearchStatus('not_found');
      }
    } catch (err) {
      console.error('Error al consultar padrón TEmpleados:', err);
      setSearchStatus('error');
    } finally {
      setSearching(false);
    }
  };

  const handleApply = () => {
    if (!foundEmpleado || !onSelectEmpleado) return;

    // Desglosar nombres y apellidos si es necesario
    // TEmpleados guarda 'Apellidos' y 'Nombres'
    const apellidosParts = (foundEmpleado.apellidos || '').trim().split(/\s+/);
    const paterno = apellidosParts[0] || '';
    const materno = apellidosParts.slice(1).join(' ') || '';

    onSelectEmpleado({
      ci: foundEmpleado.ci.toString(),
      nombres: foundEmpleado.nombres || '',
      apellido_paterno: paterno,
      apellido_materno: materno,
      telefono: foundEmpleado.cel ? foundEmpleado.cel.toString() : '',
      email: foundEmpleado.email || '',
      direccion: foundEmpleado.direccion || '',
      ci_expedido: 'CH', // Default Chuquisaca
      empresa_telefonica: 'ENTEL'
    });
  };

  return (
    <div style={{
      gridColumn: 'span 2',
      backgroundColor: '#F8F9FA',
      border: '1px dashed #CED4DA',
      borderRadius: '6px',
      padding: '12px 14px',
      marginBottom: '10px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={15} style={{ color: '#800000' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1B365D' }}>
            Búsqueda Rápida en Padrón Institucional
          </span>
        </div>
        <span style={{
          fontSize: '0.68rem',
          backgroundColor: '#EFF6FF',
          color: '#1E40AF',
          padding: '1px 6px',
          borderRadius: '3px',
          fontWeight: 600,
          border: '1px solid #BFDBFE'
        }}>
          TEmpleados
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="form-control"
            placeholder="Ingrese CI del funcionario (ej: 1000001, 2000002)"
            value={ciInput}
            onChange={(e) => {
              setCiInput(e.target.value);
              if (searchStatus) setSearchStatus(null);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }}
            style={{ fontSize: '0.85rem', paddingRight: '28px' }}
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !ciInput.trim()}
          className="btn btn-sm"
          style={{
            backgroundColor: '#800000',
            color: 'white',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 12px',
            borderRadius: '4px',
            fontWeight: 600,
            fontSize: '0.82rem',
            border: 'none',
            cursor: searching || !ciInput.trim() ? 'not-allowed' : 'pointer',
            opacity: searching || !ciInput.trim() ? 0.7 : 1
          }}
        >
          {searching ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
          <span>Buscar en Padrón</span>
        </button>
      </div>

      {/* Resultados de búsqueda */}
      {searchStatus === 'found' && foundEmpleado && (
        <div style={{
          marginTop: '10px',
          padding: '10px 12px',
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: '5px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#DCFCE7',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>
                {foundEmpleado.nombreCompleto}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#4B5563' }}>
                CI: <strong>{foundEmpleado.ci}</strong> | Cel: {foundEmpleado.cel || '—'} | Email: {foundEmpleado.email || '—'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleApply}
            className="btn btn-sm"
            style={{
              backgroundColor: '#166534',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            Autocompletar Formulario
          </button>
        </div>
      )}

      {searchStatus === 'not_found' && (
        <div style={{
          marginTop: '8px',
          fontSize: '0.78rem',
          color: '#6C757D',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          <AlertCircle size={13} style={{ color: '#D97706' }} />
          <span>No se encontró funcionario con ese CI en TEmpleados. Puede ingresar los datos manualmente.</span>
        </div>
      )}

      {searchStatus === 'error' && (
        <div style={{
          marginTop: '8px',
          fontSize: '0.78rem',
          color: '#DC2626',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          <AlertCircle size={13} />
          <span>Error de conexión al consultar el padrón institucional.</span>
        </div>
      )}
    </div>
  );
}
