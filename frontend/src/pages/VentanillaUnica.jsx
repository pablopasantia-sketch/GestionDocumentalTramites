import React, { useState, useEffect } from 'react';
import {
  Inbox,
  FileText,
  Send,
  Building2,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Printer,
  Search,
  Plus,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  FileCheck,
  Tag,
  Hash,
  Eye,
  X,
  Landmark,
  UserCheck
} from 'lucide-react';
import { tramitesService, tiposProcesoService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import InstitucionalSelectors from '../components/institucional/InstitucionalSelectors';
import EmpleadoSearchAutocomplete from '../components/institucional/EmpleadoSearchAutocomplete';

const INSTRUCCIONES_SUGERIDAS = [
  'Para su atención y trámite correspondiente según normativa',
  'Para informe técnico y recomendación legal pertinente',
  'Para su conocimiento, análisis y archivo correspondiente',
  'Para verificación de antecedentes y emisión de criterio',
  'Con carácter de urgencia para respuesta inmediata'
];

export default function VentanillaUnica() {
  const { user: currentUser } = useAuth();

  // Estados de control
  const [activeTab, setActiveTab] = useState('nuevo'); // 'nuevo' | 'historial'
  const [tiposExternos, setTiposExternos] = useState([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [correlativoPreview, setCorrelativoPreview] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Formulario de emisión
  const [formData, setFormData] = useState({
    tipo_proceso_id: '',
    remitente: '',
    institucion_remitente: '',
    cite_externo: '',
    referencia: '',
    prioridad: 'NORMAL',
    nro_hojas: 1,
    nro_anexos: 0,
    instruccion: INSTRUCCIONES_SUGERIDAS[0],
    proveido_inicial: '',
    // Destinatario institucional DBNotasCMS
    cod_u_destino: '',
    cod_cargo_destino: '',
    ci_empleado_destino: '',
    destinatario_nombre: '',
    destinatario_cargo: '',
    destinatario_unidad: ''
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Modal de Hoja de Ruta generada
  const [emittedTramite, setEmittedTramite] = useState(null);
  const [showEmittedModal, setShowEmittedModal] = useState(false);

  // Historial de la jornada
  const [historialTramites, setHistorialTramites] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Cargar tipos de trámite externos (tipo_categoria = 'CORRESPONDENCIA')
  useEffect(() => {
    loadTiposExternos();
    loadHistorial();
  }, []);

  const loadTiposExternos = async () => {
    setLoadingTipos(true);
    try {
      const res = await tiposProcesoService.getAll({
        tipo_categoria: 'CORRESPONDENCIA',
        activo: 'activos'
      });
      const list = Array.isArray(res) ? res : (res?.data || []);
      setTiposExternos(list);

      // Preseleccionar el primer tipo disponible (usualmente CM)
      if (list.length > 0 && !formData.tipo_proceso_id) {
        const defaultTipo = list.find(t => t.codigo === 'CM') || list[0];
        handleSelectTipo(defaultTipo.id, defaultTipo);
      }
    } catch (err) {
      console.error('Error cargando tipos de trámites externos:', err);
      setFormError('No se pudieron cargar los tipos de correspondencia externa.');
    } finally {
      setLoadingTipos(false);
    }
  };

  const loadHistorial = async () => {
    setLoadingHistorial(true);
    try {
      const res = await tramitesService.getAll({
        limit: 30
      });
      const list = Array.isArray(res) ? res : (res?.data || []);
      setHistorialTramites(list);
    } catch (err) {
      console.error('Error cargando historial de ventanilla:', err);
    } finally {
      setLoadingHistorial(false);
    }
  };

  // 2. Manejo de selección de tipo y carga de correlativo en tiempo real
  const handleSelectTipo = async (tipoId, tipoObj) => {
    setFormData(prev => ({ ...prev, tipo_proceso_id: tipoId }));
    setLoadingPreview(true);
    try {
      const res = await tramitesService.getNextCorrelativo(tipoId);
      const data = res?.data || res;
      setCorrelativoPreview(data?.numero_correlativo || '');
    } catch (err) {
      console.error('Error al obtener previsualización de correlativo:', err);
      const code = tipoObj?.codigo || 'CORR';
      setCorrelativoPreview(`${code}-.../${new Date().getFullYear()}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  // 3. Manejo de cambios en selectores de unidad y cargo institucional (DBNotasCMS)
  const handleUnidadChange = (codU, unidadObj) => {
    setFormData(prev => ({
      ...prev,
      cod_u_destino: codU,
      destinatario_unidad: unidadObj ? unidadObj.NombU || unidadObj.nombU : '',
      // Reiniciar cargo y funcionario dependientes
      cod_cargo_destino: '',
      destinatario_cargo: '',
      ci_empleado_destino: '',
      destinatario_nombre: ''
    }));
  };

  const handleCargoChange = (codCargo, cargoObj) => {
    setFormData(prev => ({
      ...prev,
      cod_cargo_destino: codCargo,
      destinatario_cargo: cargoObj ? cargoObj.NombreC || cargoObj.nombreC : ''
    }));
  };

  // 4. Manejo de selección de funcionario desde padrón TEmpleados
  const handleSelectEmpleado = (emp) => {
    if (!emp) return;
    const fullName = `${emp.nombres || emp.Nombres || ''} ${emp.apellidos || emp.Apellidos || ''}`.trim();
    setFormData(prev => ({
      ...prev,
      ci_empleado_destino: emp.ci || emp.CI || '',
      destinatario_nombre: fullName
    }));
  };

  // 5. Envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.tipo_proceso_id) {
      setFormError('Debe seleccionar el tipo de trámite externo.');
      return;
    }
    if (!formData.remitente.trim()) {
      setFormError('El nombre de la persona o representante remitente es obligatorio.');
      return;
    }
    if (!formData.referencia.trim()) {
      setFormError('La referencia o síntesis del documento es obligatoria.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tipo_proceso_id: parseInt(formData.tipo_proceso_id, 10),
        remitente: formData.remitente.trim(),
        institucion_remitente: formData.institucion_remitente.trim() || null,
        cite_externo: formData.cite_externo.trim() || null,
        referencia: formData.referencia.trim(),
        prioridad: formData.prioridad,
        nro_hojas: parseInt(formData.nro_hojas, 10) || 1,
        nro_anexos: parseInt(formData.nro_anexos, 10) || 0,
        instruccion: formData.instruccion.trim() || null,
        proveido_inicial: formData.proveido_inicial.trim() || null,
        cod_u_destino: formData.cod_u_destino ? parseInt(formData.cod_u_destino, 10) : null,
        cod_cargo_destino: formData.cod_cargo_destino ? parseInt(formData.cod_cargo_destino, 10) : null,
        ci_empleado_destino: formData.ci_empleado_destino ? parseInt(formData.ci_empleado_destino, 10) : null,
        destinatario_nombre: formData.destinatario_nombre.trim() || null,
        destinatario_cargo: formData.destinatario_cargo.trim() || null,
        destinatario_unidad: formData.destinatario_unidad.trim() || null
      };

      const res = await tramitesService.create(payload);
      const created = res?.data || res;

      // Mostrar modal de Hoja de Ruta emitida
      setEmittedTramite(created);
      setShowEmittedModal(true);

      // Refrescar historial y actualizar siguiente correlativo
      loadHistorial();
      const currentTipo = tiposExternos.find(t => t.id === payload.tipo_proceso_id);
      handleSelectTipo(payload.tipo_proceso_id, currentTipo);

      // Limpiar datos transaccionales del formulario pero conservar tipo y preferencias
      setFormData(prev => ({
        ...prev,
        remitente: '',
        institucion_remitente: '',
        cite_externo: '',
        referencia: '',
        nro_hojas: 1,
        nro_anexos: 0,
        proveido_inicial: ''
      }));

    } catch (err) {
      console.error('Error al emitir trámite externo:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Error al emitir la Hoja de Ruta.';
      setFormError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleVerHojaRuta = async (id) => {
    try {
      const res = await tramitesService.getById(id);
      setEmittedTramite(res?.data || res);
      setShowEmittedModal(true);
    } catch (err) {
      alert('No se pudo cargar el detalle del trámite.');
    }
  };

  // Filtrado de historial
  const filteredHistorial = historialTramites.filter(t => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (t.numero_correlativo && t.numero_correlativo.toLowerCase().includes(term)) ||
      (t.remitente && t.remitente.toLowerCase().includes(term)) ||
      (t.referencia && t.referencia.toLowerCase().includes(term)) ||
      (t.tipo_proceso_nombre && t.tipo_proceso_nombre.toLowerCase().includes(term))
    );
  });

  const selectedTipoObj = tiposExternos.find(t => t.id === parseInt(formData.tipo_proceso_id, 10));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* 1. ENCABEZADO INSTITUCIONAL DE VENTANILLA */}
      <div
        className="card"
        style={{
          borderTop: '5px solid #800000',
          padding: '1.5rem 2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '8px',
                background: '#800000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 4px 10px rgba(128, 0, 0, 0.25)'
              }}
            >
              <Inbox size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-sucre" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                  VENTANILLA ÚNICA Y DESPACHOS MUNICIPALES
                </span>
                <span className="badge" style={{ background: '#1B365D', color: 'white', fontSize: '0.72rem' }}>
                  CORRESPONDENCIA EXTERNA
                </span>
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1B365D', margin: 0 }}>
                Recepción y Emisión de Hojas de Ruta Externas
              </h1>
            </div>
          </div>

          {/* Operador de turno y hora */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'right', borderRight: '1px solid #E5E7EB', paddingRight: '15px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6C757D', textTransform: 'uppercase', fontWeight: 600 }}>
                Operador Activo
              </div>
              <div style={{ fontWeight: 700, color: '#1B365D', fontSize: '0.9rem' }}>
                {currentUser?.login || 'Operador Ventanilla'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#800000', fontWeight: 700, fontSize: '0.88rem' }}>
              <Clock size={16} />
              <span>Gestión {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación del Módulo */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'nuevo' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab('nuevo')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            <span>Emitir Nueva Hoja de Ruta</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'historial' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => { setActiveTab('historial'); loadHistorial(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FileText size={16} />
            <span>Correspondencias Recepcionadas ({historialTramites.length})</span>
          </button>
        </div>
      </div>

      {/* 2. PESTAÑA: EMITIR NUEVA HOJA DE RUTA */}
      {activeTab === 'nuevo' && (
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={20} />
              <span>{formError}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem' }}>
            {/* COLUMNA IZQUIERDA: FORMULARIO PRINCIPAL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* BLOQUE 1: TIPO DE TRÁMITE EXTERNO */}
              <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #800000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <Tag size={18} color="#800000" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1B365D', margin: 0 }}>
                    1. Clasificación de Correspondencia Oficial Externa
                  </h3>
                </div>

                {loadingTipos ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#6C757D' }}>
                    <RefreshCw size={20} className="spinning" style={{ marginRight: '8px' }} />
                    Cargando catálogo oficial de trámites externos...
                  </div>
                ) : (
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Seleccione el Tipo de Trámite / Libro de Ruta Oficial: <span style={{ color: '#800000' }}>*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '1rem' }}>
                      {tiposExternos.map(t => {
                        const isSelected = parseInt(formData.tipo_proceso_id, 10) === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleSelectTipo(t.id, t)}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '6px',
                              border: isSelected ? '2px solid #800000' : '1px solid #D1D5DB',
                              background: isSelected ? 'var(--color-primary-sucre-light, #FFF8F8)' : 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? '0 2px 8px rgba(128, 0, 0, 0.15)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 800, color: '#800000', fontSize: '0.95rem' }}>
                                {t.codigo}
                              </span>
                              <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                                {t.tiempo_estimado_horas}h SLA
                              </span>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1B365D', marginBottom: '4px' }}>
                              {t.nombre}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#6C757D', lineHeight: 1.3 }}>
                              {t.descripcion || 'Sin descripción'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* BLOQUE 2: REMITENTE EXTERNO */}
              <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #1B365D' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <User size={18} color="#1B365D" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1B365D', margin: 0 }}>
                    2. Procedencia y Remitente Externo
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Institución / Empresa / Procedencia:
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: Ministerio de Planificación, Junta Vecinal, Particular"
                      value={formData.institucion_remitente}
                      onChange={e => setFormData({ ...formData, institucion_remitente: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      CITE / Nro. de Oficio de Origen:
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: CITE-MPD-042/2026 o Carta S/N"
                      value={formData.cite_externo}
                      onChange={e => setFormData({ ...formData, cite_externo: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Nombre del Remitente o Representante Legal: <span style={{ color: '#800000' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nombre completo de la persona que remite o firma la nota"
                    required
                    value={formData.remitente}
                    onChange={e => setFormData({ ...formData, remitente: e.target.value })}
                  />
                </div>
              </div>

              {/* BLOQUE 3: ASUNTO Y DOCUMENTACIÓN */}
              <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #800000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <FileText size={18} color="#800000" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1B365D', margin: 0 }}>
                    3. Asunto, Hojas y Nivel de Prioridad
                  </h3>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Referencia / Síntesis del Documento: <span style={{ color: '#800000' }}>*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Escriba claramente el motivo o síntesis del trámite o solicitud ingresada..."
                    required
                    value={formData.referencia}
                    onChange={e => setFormData({ ...formData, referencia: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Nro. de Fojas / Hojas: <span style={{ color: '#800000' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={formData.nro_hojas}
                      onChange={e => setFormData({ ...formData, nro_hojas: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Nro. de Anexos / Copias:
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={formData.nro_anexos}
                      onChange={e => setFormData({ ...formData, nro_anexos: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Prioridad Institucional:
                    </label>
                    <select
                      className="form-select"
                      value={formData.prioridad}
                      onChange={e => setFormData({ ...formData, prioridad: e.target.value })}
                    >
                      <option value="NORMAL">Normal (Según SLA)</option>
                      <option value="ALTA">Alta Prioridad</option>
                      <option value="URGENTE">Urgente (Atención Inmediata)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* BLOQUE 4: DESTINATARIO INSTITUCIONAL (DBNotasCMS) */}
              <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #1B365D' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={18} color="#1B365D" />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1B365D', margin: 0 }}>
                      4. Asignación y Destinatario Institucional (DBNotasCMS)
                    </h3>
                  </div>
                  <span className="badge badge-sucre" style={{ fontSize: '0.72rem' }}>
                    TUnidad / TCargo / TEmpleados
                  </span>
                </div>

                <p style={{ fontSize: '0.82rem', color: '#6C757D', marginBottom: '1rem' }}>
                  Indique la unidad organizacional y cargo municipal que debe atender y recibir este trámite oficial.
                </p>

                {/* Cascada de Unidad y Cargo */}
                <InstitucionalSelectors
                  selectedCodU={formData.cod_u_destino}
                  onUnidadChange={handleUnidadChange}
                  selectedCodCargo={formData.cod_cargo_destino}
                  onCargoChange={handleCargoChange}
                  showBadges={false}
                />

                {/* Buscador de Funcionario desde TEmpleados */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed #E5E7EB' }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserCheck size={16} color="#800000" />
                    <span>Funcionario Asignado (Padrón TEmpleados por CI o Nombre):</span>
                  </label>
                  <EmpleadoSearchAutocomplete
                    currentCi={formData.ci_empleado_destino}
                    onSelectEmpleado={handleSelectEmpleado}
                  />

                  {formData.destinatario_nombre && (
                    <div style={{ marginTop: '10px', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px 14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                          Funcionario Destinatario Seleccionado
                        </div>
                        <div style={{ fontWeight: 700, color: '#15803D', fontSize: '0.92rem' }}>
                          {formData.destinatario_nombre} {formData.ci_empleado_destino ? `(CI: ${formData.ci_empleado_destino})` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => setFormData({ ...formData, ci_empleado_destino: '', destinatario_nombre: '' })}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* BLOQUE 5: PROVEÍDO INICIAL E INSTRUCCIÓN */}
              <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #800000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <Send size={18} color="#800000" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1B365D', margin: 0 }}>
                    5. Instrucción Municipal y Proveído Inicial de Recepción
                  </h3>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Instrucción / Decreto Estándar de Despacho:
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {INSTRUCCIONES_SUGERIDAS.map((inst, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        style={{
                          fontSize: '0.75rem',
                          background: formData.instruccion === inst ? '#1B365D' : 'white',
                          color: formData.instruccion === inst ? 'white' : '#1B365D',
                          borderColor: '#1B365D'
                        }}
                        onClick={() => setFormData({ ...formData, instruccion: inst })}
                      >
                        {inst}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.instruccion}
                    onChange={e => setFormData({ ...formData, instruccion: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Observaciones o Proveído Adicional de Ventanilla:
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Instrucciones específicas, detalle de sobres cerrados, cd anexos u observaciones de recepción..."
                    value={formData.proveido_inicial}
                    onChange={e => setFormData({ ...formData, proveido_inicial: e.target.value })}
                  />
                </div>
              </div>

            </div>

            {/* COLUMNA DERECHA: TARJETA DE RESUMEN Y BOTÓN DE EMISIÓN */}
            <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignSelf: 'start' }}>
              
              {/* TARJETA CORRELATIVO EN VIVO */}
              <div
                className="card"
                style={{
                  padding: '1.5rem',
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF8F8 100%)',
                  borderTop: '5px solid #800000',
                  boxShadow: '0 4px 15px rgba(128, 0, 0, 0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Hash size={18} color="#800000" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#800000', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Hoja de Ruta Institucional
                  </span>
                </div>

                <div
                  style={{
                    background: '#1B365D',
                    color: 'white',
                    padding: '1rem',
                    borderRadius: '6px',
                    textAlign: 'center',
                    marginBottom: '1rem'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase' }}>
                    Correlativo Asignado
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '1px' }}>
                    {loadingPreview ? (
                      <span style={{ fontSize: '1rem', opacity: 0.7 }}>Calculando...</span>
                    ) : (
                      correlativoPreview || '---'
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#93C5FD', marginTop: '2px' }}>
                    {selectedTipoObj?.nombre || 'Tipo de Trámite Externo'}
                  </div>
                </div>

                {/* Resumen de Datos Clave */}
                <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px', color: '#4B5563', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
                    <span>Plazo de Respuesta:</span>
                    <strong style={{ color: '#1B365D' }}>{selectedTipoObj?.tiempo_estimado_horas || 24} Horas</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
                    <span>Fojas / Anexos:</span>
                    <strong style={{ color: '#1B365D' }}>{formData.nro_hojas} hojas / {formData.nro_anexos} anexos</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
                    <span>Prioridad:</span>
                    <strong style={{ color: formData.prioridad === 'URGENTE' ? '#DC2626' : '#1B365D' }}>
                      {formData.prioridad}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span>Destino Oficial:</span>
                    <strong style={{ color: '#1B365D', textAlign: 'right', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formData.destinatario_unidad || 'Sin asignar'}
                    </strong>
                  </div>
                </div>

                {/* BOTÓN PRINCIPAL DE EMISIÓN */}
                <button
                  type="submit"
                  disabled={saving || loadingTipos}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 12px rgba(128, 0, 0, 0.25)'
                  }}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={18} className="spinning" />
                      <span>Emitiendo Hoja de Ruta...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Emitir Hoja de Ruta</span>
                    </>
                  )}
                </button>

                <p style={{ fontSize: '0.72rem', color: '#6C757D', textAlign: 'center', marginTop: '10px', marginBottom: 0 }}>
                  Al emitir se asignará el correlativo oficial y se generará el comprobante de recepción para el ciudadano.
                </p>
              </div>

              {/* Resumen de Trámites de Hoy */}
              <div className="card" style={{ padding: '1rem 1.25rem', background: '#F8FAFC' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1B365D', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="#15803D" />
                  <span>Seguridad y Validez Oficial</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.4 }}>
                  Cada Hoja de Ruta registrada en Ventanilla Única cuenta con correlativo protegido y trazabilidad histórica auditada en SQL Server (DBNotasCMS).
                </div>
              </div>

            </div>
          </div>
        </form>
      )}

      {/* 3. PESTAÑA: HISTORIAL DE CORRESPONDENCIAS RECEPCIONADAS */}
      {activeTab === 'historial' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1B365D', margin: 0 }}>
                Libro Diario de Recepciones en Ventanilla Única
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#6C757D', margin: '2px 0 0 0' }}>
                Hojas de Ruta externas emitidas en la gestión institucional {new Date().getFullYear()}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6C757D' }} />
                <input
                  type="text"
                  className="form-control form-control-sm"
                  style={{ paddingLeft: '32px' }}
                  placeholder="Buscar por correlativo o remitente..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={loadHistorial}
                title="Actualizar libro diario"
              >
                <RefreshCw size={14} className={loadingHistorial ? 'spinning' : ''} />
              </button>
            </div>
          </div>

          {loadingHistorial ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6C757D' }}>
              <RefreshCw size={24} className="spinning" style={{ marginBottom: '8px' }} />
              <div>Cargando libro de correspondencias recepcionadas...</div>
            </div>
          ) : filteredHistorial.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#F9FAFB', borderRadius: '8px' }}>
              <Inbox size={36} color="#9CA3AF" style={{ marginBottom: '10px' }} />
              <div style={{ fontWeight: 600, color: '#4B5563' }}>No se encontraron correspondencias recepcionadas.</div>
              <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 1rem 0' }}>
                Utilice la pestaña "Emitir Nueva Hoja de Ruta" para ingresar el primer trámite externo.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setActiveTab('nuevo')}
              >
                <Plus size={14} />
                <span>Registrar Trámite Ahora</span>
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Hoja de Ruta</th>
                    <th>Tipo</th>
                    <th>Remitente / Procedencia</th>
                    <th>Referencia</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Fecha Ingreso</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistorial.map(t => (
                    <tr key={t.id}>
                      <td>
                        <strong style={{ color: '#800000', fontSize: '0.92rem' }}>
                          {t.numero_correlativo}
                        </strong>
                      </td>
                      <td>
                        <span className="badge" style={{ background: '#F1F5F9', color: '#1B365D', fontWeight: 600 }}>
                          {t.tipo_proceso_nombre || 'Correspondencia'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1B365D', fontSize: '0.88rem' }}>
                          {t.remitente}
                        </div>
                      </td>
                      <td>
                        <div style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }} title={t.referencia}>
                          {t.referencia}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6C757D' }}>
                          {t.nro_hojas} fojas {t.nro_anexos > 0 ? `| ${t.nro_anexos} anexos` : ''}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${t.prioridad === 'URGENTE' ? 'badge-danger' : t.prioridad === 'ALTA' ? 'badge-warning' : 'badge-secondary'}`}>
                          {t.prioridad}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-success">
                          {t.estado}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#4B5563' }}>
                        {t.fecha_creacion ? new Date(t.fecha_creacion).toLocaleDateString() : '---'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          style={{ padding: '4px 8px' }}
                          title="Ver Comprobante de Hoja de Ruta"
                          onClick={() => handleVerHojaRuta(t.id)}
                        >
                          <Eye size={14} />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. MODAL: HOJA DE RUTA EMITIDA / COMPROBANTE DE VENTANILLA */}
      {showEmittedModal && emittedTramite && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowEmittedModal(false); }}>
          <div className="modal-dialog" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#800000', color: 'white', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={24} color="#86EFAC" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'white' }}>
                    Hoja de Ruta Emitida Exitosamente
                  </h3>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                    Gobierno Autónomo Municipal de Sucre — Comprobante Oficial
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmittedModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.75rem' }} id="printable-hoja-ruta">
              {/* Tarjeta del Correlativo Oficial */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '2px dashed #1B365D',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  textAlign: 'center',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                  NÚMERO CORRELATIVO INSTITUCIONAL
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#800000', margin: '4px 0', letterSpacing: '1px' }}>
                  {emittedTramite.numero_correlativo}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#1B365D', fontWeight: 600 }}>
                  {emittedTramite.tipo_proceso_nombre || 'Correspondencia Externa'} ({emittedTramite.gestion})
                </div>
              </div>

              {/* Detalle en Cuadrícula Institucional */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#F9FAFB', padding: '10px 12px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>
                    Remitente
                  </div>
                  <div style={{ fontWeight: 700, color: '#1B365D' }}>
                    {emittedTramite.remitente}
                  </div>
                  {emittedTramite.institucion_remitente && (
                    <div style={{ fontSize: '0.78rem', color: '#4B5563' }}>
                      {emittedTramite.institucion_remitente}
                    </div>
                  )}
                  {emittedTramite.cite_externo && (
                    <div style={{ fontSize: '0.75rem', color: '#800000', fontWeight: 600 }}>
                      CITE: {emittedTramite.cite_externo}
                    </div>
                  )}
                </div>

                <div style={{ background: '#F9FAFB', padding: '10px 12px', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>
                    Destinatario Oficial
                  </div>
                  <div style={{ fontWeight: 700, color: '#1B365D' }}>
                    {emittedTramite.destinatario_nombre || 'Despacho Municipal'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#4B5563' }}>
                    {emittedTramite.destinatario_cargo || 'Autoridad Competente'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#800000', fontWeight: 600 }}>
                    {emittedTramite.destinatario_unidad || 'Ventanilla Central'}
                  </div>
                </div>
              </div>

              {/* Referencia y Fojas */}
              <div style={{ background: '#F9FAFB', padding: '10px 12px', borderRadius: '4px', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>
                  Referencia / Asunto
                </div>
                <div style={{ fontWeight: 600, color: '#1F2937', marginTop: '2px' }}>
                  {emittedTramite.referencia}
                </div>
                <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#4B5563', display: 'flex', gap: '15px' }}>
                  <span><strong>Fojas:</strong> {emittedTramite.nro_hojas}</span>
                  <span><strong>Anexos:</strong> {emittedTramite.nro_anexos}</span>
                  <span><strong>Prioridad:</strong> {emittedTramite.prioridad}</span>
                </div>
              </div>

              {/* Proveído / Instrucción inicial */}
              {emittedTramite.instruccion && (
                <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', padding: '10px 12px', borderRadius: '4px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#92400E', textTransform: 'uppercase', fontWeight: 800 }}>
                    Decreto / Instrucción de Despacho
                  </div>
                  <div style={{ color: '#78350F', fontWeight: 600, marginTop: '2px' }}>
                    {emittedTramite.instruccion}
                  </div>
                </div>
              )}

              {/* Metadatos de recepción */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6B7280', borderTop: '1px solid #E5E7EB', paddingTop: '10px' }}>
                <span>Fecha de Emisión: {emittedTramite.fecha_creacion ? new Date(emittedTramite.fecha_creacion).toLocaleString() : '---'}</span>
                <span>Plazo Límite: {emittedTramite.fecha_limite_respuesta ? new Date(emittedTramite.fecha_limite_respuesta).toLocaleDateString() : 'Según SLA'}</span>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '1rem 1.5rem', background: '#F9FAFB', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowEmittedModal(false)}
              >
                Cerrar
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Printer size={15} />
                  <span>Imprimir Comprobante</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setShowEmittedModal(false);
                    setActiveTab('nuevo');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={15} />
                  <span>Registrar Otro Trámite</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
