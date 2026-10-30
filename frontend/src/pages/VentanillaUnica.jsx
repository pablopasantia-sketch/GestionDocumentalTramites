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
  UserCheck,
  Paperclip,
  Download,
  ExternalLink,
  Lock,
  Unlock,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { tramitesService, tiposProcesoService, adjuntosService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import InstitucionalSelectors from '../components/institucional/InstitucionalSelectors';
import EmpleadoSearchAutocomplete from '../components/institucional/EmpleadoSearchAutocomplete';
import PdfUploader from '../components/common/PdfUploader';
import HojaDeRutaModal from '../components/tramites/HojaDeRutaModal';

export const CANALES_CMS = {
  EXTERNA: {
    id: 'EXTERNA',
    tipoCorres: 'EXTERNA',
    label: 'Trámites Externos',
    titulo: 'Canal Político-Legislativo (Trámites Externos)',
    badge: 'CANAL POLÍTICO-LEGISLATIVO',
    color: '#800000',
    colorBg: '#FFF5F5',
    colorBorder: '#FECACA',
    descripcion: 'Correspondencia ingresada por ciudadanos, juntas vecinales, instituciones y Alcalde Municipal.',
    circuitoTexto: 'Sugerencia oficial CMS: Remisión a Presidencia del Concejo Municipal para análisis político y asignación a comisiones permanentes.',
    destinatarioDefault: {
      cod_u: 1,
      unidad: 'Presidencia del Concejo Municipal',
      cod_cargo: 1,
      cargo: 'Presidente del Concejo Municipal',
      ci_empleado: '1000002',
      nombre: 'JUAN PABLO CERVANTES ZAMBRANA',
      instruccion: 'Para su análisis y asignación a Comisiones del Concejo Municipal de Sucre.'
    }
  }
};

export default function VentanillaUnica() {
  const { user: currentUser } = useAuth();

  // Estados de control
  const [activeTab, setActiveTab] = useState('nuevo'); // 'nuevo' | 'historial'
  const [canalActivo, setCanalActivo] = useState('EXTERNA');
  const [esDestinoExcepcional, setEsDestinoExcepcional] = useState(false);
  const [tiposExternos, setTiposExternos] = useState([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [correlativoPreview, setCorrelativoPreview] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Formulario de emisión con preselección oficial CMS
  const [formData, setFormData] = useState({
    tipo_proceso_id: '',
    remitente: '',
    institucion_remitente: '',
    cite_externo: '',
    referencia: '',
    prioridad: 'NORMAL',
    tipo_corres: 'EXTERNA',
    nro_hojas: 1,
    nro_anexos: 0,
    instruccion: CANALES_CMS.EXTERNA.destinatarioDefault.instruccion,
    proveido_inicial: '',
    // Destinatario institucional DB_TRAMITES_EXTERNOS
    cod_u_destino: CANALES_CMS.EXTERNA.destinatarioDefault.cod_u,
    cod_cargo_destino: CANALES_CMS.EXTERNA.destinatarioDefault.cod_cargo,
    ci_empleado_destino: CANALES_CMS.EXTERNA.destinatarioDefault.ci_empleado,
    destinatario_nombre: CANALES_CMS.EXTERNA.destinatarioDefault.nombre,
    destinatario_cargo: CANALES_CMS.EXTERNA.destinatarioDefault.cargo,
    destinatario_unidad: CANALES_CMS.EXTERNA.destinatarioDefault.unidad
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [attachedPdfs, setAttachedPdfs] = useState([]);

  // Modal de éxito post-registro
  const [emittedTramite, setEmittedTramite] = useState(null);
  const [showEmittedModal, setShowEmittedModal] = useState(false);

  // Modal Hoja de Ruta
  const [hojaDeRutaOpen, setHojaDeRutaOpen] = useState(false);

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
        limit: 50
      });
      const list = Array.isArray(res) ? res : (res?.data || []);
      setHistorialTramites(list);
    } catch (err) {
      console.error('Error cargando historial de ventanilla:', err);
    } finally {
      setLoadingHistorial(false);
    }
  };

  // -------------------------------------------------------------
  // MÓDULO ADMINISTRACIÓN: BLOQUEAR / DESBLOQUEAR PROCESOS (RF-11 / SPRINT 4)
  // -------------------------------------------------------------
  const [bloqueoTramites, setBloqueoTramites] = useState([]);
  const [loadingBloqueo, setLoadingBloqueo] = useState(false);
  const [bloqueoSearchTerm, setBloqueoSearchTerm] = useState('');
  const [bloqueoEstadoFilter, setBloqueoEstadoFilter] = useState('TODOS'); // 'TODOS' | 'ACTIVOS' | 'BLOQUEADOS'
  const [bloqueoFeedback, setBloqueoFeedback] = useState(null);

  // Modal Bloquear
  const [bloquearModalOpen, setBloquearModalOpen] = useState(false);
  const [tramiteABloquear, setTramiteABloquear] = useState(null);
  const [motivoBloqueo, setMotivoBloqueo] = useState('');
  const [bloquearLoading, setBloquearLoading] = useState(false);
  const [bloquearError, setBloquearError] = useState(null);

  // Modal Desbloquear
  const [desbloquearModalOpen, setDesbloquearModalOpen] = useState(false);
  const [tramiteADesbloquear, setTramiteADesbloquear] = useState(null);
  const [motivoDesbloqueo, setMotivoDesbloqueo] = useState('');
  const [desbloquearLoading, setDesbloquearLoading] = useState(false);
  const [desbloquearError, setDesbloquearError] = useState(null);

  // Modal Trazabilidad
  const [trazabilidadModalOpen, setTrazabilidadModalOpen] = useState(false);
  const [tramiteTrazabilidad, setTramiteTrazabilidad] = useState(null);
  const [trazabilidadData, setTrazabilidadData] = useState(null);
  const [trazabilidadLoading, setTrazabilidadLoading] = useState(false);

  const loadBloqueoTramites = async () => {
    setLoadingBloqueo(true);
    try {
      const res = await tramitesService.getAll({ limit: 100 });
      const list = Array.isArray(res) ? res : (res?.data || []);
      setBloqueoTramites(list);
    } catch (err) {
      console.error('Error al cargar trámites para bloqueo/desbloqueo:', err);
      setBloqueoFeedback({ type: 'error', message: 'No se pudieron cargar los trámites para gestión de bloqueos.' });
    } finally {
      setLoadingBloqueo(false);
    }
  };

  const showBloqueoMsg = (type, message) => {
    setBloqueoFeedback({ type, message });
    setTimeout(() => setBloqueoFeedback(null), 6000);
  };

  const handleOpenBloquear = (tramite) => {
    setTramiteABloquear(tramite);
    setMotivoBloqueo('');
    setBloquearError(null);
    setBloquearModalOpen(true);
  };

  const handleConfirmBloquear = async (e) => {
    e.preventDefault();
    if (!motivoBloqueo || motivoBloqueo.trim().length < 3) {
      setBloquearError('El motivo o proveído del bloqueo es obligatorio y debe tener al menos 3 caracteres.');
      return;
    }
    setBloquearLoading(true);
    setBloquearError(null);
    try {
      await tramitesService.bloquear(tramiteABloquear.id, motivoBloqueo.trim());
      showBloqueoMsg('success', `El trámite ${tramiteABloquear.numero_correlativo} fue bloqueado temporalmente de forma exitosa.`);
      setBloquearModalOpen(false);
      setTramiteABloquear(null);
      setMotivoBloqueo('');
      loadBloqueoTramites();
      loadHistorial();
    } catch (err) {
      console.error('Error al bloquear trámite:', err);
      setBloquearError(err.response?.data?.message || err.message || 'Error al procesar el bloqueo del trámite.');
    } finally {
      setBloquearLoading(false);
    }
  };

  const handleOpenDesbloquear = (tramite) => {
    setTramiteADesbloquear(tramite);
    setMotivoDesbloqueo('');
    setDesbloquearError(null);
    setDesbloquearModalOpen(true);
  };

  const handleConfirmDesbloquear = async (e) => {
    e.preventDefault();
    if (!motivoDesbloqueo || motivoDesbloqueo.trim().length < 3) {
      setDesbloquearError('El motivo o proveído del desbloqueo es obligatorio y debe tener al menos 3 caracteres.');
      return;
    }
    setDesbloquearLoading(true);
    setDesbloquearError(null);
    try {
      await tramitesService.desbloquear(tramiteADesbloquear.id, motivoDesbloqueo.trim());
      showBloqueoMsg('success', `El trámite ${tramiteADesbloquear.numero_correlativo} fue desbloqueado y reactivado exitosamente.`);
      setDesbloquearModalOpen(false);
      setTramiteADesbloquear(null);
      setMotivoDesbloqueo('');
      loadBloqueoTramites();
      loadHistorial();
    } catch (err) {
      console.error('Error al desbloquear trámite:', err);
      setDesbloquearError(err.response?.data?.message || err.message || 'Error al procesar el desbloqueo del trámite.');
    } finally {
      setDesbloquearLoading(false);
    }
  };

  const handleVerTrazabilidadVentanilla = async (tramite) => {
    setTramiteTrazabilidad(tramite);
    setTrazabilidadData(null);
    setTrazabilidadLoading(true);
    setTrazabilidadModalOpen(true);
    try {
      const res = await tramitesService.getById(tramite.id);
      setTrazabilidadData(res.data || res);
    } catch (err) {
      console.error('Error al cargar trazabilidad:', err);
    } finally {
      setTrazabilidadLoading(false);
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

  // 3. Manejo de cambios de Canal Oficial CMS (Macro-Bifurcación)
  const handleSelectCanal = (canalKey) => {
    setCanalActivo(canalKey);
    const canal = CANALES_CMS[canalKey];
    const def = canal.destinatarioDefault;
    setFormData(prev => ({
      ...prev,
      tipo_corres: canal.tipoCorres,
      cod_u_destino: def.cod_u,
      destinatario_unidad: def.unidad,
      cod_cargo_destino: def.cod_cargo,
      destinatario_cargo: def.cargo,
      ci_empleado_destino: def.ci_empleado || '',
      destinatario_nombre: def.nombre,
      instruccion: def.instruccion
    }));
    setEsDestinoExcepcional(false);
  };

  const handleRestaurarSugerenciaOficial = () => {
    const canal = CANALES_CMS[canalActivo];
    const def = canal.destinatarioDefault;
    setFormData(prev => ({
      ...prev,
      cod_u_destino: def.cod_u,
      destinatario_unidad: def.unidad,
      cod_cargo_destino: def.cod_cargo,
      destinatario_cargo: def.cargo,
      ci_empleado_destino: def.ci_empleado || '',
      destinatario_nombre: def.nombre,
      instruccion: def.instruccion
    }));
    setEsDestinoExcepcional(false);
  };

  // 4. Manejo de cambios en selectores de unidad y cargo institucional (DB_TRAMITES_EXTERNOS)
  const handleUnidadChange = (codU, unidadObj) => {
    const def = CANALES_CMS[canalActivo].destinatarioDefault;
    setEsDestinoExcepcional(codU !== def.cod_u);
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
    const def = CANALES_CMS[canalActivo].destinatarioDefault;
    if (codCargo !== def.cod_cargo) {
      setEsDestinoExcepcional(true);
    }
    setFormData(prev => ({
      ...prev,
      cod_cargo_destino: codCargo,
      destinatario_cargo: cargoObj ? cargoObj.NombreC || cargoObj.nombreC : ''
    }));
  };

  // 5. Manejo de selección de funcionario desde padrón TEmpleados
  const handleSelectEmpleado = (emp) => {
    if (!emp) return;
    const fullName = emp.nombreCompleto || `${emp.nombres || emp.Nombres || ''} ${emp.apellidos || emp.Apellidos || ''}`.trim();
    setEsDestinoExcepcional(true);
    setFormData(prev => ({
      ...prev,
      ci_empleado_destino: emp.ci || emp.CI || '',
      destinatario_nombre: fullName
    }));
  };

  // 6. Envío del formulario
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
        tipo_corres: formData.tipo_corres || canalActivo,
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

      // Subir archivos PDF adjuntos si se seleccionaron
      if (attachedPdfs.length > 0) {
        try {
          const uploadFormData = new FormData();
          attachedPdfs.forEach(file => {
            uploadFormData.append('files', file);
          });
          await adjuntosService.upload(created.id, uploadFormData);
          // Refrescar el detalle con los adjuntos ya registrados
          const fullDetail = await tramitesService.getById(created.id);
          setEmittedTramite(fullDetail?.data || fullDetail);
        } catch (uploadErr) {
          console.error('Error al subir archivos PDF adjuntos:', uploadErr);
          setEmittedTramite(created);
        }
      } else {
        setEmittedTramite(created);
      }

      setShowEmittedModal(true);
      setAttachedPdfs([]);

      // Refrescar historial y actualizar siguiente correlativo
      loadHistorial();
      const currentTipo = tiposExternos.find(t => t.id === payload.tipo_proceso_id);
      handleSelectTipo(payload.tipo_proceso_id, currentTipo);

      // Limpiar datos pero conservar canal y preselección oficial CMS
      const def = CANALES_CMS[canalActivo].destinatarioDefault;
      setFormData(prev => ({
        ...prev,
        remitente: '',
        institucion_remitente: '',
        cite_externo: '',
        referencia: '',
        nro_hojas: 1,
        nro_anexos: 0,
        proveido_inicial: '',
        cod_u_destino: def.cod_u,
        destinatario_unidad: def.unidad,
        cod_cargo_destino: def.cod_cargo,
        destinatario_cargo: def.cargo,
        ci_empleado_destino: def.ci_empleado || '',
        destinatario_nombre: def.nombre,
        instruccion: def.instruccion
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
    const corr = (t.numeroCorrelativo || t.numero_correlativo || '').toLowerCase();
    const rem = (t.remitente || '').toLowerCase();
    const ref = (t.referencia || '').toLowerCase();
    const tipo = (t.tipoProcesoNombre || t.tipo_proceso_nombre || '').toLowerCase();
    return (
      corr.includes(term) ||
      rem.includes(term) ||
      ref.includes(term) ||
      tipo.includes(term)
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span className="badge badge-sucre" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                  VENTANILLA ÚNICA Y DESPACHOS MUNICIPALES
                </span>
                <span className="badge" style={{ background: '#800000', color: 'white', fontSize: '0.72rem' }}>
                  ALCANCE ESTRICTO: TRÁMITES EXTERNOS CMS
                </span>
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1B365D', margin: 0 }}>
                Recepción y Emisión de Hojas de Ruta Externas
              </h1>
              <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '2px' }}>
                Recepción oficial con derivación predeterminada a <strong>Presidencia del CMS</strong> para tratamiento en Comisiones.
              </div>
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
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'bloqueo' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => { setActiveTab('bloqueo'); loadBloqueoTramites(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <ShieldAlert size={16} />
            <span>Bloquear / Desbloquear Procesos</span>
            {bloqueoTramites.filter(t => t.estado === 'BLOQUEADO').length > 0 && (
              <span className="badge" style={{ background: '#DC2626', color: 'white', padding: '1px 6px', fontSize: '0.7rem', borderRadius: '10px' }}>
                {bloqueoTramites.filter(t => t.estado === 'BLOQUEADO').length} Bloqueado(s)
              </span>
            )}
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
                    1. Catálogo Oficial de Trámites Externos CMS
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
                    2. Procedencia y Remitente
                  </h3>
                </div>

                <div>
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

              {/* BLOQUE 4: PROVEÍDO INICIAL E INSTRUCCIÓN */}
              <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #800000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <Send size={18} color="#800000" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1B365D', margin: 0 }}>
                    4. Instrucción Municipal y Proveído Inicial de Recepción
                  </h3>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Instrucción / Decreto Estándar de Despacho:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Instrucciones o Decreto Estándar de Despacho"
                    value={formData.instruccion || ''}
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

              {/* BLOQUE 5: DOCUMENTACIÓN DIGITAL ADJUNTA */}
              <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #1B365D' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Paperclip size={18} color="#1B365D" />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1B365D', margin: 0 }}>
                      5. Documentos Digitales Adjuntos (Archivos PDF de Respaldo)
                    </h3>
                  </div>
                  <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
                    RF-07 • Formato PDF
                  </span>
                </div>

                <p style={{ fontSize: '0.82rem', color: '#6C757D', marginBottom: '1rem' }}>
                  Adjunte los memoriales, antecedentes, cartas escaneadas o documentación digital en formato PDF que acompañan a esta Hoja de Ruta.
                </p>

                <PdfUploader
                  files={attachedPdfs}
                  onFilesChange={setAttachedPdfs}
                  maxFiles={5}
                  maxSizeMB={25}
                  disabled={saving}
                />
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
                    <span>Canal Operativo:</span>
                    <strong style={{ color: CANALES_CMS[canalActivo].color }}>
                      {CANALES_CMS[canalActivo].label}
                    </strong>
                  </div>
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
                  Cada Hoja de Ruta registrada en Ventanilla Única cuenta con correlativo protegido y trazabilidad histórica.
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
                    <th>Canal CMS</th>
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
                          {t.numeroCorrelativo || t.numero_correlativo}
                        </strong>
                      </td>
                      <td>
                        <span className="badge" style={{ background: '#800000', color: 'white', fontSize: '0.7rem' }}>
                          Trámite Externo CMS
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ background: '#F1F5F9', color: '#1B365D', fontWeight: 600 }}>
                          {t.tipoProcesoNombre || t.tipo_proceso_nombre || 'Correspondencia'}
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
                        <div style={{ fontSize: '0.72rem', color: '#6C757D', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          <span>{t.nroHojas ?? t.nro_hojas} fojas {(t.nroAnexos ?? t.nro_anexos) > 0 ? `| ${t.nroAnexos ?? t.nro_anexos} anexos` : ''}</span>
                          {(t.nroAdjuntos ?? t.nro_adjuntos) > 0 && (
                            <span className="badge" style={{ background: '#FEE2E2', color: '#B91C1C', fontSize: '0.68rem', padding: '1px 5px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Paperclip size={10} />
                              {t.nroAdjuntos ?? t.nro_adjuntos} PDF{(t.nroAdjuntos ?? t.nro_adjuntos) > 1 ? 's' : ''}
                            </span>
                          )}
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
                        {(t.fechaCreacion || t.fecha_creacion) ? new Date(t.fechaCreacion || t.fecha_creacion).toLocaleDateString() : '---'}
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

      {/* ------------------------------------------------------------- */}
      {/* 4. PESTAÑA: BLOQUEAR / DESBLOQUEAR PROCESOS (RF-11 / SPRINT 4) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'bloqueo' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          {/* Encabezado Institucional */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-sucre">Sprint 4: Tarea 1</span>
                <span className="badge" style={{ background: '#1B365D', color: 'white' }}>RF-11 Ventanilla Única</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1B365D', margin: '6px 0 2px 0' }}>
                Administración de Procesos: Bloqueo y Desbloqueo Temporal
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: 0, maxWidth: '780px', lineHeight: 1.4 }}>
                Permite a Ventanilla Única suspender temporalmente el curso de un expediente por falta de requisitos, subsanaciones o motivos administrativos, inhabilitando su tramitación operativa hasta su desbloqueo fundamentado.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={loadBloqueoTramites}
                title="Actualizar listado de procesos"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} className={loadingBloqueo ? 'spinning' : ''} />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          {/* Mensaje de Feedback Global */}
          {bloqueoFeedback && (
            <div
              className={`alert ${bloqueoFeedback.type === 'success' ? 'alert-success' : 'alert-danger'}`}
              style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px' }}
            >
              {bloqueoFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{bloqueoFeedback.message}</span>
            </div>
          )}

          {/* Barra de Filtros y Búsqueda */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            background: '#F8FAFC',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #E2E8F0',
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <input
                type="text"
                className="form-control form-control-sm"
                style={{ paddingLeft: '32px' }}
                placeholder="Buscar por correlativo, remitente, referencia o CITE..."
                value={bloqueoSearchTerm}
                onChange={e => setBloqueoSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Filtrar Estado:</span>
              <select
                className="form-select form-select-sm"
                value={bloqueoEstadoFilter}
                onChange={e => setBloqueoEstadoFilter(e.target.value)}
                style={{ width: '180px' }}
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="ACTIVOS">En Atención (Listos)</option>
                <option value="BLOQUEADOS">Bloqueados ⛔</option>
              </select>
            </div>

            <div style={{ fontSize: '0.82rem', color: '#64748B', marginLeft: 'auto' }}>
              Mostrando <strong>{
                bloqueoTramites.filter(t => {
                  if (bloqueoEstadoFilter === 'BLOQUEADOS' && t.estado !== 'BLOQUEADO') return false;
                  if (bloqueoEstadoFilter === 'ACTIVOS' && (t.estado === 'BLOQUEADO' || t.estado === 'CONCLUIDO' || t.estado === 'ANULADO')) return false;
                  if (!bloqueoSearchTerm) return true;
                  const term = bloqueoSearchTerm.toLowerCase();
                  return (t.numero_correlativo || '').toLowerCase().includes(term) ||
                         (t.remitente || '').toLowerCase().includes(term) ||
                         (t.referencia || '').toLowerCase().includes(term) ||
                         (t.cite_externo || '').toLowerCase().includes(term);
                }).length
              }</strong> de {bloqueoTramites.length} trámites
            </div>
          </div>

          {/* Tabla de Procesos y Control de Bloqueo */}
          {loadingBloqueo ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
              <RefreshCw size={24} className="spinning" style={{ marginBottom: '8px' }} />
              <div>Cargando expedientes institucionales...</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover" style={{ fontSize: '0.86rem', verticalAlign: 'middle' }}>
                <thead style={{ background: '#F1F5F9', color: '#1B365D', borderBottom: '2px solid #CBD5E1' }}>
                  <tr>
                    <th style={{ width: '150px' }}>Correlativo</th>
                    <th style={{ width: '140px' }}>Tipo de Proceso</th>
                    <th>Remitente & Asunto</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>Estado</th>
                    <th style={{ width: '170px' }}>Ubicación / Responsable</th>
                    <th style={{ width: '190px', textAlign: 'center' }}>Acciones RF-11</th>
                  </tr>
                </thead>
                <tbody>
                  {bloqueoTramites
                    .filter(t => {
                      if (bloqueoEstadoFilter === 'BLOQUEADOS' && t.estado !== 'BLOQUEADO') return false;
                      if (bloqueoEstadoFilter === 'ACTIVOS' && (t.estado === 'BLOQUEADO' || t.estado === 'CONCLUIDO' || t.estado === 'ANULADO')) return false;
                      if (!bloqueoSearchTerm) return true;
                      const term = bloqueoSearchTerm.toLowerCase();
                      return (t.numero_correlativo || '').toLowerCase().includes(term) ||
                             (t.remitente || '').toLowerCase().includes(term) ||
                             (t.referencia || '').toLowerCase().includes(term) ||
                             (t.cite_externo || '').toLowerCase().includes(term);
                    })
                    .map(t => {
                      const isBloqueado = t.estado === 'BLOQUEADO';
                      const isEnTransito = t.estado === 'POR_RECIBIR' || t.estado === 'EN_TRANSITO';
                      const isConcluidoOAnulado = t.estado === 'CONCLUIDO' || t.estado === 'ANULADO';

                      return (
                        <tr key={t.id} style={{ background: isBloqueado ? '#FEF2F2' : 'transparent' }}>
                          <td>
                            <strong style={{ color: '#800000', fontSize: '0.92rem' }}>
                              {t.numero_correlativo}
                            </strong>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              Gestión {t.gestion}
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-outline" style={{ fontSize: '0.74rem' }}>
                              {t.tipo_proceso_nombre || 'Correspondencia'}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#1B365D' }}>{t.remitente}</div>
                            <div style={{
                              color: '#475569',
                              fontSize: '0.8rem',
                              maxWidth: '340px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }} title={t.referencia}>
                              {t.referencia}
                            </div>
                            {isBloqueado && t.motivo_bloqueo && (
                              <div style={{
                                marginTop: '4px',
                                background: '#FEE2E2',
                                border: '1px solid #FCA5A5',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '0.76rem',
                                color: '#991B1B'
                              }}>
                                <strong>Motivo de Bloqueo:</strong> {t.motivo_bloqueo}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isBloqueado ? (
                              <span className="badge" style={{ background: '#DC2626', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}>
                                <Lock size={12} />
                                <span>BLOQUEADO</span>
                              </span>
                            ) : isEnTransito ? (
                              <span className="badge" style={{ background: '#F59E0B', color: 'white', padding: '4px 8px' }}>
                                🚚 EN TRÁNSITO
                              </span>
                            ) : isConcluidoOAnulado ? (
                              <span className="badge" style={{ background: '#64748B', color: 'white', padding: '4px 8px' }}>
                                {t.estado}
                              </span>
                            ) : (
                              <span className="badge" style={{ background: '#10B981', color: 'white', padding: '4px 8px' }}>
                                EN ATENCIÓN
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1F2937' }}>
                              {t.usuario_actual_nombre || t.usuario_actual || 'Sin asignar'}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                              {t.ubicacion_actual_nombre || t.ubicacion_actual || 'Ventanilla Única'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              {/* Botón Bloquear o Desbloquear */}
                              {isBloqueado ? (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={() => handleOpenDesbloquear(t)}
                                  style={{
                                    background: '#15803D',
                                    color: 'white',
                                    border: 'none',
                                    padding: '4px 10px',
                                    fontSize: '0.78rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: 700
                                  }}
                                  title="Desbloquear y reactivar este trámite"
                                >
                                  <Unlock size={14} />
                                  <span>Desbloquear</span>
                                </button>
                              ) : isEnTransito ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  disabled
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', opacity: 0.6 }}
                                  title="No se puede bloquear mientras esté en tránsito digital sin recepcionar (RF-11.1)"
                                >
                                  <Lock size={12} />
                                  <span>En Tránsito</span>
                                </button>
                              ) : isConcluidoOAnulado ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  disabled
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', opacity: 0.6 }}
                                  title="Los trámites concluidos o anulados no admiten bloqueo"
                                >
                                  Finalizado
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={() => handleOpenBloquear(t)}
                                  style={{
                                    background: '#800000',
                                    color: 'white',
                                    border: 'none',
                                    padding: '4px 10px',
                                    fontSize: '0.78rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: 700
                                  }}
                                  title="Bloquear temporalmente este proceso"
                                >
                                  <Lock size={14} />
                                  <span>Bloquear</span>
                                </button>
                              )}

                              {/* Botón Ver Trazabilidad */}
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => handleVerTrazabilidadVentanilla(t)}
                                style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="Ver trazabilidad completa de movimientos"
                              >
                                <Eye size={13} />
                                <span>Historial</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                  {bloqueoTramites.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                        No hay trámites disponibles para administración en esta gestión.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: BLOQUEAR PROCESO DE NEGOCIO (RF-11.1, RF-11.2)        */}
      {/* ------------------------------------------------------------- */}
      {bloquearModalOpen && tramiteABloquear && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !bloquearLoading) setBloquearModalOpen(false); }}>
          <div className="modal-dialog" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#800000', color: 'white', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Lock size={22} color="#FCA5A5" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'white' }}>
                    Bloquear Proceso de Negocio
                  </h3>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                    Ventanilla Única — Restricción Operativa Temporal (RF-11)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !bloquearLoading && setBloquearModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmBloquear}>
              <div className="modal-body" style={{ padding: '1.5rem' }}>
                {/* Cuadro Resumen del Trámite */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px 14px', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>EXPEDIENTE A BLOQUEAR</span>
                    <strong style={{ fontSize: '1.1rem', color: '#800000' }}>{tramiteABloquear.numero_correlativo}</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#1B365D', fontWeight: 600 }}>
                    {tramiteABloquear.remitente}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                    {tramiteABloquear.referencia}
                  </div>
                </div>

                {/* Advertencia Institucional */}
                <div style={{
                  background: '#FFFBEB',
                  border: '1px solid #FCD34D',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  marginBottom: '1.25rem',
                  fontSize: '0.82rem',
                  color: '#92400E',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Efecto Normativo:</strong> Al confirmar el bloqueo, el expediente quedará inhabilitado para avanzar, derivar, retroceder o concluir por parte de cualquier funcionario del Concejo Municipal hasta su desbloqueo expreso.
                  </div>
                </div>

                {/* Campo de Motivo Obligatorio */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1B365D', marginBottom: '6px', display: 'block' }}>
                    Motivo / Proveído del Bloqueo <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    required
                    placeholder="Escriba detalladamente el motivo o fundamento del bloqueo administrativo (ej. Por falta de documentación de respaldo, observación de planos, solicitud expresa de la comisión)..."
                    value={motivoBloqueo}
                    onChange={e => setMotivoBloqueo(e.target.value)}
                    style={{ fontSize: '0.88rem' }}
                    disabled={bloquearLoading}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '4px' }}>
                    Este motivo quedará asentado en el historial inmutable de movimientos de auditoría.
                  </div>
                </div>

                {bloquearError && (
                  <div className="alert alert-danger" style={{ fontSize: '0.85rem', padding: '8px 12px' }}>
                    {bloquearError}
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ padding: '1rem 1.5rem', background: '#F9FAFB', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setBloquearModalOpen(false)}
                  disabled={bloquearLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-sm"
                  disabled={bloquearLoading || !motivoBloqueo.trim()}
                  style={{
                    background: '#800000',
                    color: 'white',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {bloquearLoading ? (
                    <>
                      <RefreshCw size={14} className="spinning" />
                      <span>Bloqueando...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      <span>Confirmar Bloqueo de Proceso</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: DESBLOQUEAR PROCESO DE NEGOCIO (RF-11.4)              */}
      {/* ------------------------------------------------------------- */}
      {desbloquearModalOpen && tramiteADesbloquear && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !desbloquearLoading) setDesbloquearModalOpen(false); }}>
          <div className="modal-dialog" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#15803D', color: 'white', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Unlock size={22} color="#86EFAC" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'white' }}>
                    Desbloquear y Reactivar Proceso
                  </h3>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                    Ventanilla Única — Reactivación de Expediente (RF-11.4)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !desbloquearLoading && setDesbloquearModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmDesbloquear}>
              <div className="modal-body" style={{ padding: '1.5rem' }}>
                {/* Cuadro Resumen del Trámite */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px 14px', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>EXPEDIENTE A REACTIVAR</span>
                    <strong style={{ fontSize: '1.1rem', color: '#15803D' }}>{tramiteADesbloquear.numero_correlativo}</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#1B365D', fontWeight: 600 }}>
                    {tramiteADesbloquear.remitente}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                    {tramiteADesbloquear.referencia}
                  </div>
                </div>

                {/* Motivo Original del Bloqueo */}
                {tramiteADesbloquear.motivo_bloqueo && (
                  <div style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    marginBottom: '1.25rem',
                    fontSize: '0.84rem'
                  }}>
                    <div style={{ fontSize: '0.72rem', color: '#991B1B', fontWeight: 800, textTransform: 'uppercase' }}>
                      Causa del Bloqueo Original
                    </div>
                    <div style={{ color: '#7F1D1D', marginTop: '2px', fontWeight: 500 }}>
                      {tramiteADesbloquear.motivo_bloqueo}
                    </div>
                  </div>
                )}

                {/* Campo de Motivo de Desbloqueo Obligatorio */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1B365D', marginBottom: '6px', display: 'block' }}>
                    Motivo / Proveído de Desbloqueo <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    required
                    placeholder="Escriba el motivo por el cual se reactiva el proceso (ej. Por completar la documentación solicitada, subsanación presentada en fecha)..."
                    value={motivoDesbloqueo}
                    onChange={e => setMotivoDesbloqueo(e.target.value)}
                    style={{ fontSize: '0.88rem' }}
                    disabled={desbloquearLoading}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '4px' }}>
                    El trámite volverá al estado operativo 'EN ATENCIÓN' para continuar su flujo regular.
                  </div>
                </div>

                {desbloquearError && (
                  <div className="alert alert-danger" style={{ fontSize: '0.85rem', padding: '8px 12px' }}>
                    {desbloquearError}
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ padding: '1rem 1.5rem', background: '#F9FAFB', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDesbloquearModalOpen(false)}
                  disabled={desbloquearLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-sm"
                  disabled={desbloquearLoading || !motivoDesbloqueo.trim()}
                  style={{
                    background: '#15803D',
                    color: 'white',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {desbloquearLoading ? (
                    <>
                      <RefreshCw size={14} className="spinning" />
                      <span>Reactivando...</span>
                    </>
                  ) : (
                    <>
                      <Unlock size={14} />
                      <span>Confirmar Desbloqueo y Reactivación</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: VER TRAZABILIDAD COMPLETA (HISTORIAL AUDITABLE)      */}
      {/* ------------------------------------------------------------- */}
      {trazabilidadModalOpen && tramiteTrazabilidad && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setTrazabilidadModalOpen(false); }}>
          <div className="modal-dialog" style={{ maxWidth: '750px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#1B365D', color: 'white', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={22} color="#93C5FD" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'white' }}>
                    Trazabilidad de Movimientos y Auditoría
                  </h3>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                    Expediente {tramiteTrazabilidad.numero_correlativo} — Historial Inmutable
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrazabilidadModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {trazabilidadLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                  <RefreshCw size={24} className="spinning" style={{ marginBottom: '8px' }} />
                  <div>Cargando historial de movimientos...</div>
                </div>
              ) : trazabilidadData ? (
                <div>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px', marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: 700, color: '#1B365D', fontSize: '0.95rem' }}>{trazabilidadData.tipo_proceso_nombre || trazabilidadData.tipo_proceso}</div>
                    <div style={{ fontSize: '0.84rem', color: '#334155', marginTop: '2px' }}>Remitente: <strong>{trazabilidadData.remitente}</strong></div>
                    <div style={{ fontSize: '0.84rem', color: '#475569' }}>Referencia: {trazabilidadData.referencia}</div>
                    <div style={{ marginTop: '6px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span className="badge" style={{ background: trazabilidadData.estado === 'BLOQUEADO' ? '#DC2626' : '#10B981', color: 'white' }}>
                        {trazabilidadData.estado}
                      </span>
                      {trazabilidadData.motivo_bloqueo && (
                        <span style={{ fontSize: '0.78rem', color: '#DC2626', fontWeight: 600 }}>
                          Motivo Bloqueo: {trazabilidadData.motivo_bloqueo}
                        </span>
                      )}
                    </div>
                  </div>

                  <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1B365D', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Línea de Tiempo de Auditoría ({(trazabilidadData.movimientos || trazabilidadData.historial)?.length || 0} movimientos)
                  </h5>

                  <div style={{ position: 'relative', paddingLeft: '20px', borderLeft: '2px solid #CBD5E1', marginLeft: '10px' }}>
                    {((trazabilidadData.movimientos || trazabilidadData.historial) || []).map((m, idx) => (
                      <div key={idx} style={{ marginBottom: '1.25rem', position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          left: '-26px',
                          top: '2px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: m.tipo_movimiento === 'BLOQUEO' ? '#DC2626' : (m.tipo_movimiento === 'DESBLOQUEO' ? '#16A34A' : '#1B365D'),
                          border: '2px solid white',
                          boxShadow: '0 0 0 2px #CBD5E1'
                        }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748B' }}>
                          <span style={{ fontWeight: 700, color: m.tipo_movimiento === 'BLOQUEO' ? '#DC2626' : '#1B365D' }}>
                            {m.actividad_nombre || m.tipo_movimiento}
                          </span>
                          <span>
                            {(m.fecha_envio || m.created_at) ? new Date(m.fecha_envio || m.created_at).toLocaleString() : '---'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '2px' }}>
                          Por: <strong>{m.usuario_origen_nombre || m.usuario_origen || 'Operador'}</strong> ({m.ubicacion_origen_nombre || m.ubicacion_origen || 'Oficina'})
                        </div>
                        {m.proveido && (
                          <div style={{
                            background: m.tipo_movimiento === 'BLOQUEO' ? '#FEF2F2' : '#F1F5F9',
                            border: `1px solid ${m.tipo_movimiento === 'BLOQUEO' ? '#FECACA' : '#E2E8F0'}`,
                            borderRadius: '4px',
                            padding: '6px 10px',
                            marginTop: '4px',
                            fontSize: '0.82rem',
                            color: m.tipo_movimiento === 'BLOQUEO' ? '#991B1B' : '#1E293B',
                            fontStyle: 'italic'
                          }}>
                            {m.proveido}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                  No se pudo cargar la trazabilidad del trámite.
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '0.75rem 1.5rem', background: '#F9FAFB' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setTrazabilidadModalOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
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

              {/* Documentos Digitales Adjuntos (RF-07) */}
              {emittedTramite.adjuntos && emittedTramite.adjuntos.length > 0 && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px 14px', borderRadius: '6px', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1B365D', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Paperclip size={14} color="#800000" />
                    <span>Documentos PDF Adjuntos ({emittedTramite.adjuntos.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {emittedTramite.adjuntos.map(adj => (
                      <div
                        key={adj.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'white',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: '1px solid #E2E8F0'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <FileText size={16} color="#DC2626" />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                            {adj.nombre_original}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            ({adj.tamano_legible})
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <a
                            href={adjuntosService.getViewUrl(adj.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Previsualizar PDF en el navegador"
                          >
                            <ExternalLink size={12} />
                            <span>Ver</span>
                          </a>
                          <a
                            href={adjuntosService.getDownloadUrl(adj.id)}
                            download={adj.nombre_original}
                            className="btn btn-outline-primary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Descargar archivo PDF original"
                          >
                            <Download size={12} />
                            <span>Descargar</span>
                          </a>
                        </div>
                      </div>
                    ))}
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
                  className="btn btn-sm"
                  onClick={() => setHojaDeRutaOpen(true)}
                  style={{
                    backgroundColor: '#800000',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600
                  }}
                  title="Ver e imprimir la Hoja de Ruta oficial del trámite registrado"
                >
                  <FileText size={15} />
                  <span>Ver Hoja de Ruta</span>
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

      {/* Modal de Hoja de Ruta Oficial */}
      <HojaDeRutaModal
        isOpen={hojaDeRutaOpen}
        onClose={() => setHojaDeRutaOpen(false)}
        tramiteId={emittedTramite?.id || null}
        initialData={emittedTramite}
      />
    </div>
  );
}
