import React, { useState, useEffect } from 'react';
import { institucionalService } from '../../services/api';
import { Building2, Briefcase, Loader2, AlertCircle } from 'lucide-react';

/**
 * Componente Reutilizable: Selectores Institucionales en Cascada (TUnidad -> TCargo)
 * Conforme a DBNotasCMS para Trámites Externos y Asignación Institucional.
 * 
 * Props:
 *  - selectedCodU: number | string (CodU seleccionado)
 *  - onUnidadChange: (codU, unidadObj) => void
 *  - selectedCodCargo: number | string (CodCargo seleccionado)
 *  - onCargoChange: (codCargo, cargoObj) => void
 *  - required: boolean (si los campos son requeridos)
 *  - disabled: boolean (si los campos están deshabilitados)
 *  - layout: 'grid' | 'stack' (diseño de los campos, default: 'grid')
 *  - showBadges: boolean (mostrar etiqueta DBNotasCMS, default: true)
 */
export default function InstitucionalSelectors({
  selectedCodU = '',
  onUnidadChange,
  selectedCodCargo = '',
  onCargoChange,
  required = false,
  disabled = false,
  layout = 'grid',
  showBadges = true,
}) {
  const [unidades, setUnidades] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [loadingCargos, setLoadingCargos] = useState(false);
  const [error, setError] = useState(null);

  // Cargar lista de Unidades Institucionales al montar
  useEffect(() => {
    let isMounted = true;
    const loadUnidades = async () => {
      setLoadingUnidades(true);
      setError(null);
      try {
        const res = await institucionalService.getUnidades({ activo: true });
        if (isMounted) {
          const list = Array.isArray(res) ? res : (res?.data || []);
          setUnidades(list);
        }
      } catch (err) {
        if (isMounted) {
          setError('No se pudo cargar el catálogo de unidades de DBNotasCMS.');
          console.error(err);
        }
      } finally {
        if (isMounted) setLoadingUnidades(false);
      }
    };

    loadUnidades();
    return () => { isMounted = false; };
  }, []);

  // Cargar cargos cuando cambia la unidad seleccionada
  useEffect(() => {
    if (!selectedCodU) {
      setCargos([]);
      return;
    }

    let isMounted = true;
    const loadCargos = async () => {
      setLoadingCargos(true);
      try {
        const res = await institucionalService.getCargos({ codU: selectedCodU });
        if (isMounted) {
          const list = Array.isArray(res) ? res : (res?.data || []);
          setCargos(list);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error al cargar cargos de la unidad:', err);
        }
      } finally {
        if (isMounted) setLoadingCargos(false);
      }
    };

    loadCargos();
    return () => { isMounted = false; };
  }, [selectedCodU]);

  const handleUnidadSelect = (e) => {
    const val = e.target.value;
    const codU = val ? parseInt(val, 10) : '';
    const unidadObj = unidades.find(u => u.codU === codU) || null;
    
    // Al cambiar la unidad, reseteamos el cargo
    if (onUnidadChange) onUnidadChange(codU, unidadObj);
    if (onCargoChange) onCargoChange('', null);
  };

  const handleCargoSelect = (e) => {
    const val = e.target.value;
    const codCargo = val ? parseInt(val, 10) : '';
    const cargoObj = cargos.find(c => c.codCargo === codCargo) || null;
    if (onCargoChange) onCargoChange(codCargo, cargoObj);
  };

  const isGrid = layout === 'grid';

  return (
    <div style={{ width: '100%' }}>
      {error && (
        <div style={{
          padding: '8px 12px',
          marginBottom: '10px',
          borderRadius: '4px',
          backgroundColor: '#FDF2F2',
          border: '1px solid #F8B4B4',
          color: '#9B1C1C',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div style={{
        display: isGrid ? 'grid' : 'flex',
        gridTemplateColumns: isGrid ? '1fr 1fr' : undefined,
        flexDirection: isGrid ? undefined : 'column',
        gap: '12px'
      }}>
        {/* Selector de Unidad Institucional */}
        <div className="form-group" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label className="form-label" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Building2 size={14} style={{ color: '#800000' }} />
              <span>Unidad Institucional</span>
              {required && <span style={{ color: '#DC3545' }}>*</span>}
            </label>
            {showBadges && (
              <span style={{
                fontSize: '0.68rem',
                backgroundColor: '#EFF6FF',
                color: '#1E40AF',
                padding: '1px 6px',
                borderRadius: '3px',
                fontWeight: 600,
                border: '1px solid #BFDBFE'
              }}>
                TUnidad
              </span>
            )}
          </div>
          
          <div style={{ position: 'relative' }}>
            <select
              className="form-control"
              value={selectedCodU}
              onChange={handleUnidadSelect}
              disabled={disabled || loadingUnidades}
              required={required}
              style={{ paddingRight: loadingUnidades ? '30px' : undefined }}
            >
              <option value="">-- Seleccione una unidad --</option>
              {unidades.map((u) => (
                <option key={u.codU} value={u.codU}>
                  {u.nombU}
                </option>
              ))}
            </select>
            {loadingUnidades && (
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                <Loader2 size={16} className="spin" style={{ color: '#800000' }} />
              </span>
            )}
          </div>
        </div>

        {/* Selector de Cargo Institucional (Dependiente de Unidad) */}
        <div className="form-group" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label className="form-label" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Briefcase size={14} style={{ color: '#1B365D' }} />
              <span>Cargo Institucional</span>
              {required && <span style={{ color: '#DC3545' }}>*</span>}
            </label>
            {showBadges && (
              <span style={{
                fontSize: '0.68rem',
                backgroundColor: '#F0FDF4',
                color: '#166534',
                padding: '1px 6px',
                borderRadius: '3px',
                fontWeight: 600,
                border: '1px solid #BBF7D0'
              }}>
                TCargo
              </span>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <select
              className="form-control"
              value={selectedCodCargo}
              onChange={handleCargoSelect}
              disabled={disabled || !selectedCodU || loadingCargos}
              required={required}
              style={{
                backgroundColor: !selectedCodU ? '#F8F9FA' : 'white',
                color: !selectedCodU ? '#6C757D' : '#1B365D',
                paddingRight: loadingCargos ? '30px' : undefined
              }}
            >
              <option value="">
                {!selectedCodU
                  ? '-- Primero seleccione una unidad --'
                  : cargos.length === 0 && !loadingCargos
                  ? '-- No hay cargos registrados en esta unidad --'
                  : '-- Seleccione un cargo oficial --'}
              </option>
              {cargos.map((c) => (
                <option key={c.codCargo} value={c.codCargo}>
                  {c.nombreC}
                </option>
              ))}
            </select>
            {loadingCargos && (
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                <Loader2 size={16} className="spin" style={{ color: '#1B365D' }} />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
