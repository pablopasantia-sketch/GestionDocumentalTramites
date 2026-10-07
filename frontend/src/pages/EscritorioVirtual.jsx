import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Inbox,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  FileText,
  UserCheck,
  CornerDownLeft,
  CornerUpRight,
  Paperclip,
  Download,
  Calendar,
  Building2,
  User,
  Shield,
  Tag,
  Hash,
  X,
  ExternalLink,
  Printer,
  ChevronRight,
  ArrowRight,
  Plus,
  Trash2,
  Users,
  Check,
  ArrowRightCircle,
  RotateCcw
} from 'lucide-react';
import { tramitesService, adjuntosService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import InstitucionalSelectors from '../components/institucional/InstitucionalSelectors';
import EmpleadoSearchAutocomplete from '../components/institucional/EmpleadoSearchAutocomplete';

const INSTRUCCIONES_SUGERIDAS_DERIVACION = [
  'Para su atención y trámite correspondiente según normativa',
  'Para informe técnico y dictamen pertinente',
  'Para visto bueno y firma de aprobación',
  'Para conocimiento y fines consiguientes',
  'Para elaboración de nota de respuesta oficial',
  'Para archivo y custodia definitiva'
];

const JUSTIFICACIONES_SUGERIDAS_RETROCESO = [
  'Documentación incompleta o faltan requisitos obligatorios',
  'Observaciones técnicas en el contenido o formato presentado',
  'Error en la asignación de la unidad receptora / destinatario',
  'Falta firma, sello o visto bueno de la autoridad correspondiente',
  'Se requiere subsanación o complementación previa por la unidad remitente',
  'Devolución por no corresponder a las competencias de esta unidad'
];

const PROVEIDOS_SUGERIDOS_ATENCION = [
  'Informe técnico elaborado con visto bueno favorable y conclusiones.',
  'Dictamen legal emitido y visado para consideración de la autoridad.',
  'Revisión documental conforme a normativa completada a satisfacción.',
  'Evaluación técnica finalizada. Listo para remitir al siguiente despacho.',
  'Atención técnica concluida satisfactoriamente sin observaciones.'
];

export default function EscritorioVirtual() {
  const { user, activeRole } = useAuth();

  // Estados principales de navegación y bandejas
  const [bandejaActiva, setBandejaActiva] = useState('RECIBIDOS'); // 'RECIBIDOS' | 'DESPACHADOS' | 'SUPERVISION'
  const [tramites, setTramites] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [error, setError] = useState(null);

  // Filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS'); // 'TODOS' | 'CORRESPONDENCIA' | 'TRAMITE'
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroPrioridad, setFiltroPrioridad] = useState('TODAS');
  const [soloVencidos, setSoloVencidos] = useState(false);
  const [gestion, setGestion] = useState(new Date().getFullYear());

  // Modales
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [selectedTramiteId, setSelectedTramiteId] = useState(null);
  const [tramiteDetalle, setTramiteDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [recepcionarModalOpen, setRecepcionarModalOpen] = useState(false);
  const [tramiteARecepcionar, setTramiteARecepcionar] = useState(null);
  const [proveidoRecepcion, setProveidoRecepcion] = useState('');
  const [recepcionando, setRecepcionando] = useState(false);
  const [recepcionError, setRecepcionError] = useState(null);

  // Modal de Derivación Libre (Avanzar - RF-05.1, RF-03.9)
  const [derivarModalOpen, setDerivarModalOpen] = useState(false);
  const [tramiteADerivar, setTramiteADerivar] = useState(null);
  const [derivando, setDerivando] = useState(false);
  const [derivarError, setDerivarError] = useState(null);
  const [derivarForm, setDerivarForm] = useState({
    codUDestino: '',
    unidadDestinoObj: null,
    codCargoDestino: '',
    cargoDestinoObj: null,
    ciEmpleadoDestino: '',
    destinatarioNombre: '',
    destinatarioCargo: '',
    destinatarioUnidad: '',
    actividadNombre: 'Atención y derivación institucional',
    proveido: '',
    instruccion: INSTRUCCIONES_SUGERIDAS_DERIVACION[0],
    prioridad: 'NORMAL',
    diasPlazo: 3,
    esConclusion: false,
    otrosDestinatarios: []
  });
  const [nuevaCopia, setNuevaCopia] = useState({ nombre: '', cargo: '', unidad: '' });
  const [mostrarAgregarCopia, setMostrarAgregarCopia] = useState(false);

  // Modal de Retroceso de Proceso (RF-04.5, RF-05.4, RF-05.5)
  const [retrocederModalOpen, setRetrocederModalOpen] = useState(false);
  const [tramiteARetroceder, setTramiteARetroceder] = useState(null);
  const [justificacionRetroceso, setJustificacionRetroceso] = useState('');
  const [proveidoRetroceso, setProveidoRetroceso] = useState('');
  const [retrocediendo, setRetrocediendo] = useState(false);
  const [retrocederError, setRetrocederError] = useState(null);
  const [infoPasoPrevio, setInfoPasoPrevio] = useState(null);
  const [loadingPasoPrevio, setLoadingPasoPrevio] = useState(false);

  // Modal de Concluir Atención / Marcar Atendido (Sprint 3)
  const [atenderModalOpen, setAtenderModalOpen] = useState(false);
  const [tramiteAAtender, setTramiteAAtender] = useState(null);
  const [proveidoAtencion, setProveidoAtencion] = useState('');
  const [actividadNombreAtencion, setActividadNombreAtencion] = useState('Informe y atención técnica concluida');
  const [atendiendo, setAtendiendo] = useState(false);
  const [atenderError, setAtenderError] = useState(null);

  // Alertas temporales de acción
  const [alertSuccess, setAlertSuccess] = useState(null);

  const esAdmin = activeRole?.rol_codigo === 'ADMIN_SISTEMA' || activeRole?.rol_codigo === 'ADMIN_TRAMITES';

  // Carga inicial y reactiva
  useEffect(() => {
    cargarDatos();
  }, [bandejaActiva, filtroCategoria, filtroEstado, soloVencidos, gestion]);

  // Recarga métricas (KPIs)
  useEffect(() => {
    cargarResumen();
  }, [gestion, bandejaActiva]);

  const cargarResumen = async () => {
    setLoadingResumen(true);
    try {
      const res = await tramitesService.getBandejaResumen({
        gestion,
        verGlobal: bandejaActiva === 'SUPERVISION'
      });
      if (res && res.data) {
        setResumen(res.data);
      }
    } catch (err) {
      console.error('Error al cargar métricas de bandeja:', err);
    } finally {
      setLoadingResumen(false);
    }
  };

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        bandeja: bandejaActiva === 'SUPERVISION' ? 'TODOS' : bandejaActiva,
        categoria: filtroCategoria,
        estado: filtroEstado,
        gestion,
        soloVencidos,
        verGlobal: bandejaActiva === 'SUPERVISION',
        limit: 100
      };

      const res = await tramitesService.getBandeja(params);
      const items = Array.isArray(res) ? res : (res?.data || []);
      setTramites(items);
    } catch (err) {
      console.error('Error al cargar trámites de la bandeja:', err);
      setError('No se pudieron obtener los trámites de la bandeja de trabajo. Verifique la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrado local en vivo por texto de búsqueda y prioridad
  const tramitesFiltrados = useMemo(() => {
    return tramites.filter((item) => {
      // Filtro de texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const correlativo = (item.numero_correlativo || '').toLowerCase();
        const remitente = (item.remitente || '').toLowerCase();
        const referencia = (item.referencia || '').toLowerCase();
        const cite = (item.cite_externo || '').toLowerCase();
        const tipoNombre = (item.tipo_proceso_nombre || '').toLowerCase();
        const dest = (item.destinatario_nombre || '').toLowerCase();

        const match =
          correlativo.includes(term) ||
          remitente.includes(term) ||
          referencia.includes(term) ||
          cite.includes(term) ||
          tipoNombre.includes(term) ||
          dest.includes(term);

        if (!match) return false;
      }

      // Filtro de prioridad
      if (filtroPrioridad !== 'TODAS' && item.prioridad !== filtroPrioridad) {
        return false;
      }

      return true;
    });
  }, [tramites, searchTerm, filtroPrioridad]);

  // Abrir modal de detalle
  const handleVerDetalle = async (id) => {
    setSelectedTramiteId(id);
    setDetalleModalOpen(true);
    setLoadingDetalle(true);
    try {
      const res = await tramitesService.getById(id);
      if (res && res.data) {
        setTramiteDetalle(res.data);
      }
    } catch (err) {
      console.error('Error al obtener detalle del trámite:', err);
    } finally {
      setLoadingDetalle(false);
    }
  };

  // Abrir modal de recepción
  const handleAbrirRecepcionar = (tramite) => {
    setTramiteARecepcionar(tramite);
    setProveidoRecepcion('Documento físico recepcionado para atención y trámite legal correspondiente.');
    setRecepcionError(null);
    setRecepcionarModalOpen(true);
  };

  // Confirmar recepción
  const handleConfirmarRecepcion = async () => {
    if (!tramiteARecepcionar) return;
    setRecepcionando(true);
    setRecepcionError(null);
    try {
      await tramitesService.recepcionar(tramiteARecepcionar.id, {
        proveido: proveidoRecepcion
      });

      setAlertSuccess(`¡Trámite ${tramiteARecepcionar.numero_correlativo} recepcionado exitosamente! Se encuentra ahora en estado "En Atención".`);
      setRecepcionarModalOpen(false);
      setTramiteARecepcionar(null);
      cargarDatos();
      cargarResumen();

      setTimeout(() => setAlertSuccess(null), 6000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al recepcionar el trámite.';
      setRecepcionError(msg);
    } finally {
      setRecepcionando(false);
    }
  };

  // Abrir modal de Derivación Libre (Avanzar)
  const handleAbrirDerivar = (tramite) => {
    setTramiteADerivar(tramite);
    setDerivarForm({
      codUDestino: '',
      unidadDestinoObj: null,
      codCargoDestino: '',
      cargoDestinoObj: null,
      ciEmpleadoDestino: '',
      destinatarioNombre: '',
      destinatarioCargo: '',
      destinatarioUnidad: '',
      actividadNombre: 'Atención y derivación institucional',
      proveido: '',
      instruccion: INSTRUCCIONES_SUGERIDAS_DERIVACION[0],
      prioridad: tramite.prioridad || 'NORMAL',
      diasPlazo: 3,
      esConclusion: false,
      otrosDestinatarios: []
    });
    setNuevaCopia({ nombre: '', cargo: '', unidad: '' });
    setMostrarAgregarCopia(false);
    setDerivarError(null);
    setDerivarModalOpen(true);
  };

  // Confirmar derivación libre / avance institucional
  const handleConfirmarDerivacion = async () => {
    if (!tramiteADerivar) return;
    setDerivando(true);
    setDerivarError(null);

    // Validación
    if (!derivarForm.esConclusion) {
      if (!derivarForm.codUDestino && !derivarForm.destinatarioUnidad) {
        setDerivarError('Debe seleccionar la Unidad Organizativa de destino para la derivación.');
        setDerivando(false);
        return;
      }
    }

    if (!derivarForm.proveido || derivarForm.proveido.trim().length < 3) {
      setDerivarError('Debe ingresar un proveído o decreto de derivación válido (mínimo 3 caracteres).');
      setDerivando(false);
      return;
    }

    try {
      const payload = {
        cod_u_destino: derivarForm.esConclusion ? null : (derivarForm.codUDestino ? parseInt(derivarForm.codUDestino, 10) : null),
        cod_cargo_destino: derivarForm.esConclusion ? null : (derivarForm.codCargoDestino ? parseInt(derivarForm.codCargoDestino, 10) : null),
        ci_empleado_destino: derivarForm.esConclusion ? null : (derivarForm.ciEmpleadoDestino ? parseInt(derivarForm.ciEmpleadoDestino, 10) : null),
        destinatario_nombre: derivarForm.esConclusion ? null : (derivarForm.destinatarioNombre || null),
        destinatario_cargo: derivarForm.esConclusion ? null : (derivarForm.destinatarioCargo || null),
        destinatario_unidad: derivarForm.esConclusion ? null : (derivarForm.destinatarioUnidad || null),
        actividad_nombre: derivarForm.actividadNombre || (derivarForm.esConclusion ? 'Conclusión y archivo' : 'Derivación institucional'),
        proveido: derivarForm.proveido.trim(),
        instruccion: derivarForm.instruccion || null,
        prioridad: derivarForm.prioridad || 'NORMAL',
        dias_plazo: derivarForm.diasPlazo ? parseInt(derivarForm.diasPlazo, 10) : null,
        es_conclusion: derivarForm.esConclusion,
        otros_destinatarios: derivarForm.otrosDestinatarios
      };

      await tramitesService.derivar(tramiteADerivar.id, payload);

      setAlertSuccess(
        derivarForm.esConclusion
          ? `¡Trámite ${tramiteADerivar.numero_correlativo} concluido y archivado exitosamente!`
          : `¡Trámite ${tramiteADerivar.numero_correlativo} derivado exitosamente! Ahora se encuentra en su bandeja de Despachados.`
      );
      setDerivarModalOpen(false);
      setTramiteADerivar(null);
      if (detalleModalOpen) {
        setDetalleModalOpen(false);
      }
      cargarDatos();
      cargarResumen();
      setTimeout(() => setAlertSuccess(null), 6000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al derivar el trámite.';
      setDerivarError(msg);
    } finally {
      setDerivando(false);
    }
  };

  const handleDerivarUnidadChange = (codU, unidadObj) => {
    setDerivarForm(prev => ({
      ...prev,
      codUDestino: codU,
      unidadDestinoObj: unidadObj,
      destinatarioUnidad: unidadObj?.nombU || '',
      codCargoDestino: '',
      cargoDestinoObj: null,
      destinatarioCargo: ''
    }));
  };

  const handleDerivarCargoChange = (codCargo, cargoObj) => {
    setDerivarForm(prev => ({
      ...prev,
      codCargoDestino: codCargo,
      cargoDestinoObj: cargoObj,
      destinatarioCargo: cargoObj?.nombreC || ''
    }));
  };

  const handleDerivarSelectEmpleado = (empleado) => {
    if (!empleado) return;
    const nombreCompleto = `${empleado.nombres || ''} ${empleado.apellido_paterno || ''} ${empleado.apellido_materno || ''}`.trim();
    setDerivarForm(prev => ({
      ...prev,
      ciEmpleadoDestino: empleado.ci,
      destinatarioNombre: nombreCompleto || prev.destinatarioNombre,
      destinatarioCargo: empleado.cargo_nombre || prev.destinatarioCargo
    }));
  };

  const handleAgregarCopia = () => {
    if (!nuevaCopia.nombre.trim() && !nuevaCopia.unidad.trim()) return;
    setDerivarForm(prev => ({
      ...prev,
      otrosDestinatarios: [
        ...prev.otrosDestinatarios,
        {
          nombre: nuevaCopia.nombre.trim(),
          cargo: nuevaCopia.cargo.trim(),
          unidad: nuevaCopia.unidad.trim(),
          tipo: 'COPIA'
        }
      ]
    }));
    setNuevaCopia({ nombre: '', cargo: '', unidad: '' });
    setMostrarAgregarCopia(false);
  };

  const handleEliminarCopia = (index) => {
    setDerivarForm(prev => ({
      ...prev,
      otrosDestinatarios: prev.otrosDestinatarios.filter((_, i) => i !== index)
    }));
  };

  // Abrir modal de Retroceso de Proceso (RF-04.5, RF-05.4, RF-05.5)
  const handleAbrirRetroceder = async (tramite) => {
    setTramiteARetroceder(tramite);
    setJustificacionRetroceso('');
    setProveidoRetroceso('');
    setRetrocederError(null);
    setInfoPasoPrevio(null);
    setRetrocederModalOpen(true);
    setLoadingPasoPrevio(true);

    try {
      const res = await tramitesService.getById(tramite.id);
      const data = res?.data || res;
      if (data && data.historial && data.historial.length > 1) {
        const movimientos = data.historial;
        const miUnidad = tramite.destinatario_unidad || tramite.unidad_actual_nombre;
        // Buscar hacia atrás el último movimiento cuyo origen provenga de una unidad distinta
        const pasoPrevio = [...movimientos].reverse().find(m => 
          m.unidad_origen && (!miUnidad || m.unidad_origen.trim().toLowerCase() !== miUnidad.trim().toLowerCase())
        ) || movimientos[0];

        setInfoPasoPrevio({
          sinPasoPrevio: false,
          unidadDestinoRetorno: pasoPrevio?.unidad_origen || 'Unidad Remitente Anterior',
          empleadoDestinoRetorno: pasoPrevio?.usuario_origen_nombre || 'Remitente Anterior',
          actividadAnterior: pasoPrevio?.actividad || 'Actividad previa',
          totalMovimientos: movimientos.length
        });
      } else {
        setInfoPasoPrevio({
          sinPasoPrevio: true,
          totalMovimientos: data?.historial?.length || 1
        });
      }
    } catch (err) {
      console.warn('No se pudo cargar información del paso previo:', err);
    } finally {
      setLoadingPasoPrevio(false);
    }
  };

  // Confirmar retroceso de proceso con justificación obligatoria
  const handleConfirmarRetroceso = async () => {
    if (!tramiteARetroceder) return;

    if (!justificacionRetroceso || justificacionRetroceso.trim().length < 5) {
      setRetrocederError('Debe ingresar una justificación obligatoria detallada (mínimo 5 caracteres).');
      return;
    }

    setRetrocediendo(true);
    setRetrocederError(null);

    try {
      const payload = {
        justificacion: justificacionRetroceso.trim(),
        proveido: proveidoRetroceso.trim() || null
      };

      await tramitesService.retroceder(tramiteARetroceder.id, payload);

      setAlertSuccess(`¡Trámite ${tramiteARetroceder.numero_correlativo} devuelto/retrocedido con éxito! Custodia restituida a la unidad remitente.`);
      setRetrocederModalOpen(false);
      setTramiteARetroceder(null);
      if (detalleModalOpen) {
        setDetalleModalOpen(false);
      }
      cargarDatos();
      cargarResumen();

      setTimeout(() => setAlertSuccess(null), 6000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al retroceder el trámite.';
      setRetrocederError(msg);
    } finally {
      setRetrocediendo(false);
    }
  };

  // Abrir modal de Concluir Atención / Marcar Atendido (Sprint 3)
  const handleAbrirAtender = (tramite) => {
    setTramiteAAtender(tramite);
    setProveidoAtencion(PROVEIDOS_SUGERIDOS_ATENCION[0]);
    setActividadNombreAtencion('Informe y evaluación técnica concluida');
    setAtenderError(null);
    setAtenderModalOpen(true);
  };

  // Confirmar conclusión de atención técnica (cambio a ATENDIDO)
  const handleConfirmarAtender = async () => {
    if (!tramiteAAtender) return;

    if (!proveidoAtencion || proveidoAtencion.trim().length < 3) {
      setAtenderError('Debe ingresar un informe técnico, dictamen o proveído de atención (mínimo 3 caracteres).');
      return;
    }

    setAtendiendo(true);
    setAtenderError(null);

    try {
      const payload = {
        proveido: proveidoAtencion.trim(),
        actividad_nombre: actividadNombreAtencion.trim() || 'Informe y atención técnica concluida'
      };

      await tramitesService.marcarAtendido(tramiteAAtender.id, payload);

      setAlertSuccess(`¡Trámite ${tramiteAAtender.numero_correlativo} marcado como ATENDIDO exitosamente! Listo para ser despachado a la siguiente instancia.`);
      setAtenderModalOpen(false);
      setTramiteAAtender(null);
      if (detalleModalOpen) {
        setDetalleModalOpen(false);
      }
      cargarDatos();
      cargarResumen();

      setTimeout(() => setAlertSuccess(null), 6000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al marcar el trámite como atendido.';
      setAtenderError(msg);
    } finally {
      setAtendiendo(false);
    }
  };

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroCategoria('TODOS');
    setFiltroEstado('TODOS');
    setFiltroPrioridad('TODAS');
    setSoloVencidos(false);
  };

  // Helper de badges para estados institucionales
  const renderBadgeEstado = (estado) => {
    switch (estado) {
      case 'EN_ATENCION':
        return <span className="badge badge-modificada">🟡 EN ATENCIÓN</span>;
      case 'ATENDIDO':
        return <span className="badge badge-vigente">🟢 ATENDIDO</span>;
      case 'POR_RECIBIR':
        return <span className="badge badge-azul">🔵 POR RECIBIR</span>;
      case 'EN_TRANSITO':
        return <span className="badge badge-azul">🔵 EN TRÁNSITO</span>;
      case 'CREADO':
        return <span className="badge badge-sucre">🔴 RECIÉN CREADO</span>;
      case 'RECIBIDO':
        return <span className="badge badge-vigente">🟢 RECIBIDO</span>;
      case 'CONCLUIDO':
        return <span className="badge badge-vigente">⚪ CONCLUIDO</span>;
      case 'BLOQUEADO':
        return <span className="badge badge-alerta">⛔ BLOQUEADO</span>;
      case 'ANULADO':
        return <span className="badge badge-alerta">❌ ANULADO</span>;
      default:
        return <span className="badge">{estado}</span>;
    }
  };

  // Helper para formato de fechas
  const formatFecha = (str) => {
    if (!str) return '—';
    try {
      const d = new Date(str);
      if (isNaN(d.getTime())) return str;
      return d.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return str;
    }
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER INSTITUCIONAL DEL ESCRITORIO VIRTUAL
          ───────────────────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: '1.5rem 2rem',
          marginBottom: '1.5rem',
          borderTop: '5px solid #800000',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '6px',
              backgroundColor: '#800000',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(128, 0, 0, 0.25)'
            }}
          >
            <Layers size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-sucre">Sprint 3: Flujo de Trabajo</span>
              <span className="badge badge-azul">{activeRole?.rol_nombre || 'Funcionario Municipal'}</span>
            </div>
            <h1 style={{ fontSize: '1.5rem', margin: 0, color: '#1B365D', fontWeight: 700 }}>
              Escritorio Virtual de Trámites y Bandejas
            </h1>
            <p style={{ margin: 0, color: '#6C757D', fontSize: '0.875rem' }}>
              <strong>Funcionario:</strong> {user?.nombres} {user?.apellidoPaterno} &nbsp;|&nbsp;
              <strong>Unidad Asignada:</strong> {activeRole?.ubicacion_nombre || 'Oficina Central'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => {
              cargarDatos();
              cargarResumen();
            }}
            disabled={loading}
            className="btn btn-secondary"
            title="Actualizar listado y métricas"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '8px 14px' }}
          >
            <RefreshCw size={15} className={loading ? 'spin-animation' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Alerta de Éxito Flotante */}
      {alertSuccess && (
        <div
          style={{
            backgroundColor: '#E6F4EA',
            border: '1px solid #A3D9A5',
            color: '#1E7E34',
            padding: '12px 18px',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(30, 126, 52, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={20} />
            <span style={{ fontWeight: 600 }}>{alertSuccess}</span>
          </div>
          <button
            onClick={() => setAlertSuccess(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1E7E34' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. TARJETAS DE MÉTRICAS Y RESUMEN NUMÉRICO (KPIS — RF-04.7)
          ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        {/* KPI 1: Total en Bandeja */}
        <div
          className="card"
          onClick={() => {
            setBandejaActiva('RECIBIDOS');
            setFiltroEstado('TODOS');
            setSoloVencidos(false);
          }}
          style={{
            padding: '1.25rem 1rem',
            cursor: 'pointer',
            borderLeft: '4px solid #1B365D',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#6C757D', fontWeight: 600, textTransform: 'uppercase' }}>
              Mis Pendientes
            </span>
            <Inbox size={18} color="#1B365D" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1B365D' }}>
            {loadingResumen ? '...' : resumen?.total_bandeja ?? 0}
          </div>
          <small style={{ color: '#6C757D', fontSize: '0.75rem' }}>Trámites asignados activos</small>
        </div>

        {/* KPI 2: Por Recibir */}
        <div
          className="card"
          onClick={() => {
            setBandejaActiva('RECIBIDOS');
            setFiltroEstado('POR_RECIBIR');
            setSoloVencidos(false);
          }}
          style={{
            padding: '1.25rem 1rem',
            cursor: 'pointer',
            borderLeft: '4px solid #17A2B8',
            backgroundColor: filtroEstado === 'POR_RECIBIR' ? '#F0F9FB' : '#FFFFFF'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#006064', fontWeight: 600, textTransform: 'uppercase' }}>
              Por Recibir
            </span>
            <UserCheck size={18} color="#17A2B8" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#006064' }}>
            {loadingResumen ? '...' : resumen?.por_recibir ?? 0}
          </div>
          <small style={{ color: '#006064', fontSize: '0.75rem' }}>Pendientes de confirmación</small>
        </div>

        {/* KPI 3: En Atención */}
        <div
          className="card"
          onClick={() => {
            setBandejaActiva('RECIBIDOS');
            setFiltroEstado('EN_ATENCION');
            setSoloVencidos(false);
          }}
          style={{
            padding: '1.25rem 1rem',
            cursor: 'pointer',
            borderLeft: '4px solid #FFC107',
            backgroundColor: filtroEstado === 'EN_ATENCION' ? '#FFFDF5' : '#FFFFFF'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#8D6500', fontWeight: 600, textTransform: 'uppercase' }}>
              En Atención
            </span>
            <Clock size={18} color="#FFC107" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#8D6500' }}>
            {loadingResumen ? '...' : resumen?.en_atencion ?? 0}
          </div>
          <small style={{ color: '#8D6500', fontSize: '0.75rem' }}>En curso en su mesa</small>
        </div>

        {/* KPI 4: Atendidos */}
        <div
          className="card"
          onClick={() => {
            setBandejaActiva('RECIBIDOS');
            setFiltroEstado('ATENDIDO');
            setSoloVencidos(false);
          }}
          style={{
            padding: '1.25rem 1rem',
            cursor: 'pointer',
            borderLeft: '4px solid #28A745',
            backgroundColor: filtroEstado === 'ATENDIDO' ? '#F6FCF7' : '#FFFFFF'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#1E7E34', fontWeight: 600, textTransform: 'uppercase' }}>
              Atendidos
            </span>
            <CheckCircle2 size={18} color="#28A745" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1E7E34' }}>
            {loadingResumen ? '...' : resumen?.atendidos ?? 0}
          </div>
          <small style={{ color: '#1E7E34', fontSize: '0.75rem' }}>Listos para despachar</small>
        </div>

        {/* KPI 5: Despachados */}
        <div
          className="card"
          onClick={() => {
            setBandejaActiva('DESPACHADOS');
            setFiltroEstado('TODOS');
            setSoloVencidos(false);
          }}
          style={{
            padding: '1.25rem 1rem',
            cursor: 'pointer',
            borderLeft: '4px solid #6C757D',
            backgroundColor: bandejaActiva === 'DESPACHADOS' ? '#F8F9FA' : '#FFFFFF'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#495057', fontWeight: 600, textTransform: 'uppercase' }}>
              Despachados
            </span>
            <Send size={18} color="#6C757D" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#495057' }}>
            {loadingResumen ? '...' : resumen?.total_despachados ?? 0}
          </div>
          <small style={{ color: '#6C757D', fontSize: '0.75rem' }}>
            {resumen?.despachados_sin_confirmar ?? 0} sin confirmar
          </small>
        </div>

        {/* KPI 6: Vencidos / Alerta SLA (RF-04.8) */}
        <div
          className="card"
          onClick={() => {
            setBandejaActiva('RECIBIDOS');
            setSoloVencidos(!soloVencidos);
          }}
          style={{
            padding: '1.25rem 1rem',
            cursor: 'pointer',
            borderLeft: '4px solid #DC3545',
            backgroundColor: soloVencidos ? '#FDF2F2' : '#FFFFFF'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#B71C1C', fontWeight: 600, textTransform: 'uppercase' }}>
              Alerta SLA
            </span>
            <AlertTriangle size={18} color="#DC3545" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#B71C1C' }}>
            {loadingResumen ? '...' : resumen?.vencidos ?? 0}
          </div>
          <small style={{ color: '#B71C1C', fontSize: '0.75rem' }}>Fecha límite sobrepasada</small>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. PESTAÑAS PRINCIPALES DE BANDEJA (RF-04.2)
          ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #E2E8F0',
          marginBottom: '1.5rem',
          gap: '0.5rem'
        }}
      >
        <button
          onClick={() => {
            setBandejaActiva('RECIBIDOS');
            setFiltroEstado('TODOS');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '12px 22px',
            border: 'none',
            borderBottom: bandejaActiva === 'RECIBIDOS' ? '3px solid #800000' : '3px solid transparent',
            background: 'none',
            color: bandejaActiva === 'RECIBIDOS' ? '#800000' : '#495057',
            fontWeight: bandejaActiva === 'RECIBIDOS' ? 700 : 500,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <Inbox size={18} />
          <span>Bandeja de Recibidos (Mis Pendientes)</span>
          <span
            className="badge"
            style={{
              backgroundColor: bandejaActiva === 'RECIBIDOS' ? '#800000' : '#E2E8F0',
              color: bandejaActiva === 'RECIBIDOS' ? '#FFFFFF' : '#495057'
            }}
          >
            {resumen?.total_bandeja ?? 0}
          </span>
        </button>

        <button
          onClick={() => {
            setBandejaActiva('DESPACHADOS');
            setFiltroEstado('TODOS');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '12px 22px',
            border: 'none',
            borderBottom: bandejaActiva === 'DESPACHADOS' ? '3px solid #800000' : '3px solid transparent',
            background: 'none',
            color: bandejaActiva === 'DESPACHADOS' ? '#800000' : '#495057',
            fontWeight: bandejaActiva === 'DESPACHADOS' ? 700 : 500,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <Send size={18} />
          <span>Bandeja de Despachados (Enviados)</span>
          <span
            className="badge"
            style={{
              backgroundColor: bandejaActiva === 'DESPACHADOS' ? '#800000' : '#E2E8F0',
              color: bandejaActiva === 'DESPACHADOS' ? '#FFFFFF' : '#495057'
            }}
          >
            {resumen?.total_despachados ?? 0}
          </span>
        </button>

        {esAdmin && (
          <button
            onClick={() => {
              setBandejaActiva('SUPERVISION');
              setFiltroEstado('TODOS');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '12px 22px',
              border: 'none',
              borderBottom: bandejaActiva === 'SUPERVISION' ? '3px solid #1B365D' : '3px solid transparent',
              background: 'none',
              color: bandejaActiva === 'SUPERVISION' ? '#1B365D' : '#495057',
              fontWeight: bandejaActiva === 'SUPERVISION' ? 700 : 500,
              fontSize: '0.95rem',
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            <Shield size={18} />
            <span>Supervisión Institucional Global</span>
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. BARRA DE HERRAMIENTAS, FILTROS Y BÚSQUEDA (RF-04.6)
          ───────────────────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            alignItems: 'flex-end'
          }}
        >
          {/* Buscador de texto */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#495057', marginBottom: '4px' }}>
              Buscar en la bandeja (Hoja de Ruta, Remitente o Referencia):
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-sucre"
                placeholder="Ej: CM-1/2026, Contrato, Alcaldía..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: '36px' }}
              />
              <Search
                size={16}
                color="#6C757D"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6C757D'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Filtro por Categoría */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#495057', marginBottom: '4px' }}>
              Tipo de Documento:
            </label>
            <select
              className="select-sucre"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="CORRESPONDENCIA">Correspondencia Oficial Externa</option>
              <option value="TRAMITE">Trámites Internos</option>
            </select>
          </div>

          {/* Filtro por Estado */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#495057', marginBottom: '4px' }}>
              Estado del Proceso:
            </label>
            <select
              className="select-sucre"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="TODOS">Todos los estados</option>
              <option value="POR_RECIBIR">Por Recibir / En Tránsito</option>
              <option value="EN_ATENCION">En Atención</option>
              <option value="ATENDIDO">Atendido (Listo para despacho)</option>
              <option value="CREADO">Recién Registrado</option>
              <option value="CONCLUIDO">Concluido / Archivado</option>
              <option value="BLOQUEADO">Bloqueado</option>
            </select>
          </div>

          {/* Filtro por Prioridad */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#495057', marginBottom: '4px' }}>
              Prioridad:
            </label>
            <select
              className="select-sucre"
              value={filtroPrioridad}
              onChange={(e) => setFiltroPrioridad(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="TODAS">Todas las prioridades</option>
              <option value="URGENTE">🚨 URGENTE</option>
              <option value="ALTA">⚠️ ALTA</option>
              <option value="NORMAL">NORMAL</option>
            </select>
          </div>

          {/* Gestión (Año) */}
          <div style={{ maxWidth: '120px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#495057', marginBottom: '4px' }}>
              Gestión:
            </label>
            <select
              className="select-sucre"
              value={gestion}
              onChange={(e) => setGestion(Number(e.target.value))}
              style={{ width: '100%' }}
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        </div>

        {/* Fila inferior: Toggle de Vencidos y Botón de Limpiar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px dashed #E2E8F0',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: soloVencidos ? '#B71C1C' : '#495057'
              }}
            >
              <input
                type="checkbox"
                checked={soloVencidos}
                onChange={(e) => setSoloVencidos(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>Mostrar únicamente correspondencias con SLA vencido (RF-04.8)</span>
            </label>

            {(searchTerm || filtroCategoria !== 'TODOS' || filtroEstado !== 'TODOS' || filtroPrioridad !== 'TODAS' || soloVencidos) && (
              <button
                onClick={limpiarFiltros}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div style={{ fontSize: '0.85rem', color: '#6C757D' }}>
            Mostrando <strong>{tramitesFiltrados.length}</strong> de <strong>{tramites.length}</strong> documentos
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. TABLA PRINCIPAL DE TRÁMITES Y CORRESPONDENCIA (RF-04.5)
          ───────────────────────────────────────────────────────────── */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#6C757D' }}>
            <RefreshCw size={32} className="spin-animation" style={{ marginBottom: '1rem', color: '#800000' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Cargando documentos de la bandeja...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#B71C1C' }}>
            <AlertCircle size={36} style={{ marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 600, marginBottom: '1rem' }}>{error}</p>
            <button onClick={cargarDatos} className="btn btn-secondary btn-sm">
              Reintentar
            </button>
          </div>
        ) : tramitesFiltrados.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#6C757D' }}>
            <Inbox size={40} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
            <h3 style={{ color: '#495057', marginBottom: '0.5rem' }}>No se encontraron trámites en esta bandeja</h3>
            <p style={{ fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto' }}>
              {bandejaActiva === 'RECIBIDOS'
                ? 'Actualmente no tiene ningún trámite pendiente asignado para su atención en esta gestión.'
                : 'No tiene trámites registrados que hayan sido derivados o despachados hacia otras unidades.'}
            </p>
          </div>
        ) : (
          <table className="table-sucre">
            <thead className={bandejaActiva === 'DESPACHADOS' ? 'thead-azul' : ''}>
              <tr>
                <th style={{ width: '140px' }}>Hoja de Ruta</th>
                <th style={{ width: '180px' }}>Remitente</th>
                <th>Referencia / Objeto</th>
                <th style={{ width: '160px' }}>Actividad / Unidad</th>
                <th style={{ width: '140px' }}>Fecha & SLA</th>
                <th style={{ width: '130px' }}>Estado</th>
                <th style={{ width: '70px', textAlign: 'center' }}>Adj.</th>
                <th style={{ width: '170px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tramitesFiltrados.map((item) => {
                const isVencido = item.es_vencido;
                const esPorRecibir = item.estado === 'POR_RECIBIR' || item.estado === 'EN_TRANSITO';

                return (
                  <tr
                    key={item.id}
                    style={{
                      backgroundColor: isVencido ? '#FFF5F5' : undefined,
                      borderLeft: isVencido ? '4px solid #DC3545' : undefined
                    }}
                  >
                    {/* Columna 1: Hoja de Ruta y Prioridad */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#1B365D', fontSize: '0.92rem' }}>
                        {item.numero_correlativo}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                        {item.prioridad === 'URGENTE' ? (
                          <span className="badge badge-alerta" style={{ fontSize: '10px', padding: '2px 6px' }}>
                            🚨 URGENTE
                          </span>
                        ) : item.prioridad === 'ALTA' ? (
                          <span className="badge badge-modificada" style={{ fontSize: '10px', padding: '2px 6px' }}>
                            ⚠️ ALTA
                          </span>
                        ) : null}
                        <span className="badge badge-azul" style={{ fontSize: '10px', padding: '2px 6px' }}>
                          {item.tipo_proceso_codigo || 'HR'}
                        </span>
                      </div>
                    </td>

                    {/* Columna 2: Remitente */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#212529', fontSize: '0.875rem' }}>
                        {item.remitente}
                      </div>
                      {item.institucion_remitente && (
                        <div style={{ fontSize: '0.75rem', color: '#6C757D' }}>
                          {item.institucion_remitente}
                        </div>
                      )}
                      {item.cite_externo && (
                        <div style={{ fontSize: '0.72rem', color: '#1B365D', fontWeight: 500 }}>
                          CITE: {item.cite_externo}
                        </div>
                      )}
                    </td>

                    {/* Columna 3: Referencia */}
                    <td>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: '#212529',
                          lineHeight: '1.4',
                          maxHeight: '4.2em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                        title={item.referencia}
                      >
                        {item.referencia}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6C757D', marginTop: '3px' }}>
                        {item.tipo_proceso_nombre} • {item.nro_hojas} hojas
                      </div>
                    </td>

                    {/* Columna 4: Actividad y Destinatario */}
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1B365D' }}>
                        {item.actividad_actual || 'Atención institucional'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6C757D' }}>
                        {item.destinatario_unidad || item.ubicacion_actual_nombre || 'Unidad asignada'}
                      </div>
                      {item.destinatario_nombre && (
                        <div style={{ fontSize: '0.72rem', color: '#495057' }}>
                          Resp: {item.destinatario_nombre}
                        </div>
                      )}
                    </td>

                    {/* Columna 5: Fechas y Alerta SLA */}
                    <td>
                      <div style={{ fontSize: '0.75rem', color: '#495057' }}>
                        {formatFecha(item.fecha_recepcion || item.fecha_envio || item.fecha_creacion)}
                      </div>
                      {item.fecha_limite_respuesta && (
                        <div style={{ marginTop: '4px' }}>
                          {isVencido ? (
                            <span
                              className="badge badge-alerta"
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <AlertCircle size={10} />
                              <span>VENCIDO</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: item.dias_restantes <= 1 ? '#8D6500' : '#6C757D',
                                fontWeight: item.dias_restantes <= 1 ? 700 : 400
                              }}
                            >
                              Límite: {new Date(item.fecha_limite_respuesta).toLocaleDateString('es-BO')}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Columna 6: Estado */}
                    <td>
                      {renderBadgeEstado(item.estado)}
                      {bandejaActiva === 'DESPACHADOS' && (
                        <div style={{ fontSize: '0.72rem', color: '#6C757D', marginTop: '3px' }}>
                          {item.estado === 'POR_RECIBIR' || item.estado === 'EN_TRANSITO'
                            ? '⏳ Sin confirmar'
                            : '✓ Confirmado'}
                        </div>
                      )}
                    </td>

                    {/* Columna 7: Adjuntos PDF */}
                    <td style={{ textAlign: 'center' }}>
                      {item.nro_adjuntos > 0 ? (
                        <button
                          onClick={() => handleVerDetalle(item.id)}
                          title={`${item.nro_adjuntos} documento(s) adjunto(s)`}
                          style={{
                            background: '#E0F7FA',
                            border: '1px solid #B2EBF2',
                            color: '#006064',
                            borderRadius: '4px',
                            padding: '3px 7px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Paperclip size={12} />
                          <span>{item.nro_adjuntos}</span>
                        </button>
                      ) : (
                        <span style={{ color: '#ADB5BD', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>

                    {/* Columna 8: Acciones */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        {/* 1. Acción: Recepcionar (si está por recibir) */}
                        {bandejaActiva === 'RECIBIDOS' && esPorRecibir && (
                          <button
                            onClick={() => handleAbrirRecepcionar(item)}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: '#28A745',
                              color: '#FFFFFF',
                              padding: '5px 9px',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Confirmar recepción digital del documento y tomar custodia"
                          >
                            <UserCheck size={13} />
                            <span>Recepcionar</span>
                          </button>
                        )}

                        {/* 2. Acción: Atender (solo si está EN_ATENCION, tras haber recepcionado) */}
                        {bandejaActiva === 'RECIBIDOS' && item.estado === 'EN_ATENCION' && (
                          <button
                            onClick={() => handleAbrirAtender(item)}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: '#0D9488',
                              color: '#FFFFFF',
                              padding: '5px 9px',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Registrar informe técnico/dictamen y marcar como ATENDIDO listo para despachar"
                          >
                            <CheckCircle2 size={13} />
                            <span>Atender</span>
                          </button>
                        )}

                        {/* 3. Acción: Avanzar / Derivar Libre (solo cuando ya ha sido ATENDIDO) */}
                        {bandejaActiva === 'RECIBIDOS' && item.estado === 'ATENDIDO' && (
                          <button
                            onClick={() => handleAbrirDerivar(item)}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: '#800000',
                              color: '#FFFFFF',
                              padding: '5px 9px',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Derivación libre institucional (Avanzar trámite a otro destinatario)"
                          >
                            <Send size={13} />
                            <span>Avanzar</span>
                          </button>
                        )}

                        {/* 4. Acción: Retroceder Proceso (siempre disponible mientras el trámite no esté concluido) */}
                        {bandejaActiva === 'RECIBIDOS' && item.estado !== 'CONCLUIDO' && item.estado !== 'ANULADO' && item.estado !== 'BLOQUEADO' && (
                          <button
                            onClick={() => handleAbrirRetroceder(item)}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: '#D97706',
                              color: '#FFFFFF',
                              padding: '5px 9px',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Retroceder proceso con justificación a la unidad anterior"
                          >
                            <RotateCcw size={13} />
                            <span>Retroceder</span>
                          </button>
                        )}

                        {/* Supervisión: Retroceder administrativamente */}
                        {bandejaActiva === 'SUPERVISION' && item.estado !== 'CONCLUIDO' && item.estado !== 'ANULADO' && item.estado !== 'BLOQUEADO' && (
                          <button
                            onClick={() => handleAbrirRetroceder(item)}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: '#D97706',
                              color: '#FFFFFF',
                              padding: '5px 9px',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Supervisión: Retroceder trámite a la unidad anterior"
                          >
                            <RotateCcw size={13} />
                            <span>Retroceder</span>
                          </button>
                        )}

                        {/* Supervisión: Derivar administrativamente */}
                        {bandejaActiva === 'SUPERVISION' && item.estado !== 'CONCLUIDO' && item.estado !== 'ANULADO' && item.estado !== 'BLOQUEADO' && (
                          <button
                            onClick={() => handleAbrirDerivar(item)}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: '#1B365D',
                              color: '#FFFFFF',
                              padding: '5px 9px',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Supervisión: Derivar trámite a otra unidad"
                          >
                            <Send size={13} />
                            <span>Derivar</span>
                          </button>
                        )}

                        {/* Botón Ver Detalle / Formulario */}
                        <button
                          onClick={() => handleVerDetalle(item.id)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: '5px 9px',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Ver formulario completo y trazabilidad"
                        >
                          <Eye size={13} />
                          <span>Ver</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. MODAL DE RECEPCIÓN DE TRÁMITE
          ───────────────────────────────────────────────────────────── */}
      {recepcionarModalOpen && tramiteARecepcionar && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 11000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !recepcionando) {
              setRecepcionarModalOpen(false);
            }
          }}
        >
          <div className="modal-dialog" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <UserCheck size={22} color="#800000" />
                <h3 style={{ margin: 0, color: '#1B365D' }}>Confirmar Recepción de Documento</h3>
              </div>
              <button
                onClick={() => setRecepcionarModalOpen(false)}
                className="modal-close-btn"
                disabled={recepcionando}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <div
                style={{
                  backgroundColor: '#F8F9FA',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#6C757D', fontWeight: 600 }}>HOJA DE RUTA:</span>
                  <span style={{ fontWeight: 700, color: '#800000' }}>
                    {tramiteARecepcionar.numero_correlativo}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <strong>Remitente:</strong> {tramiteARecepcionar.remitente}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#495057' }}>
                  <strong>Referencia:</strong> {tramiteARecepcionar.referencia}
                </div>
              </div>

              {recepcionError && (
                <div
                  style={{
                    backgroundColor: '#FCE8E6',
                    color: '#B71C1C',
                    padding: '10px 14px',
                    borderRadius: '4px',
                    marginBottom: '1rem',
                    fontSize: '0.85rem'
                  }}
                >
                  {recepcionError}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#212529',
                    marginBottom: '6px'
                  }}
                >
                  Proveído o Nota de Recepción (opcional):
                </label>
                <textarea
                  className="input-sucre"
                  rows={3}
                  value={proveidoRecepcion}
                  onChange={(e) => setProveidoRecepcion(e.target.value)}
                  placeholder="Ingrese observaciones sobre el estado físico de los documentos o carpetas..."
                  style={{ width: '100%', resize: 'vertical' }}
                />
                <small style={{ color: '#6C757D', fontSize: '0.75rem' }}>
                  Al confirmar, el trámite pasará al estado "En Atención" bajo la custodia de su unidad.
                </small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setRecepcionarModalOpen(false)}
                  disabled={recepcionando}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarRecepcion}
                  disabled={recepcionando}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#28A745', borderColor: '#28A745' }}
                >
                  {recepcionando ? (
                    <>
                      <RefreshCw size={14} className="spin-animation" />
                      <span>Confirmando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Confirmar y Recepcionar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. MODAL DE DETALLE COMPLETO / FORMULARIO (RF-04.5)
          ───────────────────────────────────────────────────────────── */}
      {detalleModalOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDetalleModalOpen(false);
            }
          }}
        >
          <div
            className="modal-dialog"
            style={{ maxWidth: '850px', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={22} color="#800000" />
                <div>
                  <h3 style={{ margin: 0, color: '#1B365D', fontSize: '1.2rem' }}>
                    Detalle de Hoja de Ruta institucional
                  </h3>
                  {tramiteDetalle && (
                    <span style={{ fontSize: '0.8rem', color: '#6C757D' }}>
                      Correlativo: <strong>{tramiteDetalle.numero_correlativo}</strong> | Gestión {tramiteDetalle.gestion}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setDetalleModalOpen(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem' }}>
              {loadingDetalle ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#6C757D' }}>
                  <RefreshCw size={28} className="spin-animation" style={{ marginBottom: '0.75rem', color: '#800000' }} />
                  <p>Cargando información completa del trámite...</p>
                </div>
              ) : !tramiteDetalle ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#B71C1C' }}>
                  No se pudo cargar el detalle del trámite.
                </div>
              ) : (
                <div>
                  {/* Resumen Superior */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                      backgroundColor: '#F8F9FA',
                      padding: '1.25rem',
                      borderRadius: '6px',
                      marginBottom: '1.5rem',
                      border: '1px solid #E2E8F0'
                    }}
                  >
                    <div>
                      <small style={{ color: '#6C757D', display: 'block', fontWeight: 600 }}>TIPO DE PROCESO</small>
                      <strong style={{ color: '#1B365D' }}>{tramiteDetalle.tipo_proceso_nombre}</strong>
                    </div>
                    <div>
                      <small style={{ color: '#6C757D', display: 'block', fontWeight: 600 }}>ESTADO ACTUAL</small>
                      {renderBadgeEstado(tramiteDetalle.estado)}
                    </div>
                    <div>
                      <small style={{ color: '#6C757D', display: 'block', fontWeight: 600 }}>FECHA DE CREACIÓN</small>
                      <span>{formatFecha(tramiteDetalle.fecha_creacion)}</span>
                    </div>
                    <div>
                      <small style={{ color: '#6C757D', display: 'block', fontWeight: 600 }}>PRIORIDAD & FOJAS</small>
                      <span>{tramiteDetalle.prioridad} • {tramiteDetalle.nro_hojas} hojas ({tramiteDetalle.nro_anexos} anexos)</span>
                    </div>
                  </div>

                  {/* Datos del Remitente y Referencia */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.95rem', color: '#1B365D', borderBottom: '2px solid #E2E8F0', paddingBottom: '6px', marginBottom: '0.75rem' }}>
                      Datos del Remitente y Referencia
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div>
                        <strong>Remitente:</strong> {tramiteDetalle.remitente}
                        {tramiteDetalle.institucion_remitente && (
                          <div style={{ color: '#6C757D', fontSize: '0.85rem' }}>
                            Institución: {tramiteDetalle.institucion_remitente}
                          </div>
                        )}
                      </div>
                      <div>
                        <strong>CITE Externo:</strong> {tramiteDetalle.cite_externo || 'S/N'}
                      </div>
                    </div>
                    <div>
                      <strong>Referencia / Objeto:</strong>
                      <p style={{ margin: '4px 0 0', backgroundColor: '#FFFFFF', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: '4px', fontSize: '0.9rem' }}>
                        {tramiteDetalle.referencia}
                      </p>
                    </div>
                    {tramiteDetalle.instruccion && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <strong>Instrucción Oficial:</strong>
                        <div style={{ color: '#800000', fontStyle: 'italic', fontSize: '0.875rem' }}>
                          "{tramiteDetalle.instruccion}"
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Destinatario Institucional */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.95rem', color: '#1B365D', borderBottom: '2px solid #E2E8F0', paddingBottom: '6px', marginBottom: '0.75rem' }}>
                      Destinatario Institucional Asignado
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                      <div>
                        <small style={{ color: '#6C757D', display: 'block' }}>FUNCIONARIO RESPONSABLE</small>
                        <strong>{tramiteDetalle.destinatario_nombre || 'No especificado'}</strong>
                      </div>
                      <div>
                        <small style={{ color: '#6C757D', display: 'block' }}>CARGO INSTITUCIONAL</small>
                        <span>{tramiteDetalle.destinatario_cargo || '—'}</span>
                      </div>
                      <div>
                        <small style={{ color: '#6C757D', display: 'block' }}>UNIDAD / DEPENDENCIA</small>
                        <span>{tramiteDetalle.destinatario_unidad || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Documentos Adjuntos PDF (RF-07) */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.95rem', color: '#1B365D', borderBottom: '2px solid #E2E8F0', paddingBottom: '6px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Paperclip size={16} />
                      <span>Documentos Digitales Adjuntos ({tramiteDetalle.adjuntos?.length || 0})</span>
                    </h4>
                    {(!tramiteDetalle.adjuntos || tramiteDetalle.adjuntos.length === 0) ? (
                      <p style={{ color: '#6C757D', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        No se han incorporado archivos PDF adjuntos a este trámite.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {tramiteDetalle.adjuntos.map((adj) => (
                          <div
                            key={adj.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: '4px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <FileText size={18} color="#DC3545" />
                              <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1B365D' }}>
                                  {adj.nombre_original}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#6C757D' }}>
                                  {(adj.tamano_bytes / 1024).toFixed(1)} KB • Subido por: {adj.subido_por_nombre}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <a
                                href={adjuntosService.getViewUrl(adj.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                <ExternalLink size={12} />
                                <span>Ver</span>
                              </a>
                              <a
                                href={adjuntosService.getDownloadUrl(adj.id)}
                                download
                                className="btn btn-primary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                <Download size={12} />
                                <span>Descargar</span>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Historial de Movimientos / Timeline (RF-08.5) */}
                  <div>
                    <h4 style={{ fontSize: '0.95rem', color: '#1B365D', borderBottom: '2px solid #E2E8F0', paddingBottom: '6px', marginBottom: '0.75rem' }}>
                      Historial y Trazabilidad del Flujo
                    </h4>
                    {(!tramiteDetalle.historial || tramiteDetalle.historial.length === 0) ? (
                      <p style={{ color: '#6C757D', fontSize: '0.85rem' }}>No hay movimientos registrados.</p>
                    ) : (
                      <div style={{ borderLeft: '3px solid #1B365D', marginLeft: '8px', paddingLeft: '16px' }}>
                        {tramiteDetalle.historial.map((mov, idx) => {
                          const esRetroceso = mov.tipo_movimiento === 'RETROCESO' || Boolean(mov.justificacion_retroceso);
                          return (
                            <div key={idx} style={{ marginBottom: '1.25rem', position: 'relative' }}>
                              <div
                                style={{
                                  position: 'absolute',
                                  left: '-22px',
                                  top: '2px',
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  backgroundColor: esRetroceso ? '#D97706' : '#800000',
                                  border: '2px solid #FFFFFF'
                                }}
                              />
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 600, color: esRetroceso ? '#B45309' : '#1B365D', fontSize: '0.875rem' }}>
                                    Paso #{mov.orden}: {mov.actividad}
                                  </span>
                                  {esRetroceso && (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        backgroundColor: '#FEF3C7',
                                        color: '#92400E',
                                        border: '1px solid #FCD34D',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: '12px'
                                      }}
                                    >
                                      <RotateCcw size={10} />
                                      RETROCESO / DEVOLUCIÓN
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: '0.75rem', color: '#6C757D' }}>
                                  {formatFecha(mov.fecha)}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#495057', marginTop: '2px' }}>
                                <strong>Origen:</strong> {mov.unidad_origen} &nbsp;→&nbsp; <strong>Destino:</strong> {mov.unidad_destino || 'Ventanilla'}
                              </div>

                              {/* Justificación obligatoria de retroceso (RF-04.5, RF-05.4) */}
                              {mov.justificacion_retroceso && (
                                <div
                                  style={{
                                    backgroundColor: '#FFFBEB',
                                    border: '1px solid #FDE68A',
                                    borderLeft: '3px solid #D97706',
                                    borderRadius: '4px',
                                    padding: '6px 10px',
                                    marginTop: '4px',
                                    fontSize: '0.8rem',
                                    color: '#92400E'
                                  }}
                                >
                                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                                    <RotateCcw size={12} />
                                    <span>Justificación de la Devolución:</span>
                                  </div>
                                  <div>{mov.justificacion_retroceso}</div>
                                </div>
                              )}

                              {mov.proveido && (
                                <div
                                  style={{
                                    backgroundColor: '#F8F9FA',
                                    padding: '6px 10px',
                                    borderRadius: '4px',
                                    marginTop: '4px',
                                    fontSize: '0.8rem',
                                    color: '#212529',
                                    borderLeft: '2px solid #800000'
                                  }}
                                >
                                  {mov.proveido}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Printer size={14} />
                  <span>Imprimir Hoja de Ruta</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {tramiteDetalle && tramiteDetalle.estado === 'EN_ATENCION' && (
                  <button
                    type="button"
                    onClick={() => handleAbrirAtender(tramiteDetalle)}
                    className="btn btn-sm"
                    style={{
                      backgroundColor: '#0D9488',
                      borderColor: '#0D9488',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                    title="Registrar informe técnico / dictamen y marcar trámite como Atendido"
                  >
                    <CheckCircle2 size={14} />
                    <span>Concluir Atención</span>
                  </button>
                )}
                {tramiteDetalle && tramiteDetalle.historial && tramiteDetalle.historial.length > 1 &&
                 tramiteDetalle.estado !== 'CONCLUIDO' && tramiteDetalle.estado !== 'ANULADO' && tramiteDetalle.estado !== 'BLOQUEADO' && (
                  <button
                    type="button"
                    onClick={() => handleAbrirRetroceder(tramiteDetalle)}
                    className="btn btn-sm"
                    style={{
                      backgroundColor: '#D97706',
                      borderColor: '#D97706',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                    title="Retroceder trámite a la unidad remitente anterior con justificación obligatoria"
                  >
                    <RotateCcw size={14} />
                    <span>Retroceder Proceso</span>
                  </button>
                )}
                {tramiteDetalle && tramiteDetalle.estado === 'ATENDIDO' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAbrirDerivar(tramiteDetalle);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{
                      backgroundColor: '#800000',
                      borderColor: '#800000',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                    title="Derivación libre institucional (Avanzar trámite a otro destinatario)"
                  >
                    <Send size={14} />
                    <span>Derivar / Avanzar</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDetalleModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. MODAL DE DERIVACIÓN LIBRE / AVANZAR (RF-05.1, RF-03.9)
          ───────────────────────────────────────────────────────────── */}
      {derivarModalOpen && tramiteADerivar && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 11000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !derivando) {
              setDerivarModalOpen(false);
            }
          }}
        >
          <div
            className="modal-dialog"
            style={{ maxWidth: '780px', maxHeight: '92vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Send size={22} color="#800000" />
                <div>
                  <h3 style={{ margin: 0, color: '#1B365D', fontSize: '1.2rem' }}>
                    {derivarForm.esConclusion ? 'Conclusión y Archivado de Trámite' : 'Derivación Libre / Avanzar Proceso'}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#6C757D' }}>
                    Hoja de Ruta: <strong style={{ color: '#800000' }}>{tramiteADerivar.numero_correlativo}</strong> | Gestión {tramiteADerivar.gestion || gestion}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDerivarModalOpen(false)}
                className="modal-close-btn"
                disabled={derivando}
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              {/* Resumen del trámite a derivar */}
              <div
                style={{
                  backgroundColor: '#F8F9FA',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.88rem'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ color: '#6C757D', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                      Remitente Original:
                    </span>
                    <strong style={{ color: '#1B365D' }}>{tramiteADerivar.remitente}</strong>
                    {tramiteADerivar.cite_externo && (
                      <span style={{ fontSize: '0.75rem', color: '#800000', display: 'block' }}>
                        CITE: {tramiteADerivar.cite_externo}
                      </span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: '#6C757D', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                      Estado Actual:
                    </span>
                    <div>{renderBadgeEstado(tramiteADerivar.estado)}</div>
                  </div>
                </div>
                <div>
                  <span style={{ color: '#6C757D', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                    Referencia / Asunto:
                  </span>
                  <div style={{ color: '#212529', lineHeight: '1.4' }}>
                    {tramiteADerivar.referencia}
                  </div>
                </div>
              </div>

              {/* Opción Conclusión / Archivado (RF-05.7) */}
              <div
                style={{
                  backgroundColor: derivarForm.esConclusion ? '#F0FDF4' : '#FFFFFF',
                  border: derivarForm.esConclusion ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={derivarForm.esConclusion}
                    onChange={(e) => setDerivarForm({ ...derivarForm, esConclusion: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#28A745', cursor: 'pointer' }}
                  />
                  <div>
                    <strong style={{ color: derivarForm.esConclusion ? '#166534' : '#1B365D', fontSize: '0.9rem' }}>
                      Concluir y Archivar trámite en esta instancia (Finalizar ciclo de vida)
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#6C757D' }}>
                      Marque esta casilla si la gestión oficial ya ha finalizado y no requiere derivar el documento a otra oficina.
                    </div>
                  </div>
                </label>
              </div>

              {/* Si NO es conclusión: Selección de Destinatarios Institucionales */}
              {!derivarForm.esConclusion && (
                <>
                  {/* Destinatario Principal */}
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      padding: '1.25rem',
                      marginBottom: '1.25rem',
                      backgroundColor: '#FFFFFF',
                      borderLeft: '4px solid #1B365D'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                      <Building2 size={18} color="#1B365D" />
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1B365D' }}>
                        1. Destinatario Institucional Principal
                      </h4>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: '#6C757D', marginBottom: '1rem' }}>
                      Seleccione la Unidad Organizativa y el Cargo hacia donde se despacha el trámite. Opcionalmente puede asignar a un funcionario específico.
                    </p>

                    {/* Cascada Unidad -> Cargo */}
                    <InstitucionalSelectors
                      selectedCodU={derivarForm.codUDestino}
                      onUnidadChange={handleDerivarUnidadChange}
                      selectedCodCargo={derivarForm.codCargoDestino}
                      onCargoChange={handleDerivarCargoChange}
                      showBadges={false}
                    />

                    {/* Selector de Funcionario por CI o Nombre */}
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #E5E7EB' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#212529', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <UserCheck size={15} color="#800000" />
                        <span>Funcionario Asignado (Padrón de Personal por CI o Nombre, opcional):</span>
                      </label>
                      <EmpleadoSearchAutocomplete
                        currentCi={derivarForm.ciEmpleadoDestino}
                        onSelectEmpleado={handleDerivarSelectEmpleado}
                      />

                      {derivarForm.destinatarioNombre && (
                        <div
                          style={{
                            marginTop: '8px',
                            background: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            padding: '8px 12px',
                            borderRadius: '5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                              Funcionario Destinatario Seleccionado
                            </span>
                            <div style={{ fontWeight: 700, color: '#15803D', fontSize: '0.88rem' }}>
                              {derivarForm.destinatarioNombre} {derivarForm.ciEmpleadoDestino ? `(CI: ${derivarForm.ciEmpleadoDestino})` : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDerivarForm(prev => ({ ...prev, ciEmpleadoDestino: '', destinatarioNombre: '' }))}
                            style={{ background: 'transparent', border: 'none', color: '#DC3545', cursor: 'pointer', padding: '4px' }}
                            title="Quitar asignación específica de funcionario"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Destinatarios Adicionales (Con Copia - RF-03.9) */}
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      padding: '1.25rem',
                      marginBottom: '1.25rem',
                      backgroundColor: '#FFFFFF',
                      borderLeft: '4px solid #4A5568'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} color="#4A5568" />
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#2D3748' }}>
                          2. Destinatarios Adicionales (Con Copia Informativa - RF-03.9)
                        </h4>
                      </div>
                      {!mostrarAgregarCopia && (
                        <button
                          type="button"
                          onClick={() => setMostrarAgregarCopia(true)}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          <Plus size={13} />
                          <span>Agregar Copia</span>
                        </button>
                      )}
                    </div>

                    <p style={{ fontSize: '0.8rem', color: '#6C757D', marginBottom: '0.75rem' }}>
                      Seleccione o agregue otras dependencias o funcionarios que deban recibir una copia digital de esta derivación.
                    </p>

                    {/* Lista de copias registradas */}
                    {derivarForm.otrosDestinatarios.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '0.75rem' }}>
                        {derivarForm.otrosDestinatarios.map((copia, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '0.82rem'
                            }}
                          >
                            <div>
                              <strong>{copia.nombre || 'Funcionario asignado'}</strong> — {copia.cargo || 'Cargo'} ({copia.unidad || 'Unidad'})
                              <span className="badge badge-azul" style={{ marginLeft: '6px', fontSize: '0.68rem', padding: '1px 5px' }}>
                                COPIA
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleEliminarCopia(idx)}
                              style={{ background: 'transparent', border: 'none', color: '#DC3545', cursor: 'pointer', padding: '2px' }}
                              title="Remover copia"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: '#A0AEC0', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                        Sin destinatarios adicionales con copia.
                      </div>
                    )}

                    {/* Mini Formulario Inline para agregar copia */}
                    {mostrarAgregarCopia && (
                      <div
                        style={{
                          background: '#F8FAFC',
                          border: '1px dashed #CBD5E1',
                          padding: '12px',
                          borderRadius: '6px',
                          marginTop: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', display: 'block' }}>
                              Nombre o Funcionario:
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              style={{ fontSize: '0.8rem', padding: '5px 8px' }}
                              placeholder="Ej: Lic. Juan Pérez"
                              value={nuevaCopia.nombre}
                              onChange={(e) => setNuevaCopia({ ...nuevaCopia, nombre: e.target.value })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', display: 'block' }}>
                              Unidad / Dirección:
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              style={{ fontSize: '0.8rem', padding: '5px 8px' }}
                              placeholder="Ej: Asesoría Jurídica"
                              value={nuevaCopia.unidad}
                              onChange={(e) => setNuevaCopia({ ...nuevaCopia, unidad: e.target.value })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4B5563', display: 'block' }}>
                              Cargo:
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              style={{ fontSize: '0.8rem', padding: '5px 8px' }}
                              placeholder="Ej: Asesor Legal"
                              value={nuevaCopia.cargo}
                              onChange={(e) => setNuevaCopia({ ...nuevaCopia, cargo: e.target.value })}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => { setMostrarAgregarCopia(false); setNuevaCopia({ nombre: '', cargo: '', unidad: '' }); }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleAgregarCopia}
                            disabled={!nuevaCopia.nombre.trim() && !nuevaCopia.unidad.trim()}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '4px 10px', backgroundColor: '#1B365D', borderColor: '#1B365D' }}
                          >
                            Agregar Destinatario
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Sección 3: Instrucción y Proveído Oficial de Despacho (RF-06.1, RF-06.3) */}
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                  backgroundColor: '#FFFFFF',
                  borderLeft: '4px solid #800000'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                  <FileText size={18} color="#800000" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1B365D' }}>
                    {derivarForm.esConclusion ? '1. Decreto Final de Conclusión y Archivo' : '3. Instrucción y Proveído Oficial de Despacho'}
                  </h4>
                </div>

                {!derivarForm.esConclusion && (
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', marginBottom: '6px', display: 'block' }}>
                      Instrucción / Decreto Sugerido:
                    </label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {INSTRUCCIONES_SUGERIDAS_DERIVACION.map((inst, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="btn btn-sm"
                          style={{
                            fontSize: '0.72rem',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            backgroundColor: derivarForm.instruccion === inst ? '#800000' : '#F1F5F9',
                            color: derivarForm.instruccion === inst ? '#FFFFFF' : '#334155',
                            border: '1px solid ' + (derivarForm.instruccion === inst ? '#800000' : '#CBD5E1'),
                            cursor: 'pointer'
                          }}
                          onClick={() => setDerivarForm({ ...derivarForm, instruccion: inst })}
                        >
                          {inst}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#212529', marginBottom: '4px', display: 'block' }}>
                    {derivarForm.esConclusion ? 'Proveído de Conclusión (Motivo / Resumen del Cierre):' : 'Proveído de Despacho (Obligatorio):'} <span style={{ color: '#800000' }}>*</span>
                  </label>
                  <textarea
                    className="input-sucre"
                    rows={3}
                    value={derivarForm.proveido}
                    onChange={(e) => setDerivarForm({ ...derivarForm, proveido: e.target.value })}
                    placeholder={
                      derivarForm.esConclusion
                        ? 'Indique las razones o resumen de conclusión del trámite (ej: Atendido satisfactoriamente mediante informe N° 12/2026)...'
                        : 'Ingrese las observaciones, requerimientos o instrucciones específicas para el nuevo destinatario...'
                    }
                    style={{ width: '100%', resize: 'vertical', fontSize: '0.88rem' }}
                  />
                  <small style={{ color: '#6C757D', fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>
                    Este proveído quedará registrado inmutablemente en la Hoja de Ruta institucional.
                  </small>
                </div>
              </div>

              {/* Sección 4: Plazo SLA y Prioridad (Solo si no es conclusión) */}
              {!derivarForm.esConclusion && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '1rem',
                    backgroundColor: '#F8FAFC',
                    padding: '1rem',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#212529', marginBottom: '4px', display: 'block' }}>
                      Prioridad de Despacho:
                    </label>
                    <select
                      className="form-select"
                      style={{ fontSize: '0.85rem' }}
                      value={derivarForm.prioridad}
                      onChange={(e) => setDerivarForm({ ...derivarForm, prioridad: e.target.value })}
                    >
                      <option value="NORMAL">Normal (Según Flujo Regular)</option>
                      <option value="ALTA">Alta Prioridad (Requerimiento Urgente)</option>
                      <option value="URGENTE">Urgente (Plazo Inmediato)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#212529', marginBottom: '4px', display: 'block' }}>
                      Plazo Estimado de Respuesta (Días):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      className="form-control"
                      style={{ fontSize: '0.85rem' }}
                      value={derivarForm.diasPlazo}
                      onChange={(e) => setDerivarForm({ ...derivarForm, diasPlazo: e.target.value })}
                    />
                    <small style={{ color: '#6C757D', fontSize: '0.72rem', display: 'block', marginTop: '2px' }}>
                      Fecha límite estimada:{' '}
                      <strong>
                        {new Date(Date.now() + (parseInt(derivarForm.diasPlazo || 3, 10) * 86400000)).toLocaleDateString('es-BO')}
                      </strong>
                    </small>
                  </div>
                </div>
              )}

              {/* Mensaje de error de validación */}
              {derivarError && (
                <div
                  style={{
                    backgroundColor: '#FCE8E6',
                    color: '#B71C1C',
                    padding: '10px 14px',
                    borderRadius: '4px',
                    marginBottom: '1rem',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{derivarError}</span>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="modal-footer" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDerivarModalOpen(false)}
                disabled={derivando}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarDerivacion}
                disabled={derivando}
                className="btn btn-primary"
                style={{
                  backgroundColor: derivarForm.esConclusion ? '#28A745' : '#800000',
                  borderColor: derivarForm.esConclusion ? '#28A745' : '#800000',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {derivando ? (
                  <>
                    <RefreshCw size={14} className="spin-animation" />
                    <span>Procesando...</span>
                  </>
                ) : derivarForm.esConclusion ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirmar Conclusión y Archivado</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Confirmar y Despachar Trámite</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          9. MODAL DE RETROCESO DE PROCESO (RF-04.5, RF-05.4, RF-05.5)
          ───────────────────────────────────────────────────────────── */}
      {retrocederModalOpen && tramiteARetroceder && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 11000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !retrocediendo) {
              setRetrocederModalOpen(false);
            }
          }}
        >
          <div
            className="modal-dialog"
            style={{ maxWidth: '680px', maxHeight: '92vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div
              className="modal-header"
              style={{
                backgroundColor: '#FFFBEB',
                borderBottom: '1px solid #FDE68A',
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    backgroundColor: '#FEF3C7',
                    color: '#D97706',
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#92400E', fontWeight: 700 }}>
                    Retroceder Proceso (Devolución)
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#B45309' }}>
                    Devolución a la unidad o funcionario remitente previo con justificación obligatoria
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRetrocederModalOpen(false)}
                disabled={retrocediendo}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#92400E',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div
              className="modal-body"
              style={{
                padding: '1.5rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
            >
              {/* Tarjeta de Identificación del Trámite */}
              <div
                style={{
                  backgroundColor: '#F8F9FA',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '12px 16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6C757D', textTransform: 'uppercase' }}>
                    Trámite en Devolución
                  </span>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      backgroundColor: '#1B365D',
                      color: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8rem'
                    }}
                  >
                    {tramiteARetroceder.numero_correlativo}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1B365D', marginBottom: '4px' }}>
                  {tramiteARetroceder.asunto}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#495057', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  <span><strong>Tipo:</strong> {tramiteARetroceder.tipo_tramite_nombre || 'General'}</span>
                  <span><strong>Custodio actual:</strong> {tramiteARetroceder.unidad_actual_nombre || tramiteARetroceder.unidad_nombre || 'Mi Unidad'}</span>
                </div>
              </div>

              {/* Información del Destino de Retorno */}
              {loadingPasoPrevio ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6C757D', fontSize: '0.85rem', padding: '8px 0' }}>
                  <RefreshCw size={14} className="spin-animation" />
                  <span>Verificando historial y unidad remitente previa...</span>
                </div>
              ) : infoPasoPrevio?.sinPasoPrevio ? (
                <div
                  style={{
                    backgroundColor: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    color: '#991B1B',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>No es posible retroceder este trámite:</strong>
                    <div style={{ marginTop: '2px' }}>
                      Este trámite se encuentra en el primer paso de su flujo institucional (creación o ventanilla inicial). No cuenta con una unidad remitente previa a la cual devolverse.
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#92400E' }}>
                    <ArrowRight size={14} />
                    <span>DESTINO DE LA DEVOLUCIÓN:</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#78350F', fontWeight: 600 }}>
                    🏛️ {infoPasoPrevio?.unidadDestinoRetorno || 'Unidad Remitente Anterior'}
                  </div>
                  {infoPasoPrevio?.empleadoDestinoRetorno && (
                    <div style={{ fontSize: '0.8rem', color: '#92400E' }}>
                      👤 Funcionario remitente: <strong>{infoPasoPrevio.empleadoDestinoRetorno}</strong>
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#B45309', fontStyle: 'italic', marginTop: '2px' }}>
                    * El trámite cambiará a estado "POR RECIBIR" en la bandeja de entrada de dicha unidad.
                  </div>
                </div>
              )}

              {/* Justificaciones sugeridas rápidas */}
              {!infoPasoPrevio?.sinPasoPrevio && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#495057', marginBottom: '6px' }}>
                    Motivos sugeridos para devolución rápida:
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {JUSTIFICACIONES_SUGERIDAS_RETROCESO.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setJustificacionRetroceso(sug);
                          setRetrocederError(null);
                        }}
                        style={{
                          backgroundColor: justificacionRetroceso === sug ? '#FEF3C7' : '#FFFFFF',
                          borderColor: justificacionRetroceso === sug ? '#D97706' : '#E2E8F0',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderRadius: '16px',
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          color: justificacionRetroceso === sug ? '#92400E' : '#495057',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {justificacionRetroceso === sug && <Check size={11} />}
                        <span>{sug}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Campo Justificación Obligatoria */}
              {!infoPasoPrevio?.sinPasoPrevio && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1B365D' }}>
                      Justificación Obligatoria del Retroceso <span style={{ color: '#DC3545' }}>*</span>
                    </label>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: justificacionRetroceso.trim().length >= 5 ? '#28A745' : '#DC3545',
                        fontWeight: 600
                      }}
                    >
                      {justificacionRetroceso.trim().length} / mín. 5 caracteres
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="Detalle de forma obligatoria las observaciones, falta de requisitos o motivos técnicos por los cuales se retrocede el trámite..."
                    value={justificacionRetroceso}
                    onChange={(e) => {
                      setJustificacionRetroceso(e.target.value);
                      if (retrocederError) setRetrocederError(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      borderRadius: '4px',
                      borderColor: justificacionRetroceso.trim().length >= 5 ? '#28A745' : '#CED4DA',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#6C757D', marginTop: '4px' }}>
                    Esta justificación quedará registrada de forma inalterable en el historial del expediente (RF-05.4).
                  </div>
                </div>
              )}

              {/* Proveído opcional */}
              {!infoPasoPrevio?.sinPasoPrevio && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1B365D', marginBottom: '4px' }}>
                    Proveído / Instrucción Adicional de Devolución (Opcional)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Devolver para subsanación inmediata del punto 3..."
                    value={proveidoRetroceso}
                    onChange={(e) => setProveidoRetroceso(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      borderRadius: '4px',
                      borderColor: '#CED4DA'
                    }}
                  />
                </div>
              )}

              {/* Alerta de Error */}
              {retrocederError && (
                <div
                  style={{
                    backgroundColor: '#F8D7DA',
                    color: '#721C24',
                    border: '1px solid #F5C6CB',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{retrocederError}</span>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div
              className="modal-footer"
              style={{
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8F9FA'
              }}
            >
              <button
                type="button"
                onClick={() => setRetrocederModalOpen(false)}
                disabled={retrocediendo}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarRetroceso}
                disabled={retrocediendo || loadingPasoPrevio || infoPasoPrevio?.sinPasoPrevio || justificacionRetroceso.trim().length < 5}
                className="btn btn-primary"
                style={{
                  backgroundColor: '#D97706',
                  borderColor: '#D97706',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: (retrocediendo || loadingPasoPrevio || infoPasoPrevio?.sinPasoPrevio || justificacionRetroceso.trim().length < 5) ? 0.6 : 1,
                  cursor: (retrocediendo || loadingPasoPrevio || infoPasoPrevio?.sinPasoPrevio || justificacionRetroceso.trim().length < 5) ? 'not-allowed' : 'pointer'
                }}
              >
                {retrocediendo ? (
                  <>
                    <RefreshCw size={14} className="spin-animation" />
                    <span>Registrando Devolución...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={15} />
                    <span>Confirmar Devolución / Retroceder</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          10. MODAL DE ATENCIÓN / CONCLUIR ATENCIÓN (OPCIÓN 2)
          ───────────────────────────────────────────────────────────── */}
      {atenderModalOpen && tramiteAAtender && (
        <div
          className="modal-backdrop"
          style={{
            zIndex: 11000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !atendiendo) {
              setAtenderModalOpen(false);
            }
          }}
        >
          <div
            className="modal-dialog"
            style={{
              maxWidth: '650px',
              width: '94%',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div
              className="modal-header"
              style={{
                backgroundColor: '#0F766E',
                color: '#FFFFFF',
                padding: '1rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '2px solid #0D9488'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CheckCircle2 size={20} style={{ color: '#5EEAD4' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Concluir Atención Técnica / Marcar Atendido
                  </h3>
                  <span style={{ fontSize: '0.78rem', opacity: 0.9, color: '#CCFBF1' }}>
                    Trámite: <strong>{tramiteAAtender.codigo}</strong> • {tramiteAAtender.tipoTramiteNombre || 'Trámite'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAtenderModalOpen(false)}
                disabled={atendiendo}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: atendiendo ? 'not-allowed' : 'pointer',
                  opacity: 0.8
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div
              className="modal-body"
              style={{
                padding: '1.5rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.1rem'
              }}
            >
              {/* Resumen del trámite */}
              <div
                style={{
                  backgroundColor: '#F0FDFA',
                  border: '1px solid #99F6E4',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#0F766E', fontSize: '0.9rem' }}>
                    {tramiteAAtender.codigo}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: '#FEF3C7',
                      color: '#92400E'
                    }}
                  >
                    Estado actual: EN ATENCIÓN
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                  <strong>Asunto:</strong> {tramiteAAtender.asunto}
                </div>
                {tramiteAAtender.remitenteNombre && (
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    <strong>Remitente:</strong> {tramiteAAtender.remitenteNombre} ({tramiteAAtender.remitenteInstitucion || 'Particular'})
                  </div>
                )}
              </div>

              {/* Explicación del estado */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderLeft: '4px solid #0D9488',
                  padding: '10px 14px',
                  fontSize: '0.8rem',
                  color: '#475569',
                  borderRadius: '0 4px 4px 0'
                }}
              >
                <strong>¿Qué sucede al marcar como Atendido?</strong>
                <p style={{ margin: '4px 0 0 0' }}>
                  El trámite pasará al estado <span style={{ color: '#0F766E', fontWeight: 700 }}>🟢 ATENDIDO</span> en su bandeja de Recibidos. Esto certifica que el informe, revisión técnica o respuesta interna en esta unidad ha sido finalizada y está lista para ser despachada formalmente (<span style={{ fontWeight: 600 }}>Avanzar</span>) a su siguiente destino.
                </p>
              </div>

              {/* Nombre de la actividad o informe opcional */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '4px'
                  }}
                >
                  Actividad Realizada / Tipo de Dictamen:
                </label>
                <input
                  type="text"
                  value={actividadNombreAtencion}
                  onChange={(e) => setActividadNombreAtencion(e.target.value)}
                  placeholder="Ej: Evaluación técnica completada, Informe INF-042/2026, Revisión de requisitos..."
                  className="form-control"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              {/* Textarea de Proveído / Conclusión Técnica */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#1E293B'
                    }}
                  >
                    Proveído / Dictamen Técnico Conclusivo: <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    Mínimo 3 caracteres
                  </span>
                </div>
                <textarea
                  value={proveidoAtencion}
                  onChange={(e) => setProveidoAtencion(e.target.value)}
                  placeholder="Escriba la conclusión de la atención técnica o el resultado del análisis efectuado..."
                  className="form-control"
                  rows={4}
                  style={{
                    fontSize: '0.85rem',
                    resize: 'vertical',
                    borderColor: proveidoAtencion.trim().length > 0 && proveidoAtencion.trim().length < 3 ? '#DC2626' : undefined
                  }}
                />

                {/* Chips de sugerencias */}
                <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', alignSelf: 'center', marginRight: '4px' }}>
                    Sugerencias:
                  </span>
                  {PROVEIDOS_SUGERIDOS_ATENCION.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProveidoAtencion(sug)}
                      className="btn btn-sm btn-outline-secondary"
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 7px',
                        borderRadius: '12px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#F8FAFC',
                        color: '#334155'
                      }}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error si existe */}
              {atenderError && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #F87171',
                    color: '#991B1B',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{atenderError}</span>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div
              className="modal-footer"
              style={{
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8F9FA'
              }}
            >
              <button
                type="button"
                onClick={() => setAtenderModalOpen(false)}
                disabled={atendiendo}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAtender}
                disabled={atendiendo || proveidoAtencion.trim().length < 3}
                className="btn btn-primary"
                style={{
                  backgroundColor: '#0D9488',
                  borderColor: '#0D9488',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: (atendiendo || proveidoAtencion.trim().length < 3) ? 0.6 : 1,
                  cursor: (atendiendo || proveidoAtencion.trim().length < 3) ? 'not-allowed' : 'pointer'
                }}
              >
                {atendiendo ? (
                  <>
                    <RefreshCw size={14} className="spin-animation" />
                    <span>Guardando Dictamen...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Concluir Atención (Marcar Atendido)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
