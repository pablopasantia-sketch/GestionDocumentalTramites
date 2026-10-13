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
  RotateCcw,
  Activity,
  History,
  Timer,
  Award,
  FileCheck,
  PenTool,
  Stamp,
  CheckCheck
} from 'lucide-react';
import { tramitesService, adjuntosService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import InstitucionalSelectors from '../components/institucional/InstitucionalSelectors';
import EmpleadoSearchAutocomplete from '../components/institucional/EmpleadoSearchAutocomplete';

const INSTRUCCIONES_SUGERIDAS_DERIVACION = [
  'Para su atención y trámite correspondiente según normativa',
  'Para informe técnico y dictamen pertinente',
  'Para análisis y formulación de informe de comisión (plazo reglamentario)',
  'Para proyecto de Minuta de Comunicación / PIE / PIO',
  'Para visto bueno y firma de aprobación',
  'Para conocimiento y fines consiguientes',
  'Para elaboración de nota de respuesta oficial',
  'Para archivo y custodia definitiva'
];

const PLAZOS_REGLAMENTARIOS_CMS = [
  { dias: 5, label: '5 Días Hábiles', subtitulo: 'Urgente / Preferente', color: '#B91C1C', bg: '#FEF2F2', border: '#FCA5A5' },
  { dias: 10, label: '10 Días Hábiles', subtitulo: 'Ordinario Estándar CMS', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
  { dias: 15, label: '15 Días Hábiles', subtitulo: 'Máximo de Comisión CMS', color: '#854D0E', bg: '#FEFCE8', border: '#FDE047' }
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

const INSTRUMENTOS_LEGISLATIVOS_CMS = [
  {
    id: 'INFORME',
    sigla: 'INF',
    nombre: 'Informe Técnico / Legal',
    descripcion: 'Dictamen técnico o jurídico ordinario de la comisión o unidad.',
    color: '#0F766E',
    bg: '#F0FDFA',
    border: '#99F6E4',
    icono: '📄'
  },
  {
    id: 'PIE',
    sigla: 'PIE',
    nombre: 'Petición de Informe Escrito (PIE)',
    descripcion: 'Solicitud formal por escrito al Ejecutivo Municipal u otra instancia.',
    color: '#1E40AF',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    icono: '📝'
  },
  {
    id: 'PIO',
    sigla: 'PIO',
    nombre: 'Petición de Informe Oral (PIO)',
    descripcion: 'Convocatoria a comparecencia oral ante el Pleno o Comisión.',
    color: '#6B21A8',
    bg: '#FAF5FF',
    border: '#E9D5FF',
    icono: '🗣️'
  },
  {
    id: 'MINUTA',
    sigla: 'MINUTA',
    nombre: 'Minuta de Comunicación',
    descripcion: 'Recomendación legislativa oficial al Órgano Ejecutivo Municipal.',
    color: '#B45309',
    bg: '#FEFCE8',
    border: '#FDE047',
    icono: '📜'
  },
  {
    id: 'RESOLUCION',
    sigla: 'RESOLUCIÓN',
    nombre: 'Resolución Municipal / Proyecto Normativo',
    descripcion: 'Norma de carácter legislativo o administrativo aprobada por el CMS.',
    color: '#800000',
    bg: '#FFF5F5',
    border: '#FECACA',
    icono: '⚖️'
  },
  {
    id: 'NOTA_EXTERNA',
    sigla: 'NOTA',
    nombre: 'Nota Externa de Contestación',
    descripcion: 'Oficio de respuesta oficial a peticionarios, juntas vecinales o entidades.',
    color: '#334155',
    bg: '#F8FAFC',
    border: '#CBD5E1',
    icono: '✉️'
  }
];

const PROVEIDOS_POR_INSTRUMENTO = {
  INFORME: 'Informe técnico y dictamen legal de comisión elaborado conforme a normativa vigente.',
  PIE: 'Proyecto de Petición de Informe Escrito (P.I.E.) elaborado y visado para consideración y remisión al Pleno.',
  PIO: 'Proyecto de Petición de Informe Oral (P.I.O.) formulado para su tratamiento en Sesión Plenaria del CMS.',
  MINUTA: 'Proyecto de Minuta de Comunicación redactado recomendando acciones concretas al Ejecutivo Municipal.',
  RESOLUCION: 'Proyecto de Resolución Municipal elaborado con fundamentación técnica y legal para tratamiento plenario.',
  NOTA_EXTERNA: 'Proyecto de Nota Externa de Contestación elaborado para suscripción de Presidencia del Concejo Municipal.'
};

const getInstrumentoInfo = (codigo) => {
  if (!codigo) return null;
  const match = INSTRUMENTOS_LEGISLATIVOS_CMS.find(i => i.id === codigo || i.sigla === codigo);
  if (match) return match;
  return {
    id: codigo,
    sigla: codigo,
    nombre: codigo,
    descripcion: 'Instrumento normativo institucional',
    color: '#1E293B',
    bg: '#F1F5F9',
    border: '#CBD5E1',
    icono: '📄'
  };
};

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

  // Modal de Concluir Atención / Marcar Atendido (Sprint 3 & CMS)
  const [atenderModalOpen, setAtenderModalOpen] = useState(false);
  const [tramiteAAtender, setTramiteAAtender] = useState(null);
  const [instrumentoGeneradoAtencion, setInstrumentoGeneradoAtencion] = useState('INFORME');
  const [instrumentosAtencion, setInstrumentosAtencion] = useState(['INFORME']);
  const [diasPlazoAtencion, setDiasPlazoAtencion] = useState(10);
  const [archivoPdfAtencion, setArchivoPdfAtencion] = useState(null);
  const [proveidoAtencion, setProveidoAtencion] = useState('');
  const [actividadNombreAtencion, setActividadNombreAtencion] = useState('Informe y dictamen técnico de comisión');
  const [atendiendo, setAtendiendo] = useState(false);
  const [atenderError, setAtenderError] = useState(null);

  // Modal de Constancia de Sesión del Pleno del CMS
  const [plenoModalOpen, setPlenoModalOpen] = useState(false);
  const [tramiteAPleno, setTramiteAPleno] = useState(null);
  const [sesionPlenoNro, setSesionPlenoNro] = useState('');
  const [sesionPlenoFecha, setSesionPlenoFecha] = useState(new Date().toISOString().slice(0, 16));
  const [sesionPlenoResultado, setSesionPlenoResultado] = useState('APROBADO_UNANIMIDAD');
  const [proveidoPleno, setProveidoPleno] = useState('');
  const [instrumentoPleno, setInstrumentoPleno] = useState('MINUTA');
  const [guardandoPleno, setGuardandoPleno] = useState(false);
  const [plenoError, setPlenoError] = useState(null);

  // Modal de Registro de Firmas Duales Concurrentes (Presidencia y Secretaría General CMS)
  const [firmasModalOpen, setFirmasModalOpen] = useState(false);
  const [tramiteAFirmas, setTramiteAFirmas] = useState(null);
  const [observacionesFirma, setObservacionesFirma] = useState('');
  const [firmando, setFirmando] = useState(false);
  const [firmasError, setFirmasError] = useState(null);

  // Modal de Despacho Final al Ejecutivo / Destino Externo
  const [despachoModalOpen, setDespachoModalOpen] = useState(false);
  const [tramiteADespacho, setTramiteADespacho] = useState(null);
  const [citeDespacho, setCiteDespacho] = useState('');
  const [destinatarioFinal, setDestinatarioFinal] = useState('Dr. Enrique Leaño Palenque - Alcalde Municipal de Sucre');
  const [proveidoDespacho, setProveidoDespacho] = useState('');
  const [despachando, setDespachando] = useState(false);
  const [despachoError, setDespachoError] = useState(null);

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
      modoAsignacion: 'REGULAR', // 'REGULAR' | 'SUBASIGNACION_COMISION'
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
      diasPlazo: 10, // Estándar reglamentario CMS
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

  // Abrir modal de Concluir Atención / Marcar Atendido (Sprint 3 & CMS)
  const toggleInstrumentoAtencion = (id) => {
    setInstrumentosAtencion(prev => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter(x => x !== id) : [...prev, id];
      const result = updated.length > 0 ? updated : [id];
      setInstrumentoGeneradoAtencion(result[0]);
      if (PROVEIDOS_POR_INSTRUMENTO[id] && !exists) {
        setProveidoAtencion(PROVEIDOS_POR_INSTRUMENTO[id]);
      }
      return result;
    });
  };

  const handleAbrirAtender = (tramite) => {
    setTramiteAAtender(tramite);
    setInstrumentosAtencion(['INFORME']);
    setInstrumentoGeneradoAtencion('INFORME');
    setDiasPlazoAtencion(10);
    setArchivoPdfAtencion(null);
    setProveidoAtencion(PROVEIDOS_POR_INSTRUMENTO.INFORME || '');
    setActividadNombreAtencion('Informe y dictamen técnico de comisión');
    setAtenderError(null);
    setAtenderModalOpen(true);
  };

  // Confirmar conclusión de atención técnica (cambio a ATENDIDO con Instrumentos Legislativos y PDF opcional)
  const handleConfirmarAtender = async () => {
    if (!tramiteAAtender) return;

    if (!proveidoAtencion || proveidoAtencion.trim().length < 3) {
      setAtenderError('Debe ingresar un informe técnico, dictamen o proveído de atención (mínimo 3 caracteres).');
      return;
    }

    setAtendiendo(true);
    setAtenderError(null);

    try {
      // 1. Adjuntar archivo PDF de informe/proyecto normativo si fue provisto
      if (archivoPdfAtencion) {
        const formData = new FormData();
        formData.append('archivo', archivoPdfAtencion);
        await adjuntosService.upload(tramiteAAtender.id, formData);
      }

      // 2. Registrar marcación de atención técnica con instrumentos y plazo SLA
      const instrumentosStr = instrumentosAtencion.length > 0 ? instrumentosAtencion.join(',') : (instrumentoGeneradoAtencion || 'INFORME');
      const payload = {
        proveido: proveidoAtencion.trim(),
        actividad_nombre: actividadNombreAtencion.trim() || 'Informe y atención técnica concluida',
        instrumento_generado: instrumentosAtencion[0] || 'INFORME',
        instrumentos_generados: instrumentosStr,
        dias_plazo: diasPlazoAtencion ? parseInt(diasPlazoAtencion, 10) : null
      };

      await tramitesService.marcarAtendido(tramiteAAtender.id, payload);

      setAlertSuccess(`¡Trámite ${tramiteAAtender.numero_correlativo} marcado como ATENDIDO exitosamente con instrumento(s) [${instrumentosStr}]! Listo para ser despachado.`);
      setAtenderModalOpen(false);
      setTramiteAAtender(null);
      setArchivoPdfAtencion(null);
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

  // Handlers para Circuito Plenario CMS
  const handleAbrirPleno = (tramite) => {
    setTramiteAPleno(tramite);
    const yr = new Date().getFullYear();
    const sugeridoNro = tramite.sesion_pleno_nro || `Sesión Ordinaria N° 045/${yr}`;
    setSesionPlenoNro(sugeridoNro);
    setSesionPlenoFecha(new Date().toISOString().slice(0, 16));
    setSesionPlenoResultado(tramite.sesion_pleno_resultado || 'APROBADO_UNANIMIDAD');
    setProveidoPleno(tramite.ultimo_proveido || 'Aprobado y resuelto por el Pleno Camaral del Concejo Municipal de Sucre.');
    setInstrumentoPleno(tramite.ultimo_instrumento_generado || tramite.ult_instrumento_generado || 'MINUTA');
    setPlenoError(null);
    setPlenoModalOpen(true);
  };

  const handleConfirmarPleno = async () => {
    if (!tramiteAPleno) return;
    if (!sesionPlenoNro || sesionPlenoNro.trim().length < 3) {
      setPlenoError('Debe ingresar el número o denominación de la Sesión del Pleno (ej: Sesión Ordinaria N° 045/2026).');
      return;
    }
    setGuardandoPleno(true);
    setPlenoError(null);
    try {
      const payload = {
        sesion_pleno_nro: sesionPlenoNro.trim(),
        sesion_pleno_fecha: sesionPlenoFecha ? new Date(sesionPlenoFecha).toISOString() : new Date().toISOString(),
        sesion_pleno_resultado: sesionPlenoResultado,
        proveido: proveidoPleno.trim() || undefined,
        instrumento_generado: instrumentoPleno || undefined
      };
      await tramitesService.registrarAprobacionPleno(tramiteAPleno.id, payload);
      setAlertSuccess(`¡Constancia de Aprobación en ${sesionPlenoNro} registrada exitosamente! Listo para firmas duales reglamentarias.`);
      setPlenoModalOpen(false);
      setTramiteAPleno(null);
      if (detalleModalOpen && tramiteDetalle?.id === tramiteAPleno.id) {
        handleVerDetalle(tramiteAPleno.id);
      }
      cargarDatos();
      cargarResumen();
      setTimeout(() => setAlertSuccess(null), 6000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al registrar aprobación del Pleno.';
      setPlenoError(msg);
    } finally {
      setGuardandoPleno(false);
    }
  };

  // Handlers para Firmas Duales Concurrentes CMS
  const handleAbrirFirmas = async (tramite) => {
    setTramiteAFirmas(tramite);
    setObservacionesFirma('');
    const norm = {
      ...tramite,
      firma_presidencia: Boolean(tramite.firma_presidencia ?? tramite.firmaPresidencia),
      firma_secretaria: Boolean(tramite.firma_secretaria ?? tramite.firmaSecretaria)
    };
    setTramiteAFirmas(norm);
    setObservacionesFirma('');
    setFirmasError(null);
    setFirmasModalOpen(true);
    try {
      const res = await tramitesService.getById(tramite.id);
      if (res && res.data) {
        const d = res.data;
        setTramiteAFirmas({
          ...d,
          firma_presidencia: Boolean(d.firma_presidencia ?? d.firmaPresidencia),
          firma_secretaria: Boolean(d.firma_secretaria ?? d.firmaSecretaria)
        });
      }
    } catch (e) {
      console.error('Error al cargar detalle de firmas:', e);
    }
  };

  const handleFirmar = async (tipoFirma) => {
    if (!tramiteAFirmas) return;
    setFirmando(true);
    setFirmasError(null);
    try {
      const payload = {
        tipo_firma: tipoFirma,
        observaciones: observacionesFirma.trim() || undefined
      };
      await tramitesService.registrarFirmaDual(tramiteAFirmas.id, payload);
      const res = await tramitesService.getById(tramiteAFirmas.id);
      if (res && res.data) {
        const d = res.data;
        const norm = {
          ...d,
          firma_presidencia: Boolean(d.firma_presidencia ?? d.firmaPresidencia),
          firma_secretaria: Boolean(d.firma_secretaria ?? d.firmaSecretaria)
        };
        setTramiteAFirmas(norm);
        if (detalleModalOpen && tramiteDetalle?.id === tramiteAFirmas.id) {
          setTramiteDetalle(norm);
        }
      }
      const cargoTexto = tipoFirma === 'PRESIDENCIA' ? 'Presidencia del CMS' : 'Secretaría General del CMS';
      setAlertSuccess(`¡Rúbrica oficial de ${cargoTexto} estampada correctamente en el expediente!`);
      cargarDatos();
      cargarResumen();
      setTimeout(() => setAlertSuccess(null), 6000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al estampar firma dual.';
      setFirmasError(msg);
    } finally {
      setFirmando(false);
    }
  };

  // Handlers para Despacho Final al Ejecutivo
  const handleAbrirDespacho = async (tramite) => {
    const norm = {
      ...tramite,
      firma_presidencia: Boolean(tramite.firma_presidencia ?? tramite.firmaPresidencia),
      firma_secretaria: Boolean(tramite.firma_secretaria ?? tramite.firmaSecretaria)
    };
    setTramiteADespacho(norm);
    const yr = new Date().getFullYear();
    setCiteDespacho(`CMS-DESP-0${tramite.id}/${yr}`);
    setDestinatarioFinal('Dr. Enrique Leaño Palenque - Alcalde Municipal de Sucre');
    setProveidoDespacho('Remisión formal de instrumento normativo aprobado por el Pleno Camaral del CMS para su promulgación y estricto cumplimiento.');
    setDespachoError(null);
    setDespachoModalOpen(true);
    try {
      const res = await tramitesService.getById(tramite.id);
      if (res && res.data) {
        const d = res.data;
        setTramiteADespacho({
          ...d,
          firma_presidencia: Boolean(d.firma_presidencia ?? d.firmaPresidencia),
          firma_secretaria: Boolean(d.firma_secretaria ?? d.firmaSecretaria)
        });
      }
    } catch (e) {
      console.error('Error al refrescar estado de firmas para despacho:', e);
    }
  };

  const handleConfirmarDespacho = async () => {
    if (!tramiteADespacho) return;
    if (!citeDespacho || citeDespacho.trim().length < 3) {
      setDespachoError('Debe indicar el CITE o número oficial de oficio saliente del CMS.');
      return;
    }
    if (!destinatarioFinal || destinatarioFinal.trim().length < 3) {
      setDespachoError('Debe especificar el destinatario final institucional.');
      return;
    }
    const fp = Boolean(tramiteADespacho.firma_presidencia ?? tramiteADespacho.firmaPresidencia);
    const fs = Boolean(tramiteADespacho.firma_secretaria ?? tramiteADespacho.firmaSecretaria);
    if (!fp || !fs) {
      setDespachoError('DESPACHO BLOQUEADO: Se requiere el registro concurrente de ambas firmas duales (Presidencia y Secretaría General) antes de proceder con el despacho.');
      return;
    }
    setDespachando(true);
    setDespachoError(null);
    try {
      const payload = {
        cite_despacho: citeDespacho.trim(),
        destinatario_final: destinatarioFinal.trim(),
        proveido: proveidoDespacho.trim() || undefined
      };
      await tramitesService.despachoFinal(tramiteADespacho.id, payload);
      setAlertSuccess(`¡Despacho Final bajo CITE ${citeDespacho} remitido exitosamente! Trámite formalmente concluido.`);
      setDespachoModalOpen(false);
      setTramiteADespacho(null);
      if (detalleModalOpen && tramiteDetalle?.id === tramiteADespacho.id) {
        handleVerDetalle(tramiteADespacho.id);
      }
      cargarDatos();
      cargarResumen();
      setTimeout(() => setAlertSuccess(null), 6000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al procesar Despacho Final.';
      setDespachoError(msg);
    } finally {
      setDespachando(false);
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
      case 'APROBADO_PLENO':
        return <span className="badge" style={{ backgroundColor: '#1E3A8A', color: '#FFFFFF', fontWeight: 700 }}>🏛️ APROBADO EN PLENO</span>;
      case 'RECHAZADO_PLENO':
        return <span className="badge badge-alerta" style={{ fontWeight: 700 }}>❌ RECHAZADO EN PLENO</span>;
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

  // Helper de semaforización de alertas SLA y plazos reglamentarios CMS
  const renderSlaSemaforo = (item) => {
    if (!item || !item.fecha_limite_respuesta) {
      return (
        <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontStyle: 'italic' }}>
          Sin plazo fijado
        </span>
      );
    }

    const isVencido = item.es_vencido || (item.dias_restantes != null && item.dias_restantes < 0);
    const dias = item.dias_restantes;
    const fechaObj = new Date(item.fecha_limite_respuesta);
    const fechaStr = !isNaN(fechaObj.getTime()) ? fechaObj.toLocaleDateString('es-BO') : item.fecha_limite_respuesta;

    if (isVencido) {
      const diasRetraso = dias != null ? Math.abs(dias) : 0;
      return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
          <span
            className="badge"
            style={{
              backgroundColor: '#DC2626',
              color: 'white',
              fontSize: '10.5px',
              padding: '2px 7px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
              borderRadius: '4px',
              boxShadow: '0 1px 3px rgba(220, 38, 38, 0.25)'
            }}
          >
            <AlertCircle size={11} />
            <span>VENCIDO {diasRetraso > 0 ? `(${diasRetraso}d)` : ''}</span>
          </span>
          <span style={{ fontSize: '0.7rem', color: '#991B1B', fontWeight: 600 }}>
            Límite: {fechaStr}
          </span>
        </div>
      );
    }

    // Alerta Crítica: 0 a 2 días restantes
    if (dias != null && dias <= 2) {
      return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
          <span
            className="badge"
            style={{
              backgroundColor: '#EA580C',
              color: 'white',
              fontSize: '10.5px',
              padding: '2px 7px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
              borderRadius: '4px',
              boxShadow: '0 1px 3px rgba(234, 88, 12, 0.2)'
            }}
          >
            <Clock size={11} />
            <span>{dias === 0 ? '¡VENCE HOY!' : `CRÍTICO (${dias}d)`}</span>
          </span>
          <span style={{ fontSize: '0.7rem', color: '#C2410C', fontWeight: 600 }}>
            Límite: {fechaStr}
          </span>
        </div>
      );
    }

    // Alerta Amarilla: 3 a 5 días restantes (Atención reglamentaria)
    if (dias != null && dias <= 5) {
      return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
          <span
            className="badge"
            style={{
              backgroundColor: '#D97706',
              color: 'white',
              fontSize: '10.5px',
              padding: '2px 7px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
              borderRadius: '4px'
            }}
          >
            <Clock size={11} />
            <span>ATENCIÓN ({dias}d)</span>
          </span>
          <span style={{ fontSize: '0.7rem', color: '#B45309' }}>
            Límite: {fechaStr}
          </span>
        </div>
      );
    }

    // Verde: Más de 5 días (En plazo reglamentario)
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
        <span
          className="badge"
          style={{
            backgroundColor: '#16A34A',
            color: 'white',
            fontSize: '10.5px',
            padding: '2px 7px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 600,
            borderRadius: '4px'
          }}
        >
          <Clock size={11} />
          <span>EN PLAZO ({dias != null ? `${dias}d` : 'OK'})</span>
        </span>
        <span style={{ fontSize: '0.7rem', color: '#15803D' }}>
          Límite: {fechaStr}
        </span>
      </div>
    );
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

  // Helper para formato amigable de duración (RF-08.8)
  const formatMinutos = (mins) => {
    if (mins === undefined || mins === null || mins <= 0) return 'Menos de 1 min';
    const dias = Math.floor(mins / (60 * 24));
    const horas = Math.floor((mins % (60 * 24)) / 60);
    const m = mins % 60;
    const parts = [];
    if (dias > 0) parts.push(`${dias}d`);
    if (horas > 0) parts.push(`${horas}h`);
    if (m > 0 || parts.length === 0) parts.push(`${m}m`);
    return parts.join(' ');
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
              <option value="TODOS">Todos los Trámites Externos</option>
              <option value="CORRESPONDENCIA">Correspondencia Oficial Externa (CM, CDE, CDH)</option>
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
                const isVencido = item.es_vencido || (item.dias_restantes != null && item.dias_restantes < 0);
                const isCritico = !isVencido && item.dias_restantes != null && item.dias_restantes <= 2;
                const isAtencion = !isVencido && item.dias_restantes != null && item.dias_restantes > 2 && item.dias_restantes <= 5;
                const esPorRecibir = item.estado === 'POR_RECIBIR' || item.estado === 'EN_TRANSITO';

                return (
                  <tr
                    key={item.id}
                    style={{
                      backgroundColor: isVencido ? '#FFF5F5' : isCritico ? '#FFFBEB' : isAtencion ? '#FEFCE8' : undefined,
                      borderLeft: isVencido ? '4px solid #DC2626' : isCritico ? '4px solid #EA580C' : isAtencion ? '4px solid #F59E0B' : undefined
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
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1B365D', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        <span>{item.actividad_actual || 'Atención institucional'}</span>
                        {item.actividad_actual && item.actividad_actual.toLowerCase().includes('comisión') && (
                          <span className="badge" style={{ backgroundColor: '#047857', color: 'white', fontSize: '9px', padding: '1px 5px', fontWeight: 700 }}>
                            COMISIÓN
                          </span>
                        )}
                        {item.ult_instrumento_generado && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: getInstrumentoInfo(item.ult_instrumento_generado)?.color || '#800000',
                              color: 'white',
                              fontSize: '9px',
                              padding: '1px 5px',
                              fontWeight: 700
                            }}
                          >
                            {getInstrumentoInfo(item.ult_instrumento_generado)?.icono} {getInstrumentoInfo(item.ult_instrumento_generado)?.sigla}
                          </span>
                        )}
                        {item.sesion_pleno_nro && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: '#1E3A8A',
                              color: 'white',
                              fontSize: '9px',
                              padding: '1px 5px',
                              fontWeight: 700
                            }}
                            title={`Sesión Pleno: ${item.sesion_pleno_nro} (${item.sesion_pleno_resultado || 'Aprobado'})`}
                          >
                            🏛️ {item.sesion_pleno_nro}
                          </span>
                        )}
                        {(item.firma_presidencia || item.firma_secretaria || item.sesion_pleno_nro) && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: (item.firma_presidencia && item.firma_secretaria) ? '#059669' : (item.firma_presidencia || item.firma_secretaria) ? '#D97706' : '#6B7280',
                              color: 'white',
                              fontSize: '9px',
                              padding: '1px 5px',
                              fontWeight: 700
                            }}
                            title={
                              item.firma_presidencia && item.firma_secretaria
                                ? 'Firmas duales concurrentes completas (Presidencia y Secretaría)'
                                : item.firma_presidencia
                                ? 'Firma Presidencia registrada. Pendiente Secretaría General'
                                : item.firma_secretaria
                                ? 'Firma Secretaría General registrada. Pendiente Presidencia'
                                : 'Pendiente de firmas duales concurrentes'
                            }
                          >
                            ✍️ Duales {item.firma_presidencia && item.firma_secretaria ? '2/2' : (item.firma_presidencia || item.firma_secretaria) ? '1/2' : '0/2'}
                          </span>
                        )}
                        {item.despacho_final_cite && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: '#7C3AED',
                              color: 'white',
                              fontSize: '9px',
                              padding: '1px 5px',
                              fontWeight: 700
                            }}
                            title={`Despacho Final bajo CITE ${item.despacho_final_cite}`}
                          >
                            📬 {item.despacho_final_cite}
                          </span>
                        )}
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
                      <div style={{ fontSize: '0.75rem', color: '#495057', marginBottom: '4px' }}>
                        {formatFecha(item.fecha_recepcion || item.fecha_envio || item.fecha_creacion)}
                      </div>
                      {renderSlaSemaforo(item)}
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

                        {/* 5. Acción CMS: Sesión Plenario */}
                        {item.estado !== 'CONCLUIDO' && item.estado !== 'ANULADO' && (
                          <button
                            onClick={() => handleAbrirPleno(item)}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: '#1E3A8A',
                              color: '#FFFFFF',
                              padding: '5px 8px',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Constancia de Aprobación en Sesión del Pleno del CMS"
                          >
                            <Award size={13} />
                            <span>Pleno</span>
                          </button>
                        )}

                        {/* 6. Acción CMS: Firmas Duales Concurrentes */}
                        {item.estado !== 'CONCLUIDO' && item.estado !== 'ANULADO' && (
                          <button
                            onClick={() => handleAbrirFirmas(item)}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: (item.firma_presidencia && item.firma_secretaria) ? '#059669' : '#0284C7',
                              color: '#FFFFFF',
                              padding: '5px 8px',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Rúbricas Duales Concurrentes: Presidencia CMS y Secretaría General CMS"
                          >
                            <Stamp size={13} />
                            <span>Firmas {item.firma_presidencia && item.firma_secretaria ? '✓' : ''}</span>
                          </button>
                        )}

                        {/* 7. Acción CMS: Despacho Final al Ejecutivo */}
                        {item.estado !== 'CONCLUIDO' && item.estado !== 'ANULADO' && (
                          <button
                            onClick={() => handleAbrirDespacho(item)}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: (item.firma_presidencia && item.firma_secretaria) ? '#7C3AED' : '#9CA3AF',
                              color: '#FFFFFF',
                              padding: '5px 8px',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: (item.firma_presidencia && item.firma_secretaria) ? 'pointer' : 'default'
                            }}
                            title={
                              item.firma_presidencia && item.firma_secretaria
                                ? 'Despacho Final al Alcalde Municipal o entidades externas'
                                : 'Despacho Final bloqueado: requiere firmas duales concurrentes (Presidencia y Secretaría General)'
                            }
                          >
                            <FileCheck size={13} />
                            <span>Despacho</span>
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
                      <small style={{ color: '#6C757D', display: 'block', fontWeight: 600 }}>PLAZO REGLAMENTARIO / SLA</small>
                      {renderSlaSemaforo(tramiteDetalle)}
                    </div>
                    <div>
                      <small style={{ color: '#6C757D', display: 'block', fontWeight: 600 }}>FECHA DE CREACIÓN</small>
                      <span>{formatFecha(tramiteDetalle.fecha_creacion)}</span>
                    </div>
                    <div>
                      <small style={{ color: '#6C757D', display: 'block', fontWeight: 600 }}>PRIORIDAD & FOJAS</small>
                      <span>{tramiteDetalle.prioridad} • {tramiteDetalle.nro_hojas} hojas ({tramiteDetalle.nro_anexos} anexos)</span>
                    </div>
                    {(() => {
                      const ultimoInstrumento = tramiteDetalle.historial?.slice().reverse().find(m => m.instrumento_generado)?.instrumento_generado;
                      if (!ultimoInstrumento) return null;
                      const info = getInstrumentoInfo(ultimoInstrumento);
                      return (
                        <div>
                          <small style={{ color: '#800000', display: 'block', fontWeight: 700 }}>PRODUCTO NORMATIVO CMS</small>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: info?.color || '#800000',
                              color: '#FFFFFF',
                              fontSize: '0.78rem',
                              padding: '3px 8px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>{info?.icono || '📜'}</span>
                            <span>{info?.sigla}</span>
                          </span>
                        </div>
                      );
                    })()}
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

                  {/* Circuito Plenario, Firmas Duales Concurrentes y Despacho Final CMS */}
                  <div
                    style={{
                      marginBottom: '1.5rem',
                      padding: '1.25rem',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Award size={18} color="#1B365D" />
                        <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#1B365D', fontWeight: 700 }}>
                          Circuito Plenario, Firmas Duales y Despacho Final (CMS)
                        </h4>
                      </div>
                      <span className="badge" style={{ backgroundColor: '#1B365D', color: '#FFFFFF', fontSize: '10px' }}>
                        Normativa CMS
                      </span>
                    </div>

                    {/* 1. Sub-sección: Aprobación en Sesión del Pleno */}
                    <div style={{ backgroundColor: '#FFFFFF', padding: '12px 14px', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🏛️ SESIÓN DEL PLENO DEL CMS
                        </span>
                        {tramiteDetalle.estado !== 'CONCLUIDO' && tramiteDetalle.estado !== 'ANULADO' && (
                          <button
                            type="button"
                            onClick={() => handleAbrirPleno(tramiteDetalle)}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: '#1E3A8A',
                              color: '#FFFFFF',
                              padding: '3px 8px',
                              fontSize: '0.72rem',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            {tramiteDetalle.sesion_pleno_nro ? 'Modificar Sesión' : '+ Registrar Aprobación Plenaria'}
                          </button>
                        )}
                      </div>
                      {tramiteDetalle.sesion_pleno_nro ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <div>
                            <small style={{ color: '#64748B', display: 'block' }}>NRO DE SESIÓN</small>
                            <strong style={{ color: '#1E3A8A' }}>{tramiteDetalle.sesion_pleno_nro}</strong>
                          </div>
                          <div>
                            <small style={{ color: '#64748B', display: 'block' }}>FECHA DE TRATAMIENTO</small>
                            <span>{formatFecha(tramiteDetalle.sesion_pleno_fecha)}</span>
                          </div>
                          <div>
                            <small style={{ color: '#64748B', display: 'block' }}>RESULTADO DE VOTACIÓN</small>
                            <span className="badge" style={{ backgroundColor: '#059669', color: '#FFFFFF', fontSize: '10px', fontWeight: 700 }}>
                              {tramiteDetalle.sesion_pleno_resultado}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          Trámite pendiente de tratamiento en Sesión del Pleno del Concejo Municipal de Sucre.
                        </p>
                      )}
                    </div>

                    {/* 2. Sub-sección: Firmas Duales Concurrentes */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Stamp size={15} color="#0D9488" />
                        <span>FIRMAS DUALES CONCURRENTES (Suscripción Notificada CMS)</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                        {/* Sello Presidencia CMS */}
                        <div
                          style={{
                            padding: '12px 14px',
                            borderRadius: '6px',
                            backgroundColor: tramiteDetalle.firma_presidencia ? '#F0FDF4' : '#FFFFFF',
                            border: tramiteDetalle.firma_presidencia ? '1.5px solid #22C55E' : '1.5px dashed #CBD5E1',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>
                              🏛️ PRESIDENCIA DEL CMS
                            </span>
                            {tramiteDetalle.firma_presidencia ? (
                              <span className="badge" style={{ backgroundColor: '#22C55E', color: '#FFFFFF', fontSize: '9px', fontWeight: 700 }}>
                                ✓ RÚBRICA VALIDADA
                              </span>
                            ) : (
                              <span className="badge" style={{ backgroundColor: '#94A3B8', color: '#FFFFFF', fontSize: '9px' }}>
                                PENDIENTE
                              </span>
                            )}
                          </div>
                          {tramiteDetalle.firma_presidencia ? (
                            <div style={{ fontSize: '0.8rem', color: '#166534' }}>
                              <div><strong>Firmado por:</strong> {tramiteDetalle.firma_presidencia_usuario}</div>
                              <div><small>{formatFecha(tramiteDetalle.firma_presidencia_fecha)}</small></div>
                            </div>
                          ) : (
                            <div>
                              <p style={{ margin: '2px 0 6px', fontSize: '0.75rem', color: '#64748B' }}>
                                Pendiente de firma y rúbrica de la Presidencia del Concejo Municipal.
                              </p>
                              {tramiteDetalle.estado !== 'CONCLUIDO' && tramiteDetalle.estado !== 'ANULADO' && (
                                <button
                                  type="button"
                                  onClick={() => handleAbrirFirmas(tramiteDetalle)}
                                  className="btn btn-sm"
                                  style={{
                                    backgroundColor: '#0D9488',
                                    color: '#FFFFFF',
                                    fontSize: '0.72rem',
                                    padding: '3px 8px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Estampar Firma Presidencia
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Sello Secretaría General CMS */}
                        <div
                          style={{
                            padding: '12px 14px',
                            borderRadius: '6px',
                            backgroundColor: tramiteDetalle.firma_secretaria ? '#F0FDF4' : '#FFFFFF',
                            border: tramiteDetalle.firma_secretaria ? '1.5px solid #22C55E' : '1.5px dashed #CBD5E1',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>
                              ✍️ SECRETARÍA GENERAL CMS
                            </span>
                            {tramiteDetalle.firma_secretaria ? (
                              <span className="badge" style={{ backgroundColor: '#22C55E', color: '#FFFFFF', fontSize: '9px', fontWeight: 700 }}>
                                ✓ RÚBRICA VALIDADA
                              </span>
                            ) : (
                              <span className="badge" style={{ backgroundColor: '#94A3B8', color: '#FFFFFF', fontSize: '9px' }}>
                                PENDIENTE
                              </span>
                            )}
                          </div>
                          {tramiteDetalle.firma_secretaria ? (
                            <div style={{ fontSize: '0.8rem', color: '#166534' }}>
                              <div><strong>Firmado por:</strong> {tramiteDetalle.firma_secretaria_usuario}</div>
                              <div><small>{formatFecha(tramiteDetalle.firma_secretaria_fecha)}</small></div>
                            </div>
                          ) : (
                            <div>
                              <p style={{ margin: '2px 0 6px', fontSize: '0.75rem', color: '#64748B' }}>
                                Pendiente de firma y rúbrica de la Secretaría General del Concejo Municipal.
                              </p>
                              {tramiteDetalle.estado !== 'CONCLUIDO' && tramiteDetalle.estado !== 'ANULADO' && (
                                <button
                                  type="button"
                                  onClick={() => handleAbrirFirmas(tramiteDetalle)}
                                  className="btn btn-sm"
                                  style={{
                                    backgroundColor: '#0D9488',
                                    color: '#FFFFFF',
                                    fontSize: '0.72rem',
                                    padding: '3px 8px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Estampar Firma Secretaría
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 3. Sub-sección: Despacho Final al Ejecutivo */}
                    <div style={{ backgroundColor: '#FFFFFF', padding: '12px 14px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#7C3AED', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          📬 DESPACHO FINAL AL EJECUTIVO / DESTINO EXTERNO
                        </span>
                        {tramiteDetalle.estado !== 'CONCLUIDO' && tramiteDetalle.estado !== 'ANULADO' && (
                          <button
                            type="button"
                            onClick={() => handleAbrirDespacho(tramiteDetalle)}
                            disabled={!tramiteDetalle.firma_presidencia || !tramiteDetalle.firma_secretaria}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: (tramiteDetalle.firma_presidencia && tramiteDetalle.firma_secretaria) ? '#7C3AED' : '#CBD5E1',
                              color: '#FFFFFF',
                              padding: '3px 8px',
                              fontSize: '0.72rem',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: (tramiteDetalle.firma_presidencia && tramiteDetalle.firma_secretaria) ? 'pointer' : 'not-allowed'
                            }}
                            title={
                              (!tramiteDetalle.firma_presidencia || !tramiteDetalle.firma_secretaria)
                                ? 'Requiere ambas firmas duales completas antes de habilitar el despacho'
                                : 'Proceder al despacho final al Alcalde Municipal o institución externa'
                            }
                          >
                            + Despacho Final
                          </button>
                        )}
                      </div>
                      {tramiteDetalle.despacho_final_cite ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <div>
                            <small style={{ color: '#64748B', display: 'block' }}>CITE OFICIAL SALIENTE</small>
                            <strong style={{ color: '#7C3AED' }}>{tramiteDetalle.despacho_final_cite}</strong>
                          </div>
                          <div>
                            <small style={{ color: '#64748B', display: 'block' }}>DESTINATARIO OFICIAL</small>
                            <span>{tramiteDetalle.despacho_final_destinatario || 'Alcalde Municipal de Sucre'}</span>
                          </div>
                          <div>
                            <small style={{ color: '#64748B', display: 'block' }}>FECHA DE REMISIÓN</small>
                            <span>{formatFecha(tramiteDetalle.despacho_final_fecha)}</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          {(!tramiteDetalle.firma_presidencia || !tramiteDetalle.firma_secretaria) ? (
                            <span style={{ color: '#B45309', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ⚠️ <em>Despacho Final bloqueado: Requiere la suscripción concurrente de ambas firmas reglamentarias (Presidencia y Secretaría General).</em>
                            </span>
                          ) : (
                            <span style={{ color: '#15803D', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ✅ <em>Firmas duales completas. El trámite está habilitado para ser despachado formalmente al Alcalde Municipal.</em>
                            </span>
                          )}
                        </div>
                      )}
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

                  {/* Historial de Movimientos, Trazabilidad y Auditoría (RF-08.5, RF-08.6, RF-08.7, RF-08.8, RF-08.9) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #E2E8F0', paddingBottom: '6px', marginBottom: '0.9rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1B365D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <History size={17} color="#1B365D" />
                        <span>Historial y Auditoría del Proceso ({tramiteDetalle.historial?.length || 0} actuaciones)</span>
                      </h4>
                      {tramiteDetalle.tiempo_estimado_horas > 0 && (
                        <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Timer size={13} />
                          <span>SLA estimado: <strong>{tramiteDetalle.tiempo_estimado_horas} hrs</strong></span>
                        </span>
                      )}
                    </div>

                    {(!tramiteDetalle.historial || tramiteDetalle.historial.length === 0) ? (
                      <p style={{ color: '#6C757D', fontSize: '0.85rem' }}>No hay movimientos registrados.</p>
                    ) : (
                      <>
                        {/* ─── Gráfica de Flujo del Proceso (RF-08.6) ─── */}
                        <div
                          style={{
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            marginBottom: '1.25rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Línea de Secuencia del Proceso
                            </span>
                            <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#1E40AF' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB', display: 'inline-block' }} />
                                Concluido / Atendido (Azul)
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#C2410C' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EA580C', display: 'inline-block' }} />
                                Pendiente / Tránsito (Naranja)
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              overflowX: 'auto',
                              paddingBottom: '6px',
                              gap: '6px'
                            }}
                          >
                            {tramiteDetalle.historial.map((step, sIdx) => {
                              const esPasoActivo = sIdx === tramiteDetalle.historial.length - 1;
                              const esConcluido = !esPasoActivo || step.estado === 'CONCLUIDO' || step.estado === 'ATENDIDO';
                              const colorPaso = step.tipo_movimiento === 'RETROCESO' || Boolean(step.justificacion_retroceso)
                                ? '#D97706'
                                : esConcluido ? '#2563EB' : '#EA580C';
                              const bgPaso = step.tipo_movimiento === 'RETROCESO' || Boolean(step.justificacion_retroceso)
                                ? '#FEF3C7'
                                : esConcluido ? '#EFF6FF' : '#FFF7ED';

                              return (
                                <React.Fragment key={sIdx}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      minWidth: '130px',
                                      maxWidth: '170px',
                                      flexShrink: 0,
                                      padding: '8px 10px',
                                      borderRadius: '6px',
                                      backgroundColor: bgPaso,
                                      border: `1.5px solid ${colorPaso}`,
                                      transition: 'transform 0.15s ease'
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: colorPaso }}>
                                        #{step.orden}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '0.65rem',
                                          fontWeight: 700,
                                          padding: '1px 5px',
                                          borderRadius: '8px',
                                          backgroundColor: '#FFFFFF',
                                          color: colorPaso,
                                          border: `1px solid ${colorPaso}`
                                        }}
                                      >
                                        {esConcluido ? 'CONCLUIDO' : 'EN CURSO'}
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '0.74rem',
                                        fontWeight: 600,
                                        color: '#1E293B',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}
                                      title={step.actividad}
                                    >
                                      {step.actividad}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: '0.68rem',
                                        color: '#64748B',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}
                                      title={step.unidad_destino || step.unidad_origen}
                                    >
                                      {step.unidad_destino || step.unidad_origen}
                                    </div>
                                    {step.instrumento_generado && (
                                      <div
                                        style={{
                                          fontSize: '0.62rem',
                                          fontWeight: 800,
                                          color: getInstrumentoInfo(step.instrumento_generado)?.color || '#800000',
                                          backgroundColor: getInstrumentoInfo(step.instrumento_generado)?.bg || '#FEF2F2',
                                          border: `1px solid ${getInstrumentoInfo(step.instrumento_generado)?.border || '#FECACA'}`,
                                          borderRadius: '4px',
                                          padding: '1px 4px',
                                          marginTop: '3px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                          width: 'fit-content'
                                        }}
                                      >
                                        <span>{getInstrumentoInfo(step.instrumento_generado)?.icono}</span>
                                        <span>{getInstrumentoInfo(step.instrumento_generado)?.sigla}</span>
                                      </div>
                                    )}
                                  </div>

                                  {sIdx < tramiteDetalle.historial.length - 1 && (
                                    <ArrowRight size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>

                        {/* ─── Timeline Detallado de Auditoría (RF-08.5, RF-08.7, RF-08.8, RF-08.9) ─── */}
                        <div style={{ borderLeft: '3px solid #1B365D', marginLeft: '10px', paddingLeft: '18px' }}>
                          {tramiteDetalle.historial.map((mov, idx) => {
                            const esRetroceso = mov.tipo_movimiento === 'RETROCESO' || Boolean(mov.justificacion_retroceso);
                            const esUltimo = idx === tramiteDetalle.historial.length - 1;

                            return (
                              <div
                                key={idx}
                                style={{
                                  marginBottom: '1.4rem',
                                  position: 'relative',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '6px',
                                  padding: '12px 14px',
                                  boxShadow: esUltimo ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                                }}
                              >
                                {/* Punto conector del timeline */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: '-26px',
                                    top: '16px',
                                    width: '13px',
                                    height: '13px',
                                    borderRadius: '50%',
                                    backgroundColor: esRetroceso ? '#D97706' : esUltimo ? '#2563EB' : '#1B365D',
                                    border: '2px solid #FFFFFF',
                                    boxShadow: '0 0 0 2px #E2E8F0'
                                  }}
                                />

                                {/* Encabezado de la Actuación */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, color: esRetroceso ? '#B45309' : '#1B365D', fontSize: '0.9rem' }}>
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
                                          padding: '2px 7px',
                                          borderRadius: '12px'
                                        }}
                                      >
                                        <RotateCcw size={10} />
                                        RETROCESO / DEVOLUCIÓN
                                      </span>
                                    )}
                                    {renderBadgeEstado(mov.estado)}
                                  </div>

                                  {/* Tiempo transcurrido / Hasta hoy (RF-08.8, RF-08.9) */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span
                                      style={{
                                        fontSize: '0.74rem',
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        backgroundColor: mov.es_hasta_hoy ? '#FEF3C7' : '#F1F5F9',
                                        color: mov.es_hasta_hoy ? '#92400E' : '#475569',
                                        border: `1px solid ${mov.es_hasta_hoy ? '#FDE68A' : '#E2E8F0'}`,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                      title={mov.es_hasta_hoy ? 'El trámite continúa en curso sin despachar aún' : 'Tiempo total de atención en este paso'}
                                    >
                                      <Clock size={11} />
                                      <span>
                                        {formatMinutos(mov.tiempo_transcurrido_minutos)}
                                        {mov.es_hasta_hoy ? ' (Hasta hoy)' : ''}
                                      </span>
                                    </span>
                                  </div>
                                </div>

                                {/* Cuadrícula de Auditoría: Responsables (RF-08.5) y Fechas (RF-08.7) */}
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                    gap: '8px',
                                    backgroundColor: '#F8FAFC',
                                    padding: '8px 10px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    marginBottom: '8px'
                                  }}
                                >
                                  {/* Responsable de Origen */}
                                  <div>
                                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>REMITENTE / ORIGEN</span>
                                    <strong style={{ color: '#1E293B' }}>{mov.usuario_origen_nombre || 'Funcionario de Área'}</strong>
                                    {mov.usuario_origen_cargo && (
                                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>
                                        {mov.usuario_origen_cargo}
                                      </span>
                                    )}
                                    <span style={{ color: '#0F766E', display: 'block', fontSize: '0.75rem', fontWeight: 500 }}>
                                      {mov.unidad_origen}
                                    </span>
                                    {mov.fecha_envio && (
                                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem', marginTop: '2px' }}>
                                        Enviado: {formatFecha(mov.fecha_envio)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Responsable de Destino */}
                                  <div>
                                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>DESTINATARIO / ATENCIÓN</span>
                                    <strong style={{ color: '#1E293B' }}>{mov.usuario_destino_nombre || 'En espera de recepción'}</strong>
                                    {mov.usuario_destino_cargo && (
                                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>
                                        {mov.usuario_destino_cargo}
                                      </span>
                                    )}
                                    <span style={{ color: '#0F766E', display: 'block', fontSize: '0.75rem', fontWeight: 500 }}>
                                      {mov.unidad_destino || 'Ventanilla Central'}
                                    </span>
                                    {mov.fecha_recepcion ? (
                                      <span style={{ color: '#15803D', display: 'block', fontSize: '0.7rem', marginTop: '2px', fontWeight: 600 }}>
                                        Recepcionado: {formatFecha(mov.fecha_recepcion)}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#D97706', display: 'block', fontSize: '0.7rem', marginTop: '2px', fontStyle: 'italic' }}>
                                        Pendiente de recepción física/digital
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Justificación obligatoria de retroceso (RF-04.5, RF-05.4) */}
                                {mov.justificacion_retroceso && (
                                  <div
                                    style={{
                                      backgroundColor: '#FFFBEB',
                                      border: '1px solid #FDE68A',
                                      borderLeft: '4px solid #D97706',
                                      borderRadius: '4px',
                                      padding: '8px 12px',
                                      marginTop: '6px',
                                      fontSize: '0.8rem',
                                      color: '#92400E'
                                    }}
                                  >
                                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                                      <RotateCcw size={12} />
                                      <span>Motivo y Justificación de Devolución:</span>
                                    </div>
                                    <div>{mov.justificacion_retroceso}</div>
                                  </div>
                                )}

                                {/* Proveído Oficial (RF-08.5) */}
                                {mov.proveido && (
                                  <div
                                    style={{
                                      backgroundColor: '#F8F9FA',
                                      padding: '8px 12px',
                                      borderRadius: '4px',
                                      marginTop: '6px',
                                      fontSize: '0.82rem',
                                      color: '#1E293B',
                                      borderLeft: '3px solid #800000',
                                      whiteSpace: 'pre-line'
                                    }}
                                  >
                                    <strong style={{ color: '#800000', fontSize: '0.75rem', display: 'block', marginBottom: '2px' }}>
                                      Proveído / Dictamen:
                                    </strong>
                                    {mov.proveido}
                                  </div>
                                )}

                                {/* Producto(s) Normativo(s) Generado(s) (CMS) */}
                                {(mov.instrumentos_generados || mov.instrumento_generado) && (
                                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {(mov.instrumentos_generados || mov.instrumento_generado)
                                      .split(',')
                                      .map(s => s.trim())
                                      .filter(Boolean)
                                      .map((instCod, cIdx) => {
                                        const info = getInstrumentoInfo(instCod);
                                        return (
                                          <div
                                            key={cIdx}
                                            style={{
                                              backgroundColor: info?.bg || '#FFF5F5',
                                              border: `1.5px solid ${info?.border || '#FECACA'}`,
                                              borderRadius: '6px',
                                              padding: '8px 12px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                                            }}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <span style={{ fontSize: '1.2rem' }}>
                                                {info?.icono || '📄'}
                                              </span>
                                              <div>
                                                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: info?.color, textTransform: 'uppercase', display: 'block' }}>
                                                  Instrumento Normativo Generado (CMS)
                                                </span>
                                                <strong style={{ fontSize: '0.84rem', color: info?.color }}>
                                                  {info?.nombre || instCod}
                                                </strong>
                                              </div>
                                            </div>
                                            <span
                                              className="badge"
                                              style={{
                                                backgroundColor: info?.color || '#800000',
                                                color: '#FFFFFF',
                                                fontSize: '0.72rem',
                                                padding: '3px 8px',
                                                fontWeight: 700
                                              }}
                                            >
                                              {info?.sigla || instCod}
                                            </span>
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}

                                {/* Plazo Reglamentario Otorgado en este Movimiento */}
                                {(mov.fecha_limite_respuesta || (mov.tiempo_estimado_minutos && mov.tiempo_estimado_minutos > 0)) && (
                                  <div
                                    style={{
                                      marginTop: '6px',
                                      fontSize: '0.74rem',
                                      color: '#92400E',
                                      backgroundColor: '#FEF3C7',
                                      border: '1px solid #FCD34D',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <Clock size={12} color="#D97706" />
                                    <span>
                                      Plazo otorgado: <strong>{mov.tiempo_estimado_minutos ? `${Math.round(mov.tiempo_estimado_minutos / 1440)} días` : 'Conforme a norma'}</strong>
                                      {mov.fecha_limite_respuesta && (
                                        <> | Fecha Límite: <strong>{new Date(mov.fecha_limite_respuesta).toLocaleDateString('es-BO')}</strong></>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
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
                {tramiteDetalle && tramiteDetalle.estado !== 'CONCLUIDO' && tramiteDetalle.estado !== 'ANULADO' && (
                  <button
                    type="button"
                    onClick={() => handleAbrirPleno(tramiteDetalle)}
                    className="btn btn-sm"
                    style={{
                      backgroundColor: '#1E3A8A',
                      borderColor: '#1E3A8A',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                    title="Registrar o actualizar constancia de Aprobación en Sesión del Pleno del CMS"
                  >
                    <Award size={14} />
                    <span>Pleno CMS</span>
                  </button>
                )}
                {tramiteDetalle && tramiteDetalle.estado !== 'CONCLUIDO' && tramiteDetalle.estado !== 'ANULADO' && (
                  <button
                    type="button"
                    onClick={() => handleAbrirFirmas(tramiteDetalle)}
                    className="btn btn-sm"
                    style={{
                      backgroundColor: (tramiteDetalle.firma_presidencia && tramiteDetalle.firma_secretaria) ? '#059669' : '#0284C7',
                      borderColor: (tramiteDetalle.firma_presidencia && tramiteDetalle.firma_secretaria) ? '#059669' : '#0284C7',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                    title="Estampar firmas duales concurrentes (Presidencia y Secretaría General CMS)"
                  >
                    <Stamp size={14} />
                    <span>Firmas Duales {tramiteDetalle.firma_presidencia && tramiteDetalle.firma_secretaria ? '(2/2)' : ''}</span>
                  </button>
                )}
                {tramiteDetalle && tramiteDetalle.estado !== 'CONCLUIDO' && tramiteDetalle.estado !== 'ANULADO' && (
                  <button
                    type="button"
                    onClick={() => handleAbrirDespacho(tramiteDetalle)}
                    disabled={!tramiteDetalle.firma_presidencia || !tramiteDetalle.firma_secretaria}
                    className="btn btn-sm"
                    style={{
                      backgroundColor: (tramiteDetalle.firma_presidencia && tramiteDetalle.firma_secretaria) ? '#7C3AED' : '#9CA3AF',
                      borderColor: (tramiteDetalle.firma_presidencia && tramiteDetalle.firma_secretaria) ? '#7C3AED' : '#9CA3AF',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: (tramiteDetalle.firma_presidencia && tramiteDetalle.firma_secretaria) ? 'pointer' : 'not-allowed'
                    }}
                    title={
                      (tramiteDetalle.firma_presidencia && tramiteDetalle.firma_secretaria)
                        ? 'Despacho Final al Alcalde Municipal de Sucre'
                        : 'Despacho bloqueado: Requiere firmas duales completas (Presidencia y Secretaría General)'
                    }
                  >
                    <FileCheck size={14} />
                    <span>Despacho Final</span>
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
                  {/* Selector de Modalidad Operativa CMS: Derivación Libre vs Sub-asignación Interna de Comisión */}
                  <div
                    style={{
                      marginBottom: '1.25rem',
                      padding: '12px 14px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0'
                    }}
                  >
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1B365D', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={16} color="#800000" />
                      <span>Modalidad Operativa CMS:</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setDerivarForm(prev => ({
                            ...prev,
                            modoAsignacion: 'REGULAR',
                            actividadNombre: 'Atención y derivación institucional'
                          }));
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: derivarForm.modoAsignacion === 'REGULAR' ? '2px solid #1B365D' : '1px solid #CBD5E1',
                          backgroundColor: derivarForm.modoAsignacion === 'REGULAR' ? '#EFF6FF' : '#FFFFFF',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#1B365D' }}>
                          🏛️ Derivación Inter-Unidades
                        </div>
                        <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: '3px' }}>
                          Despacho regular hacia otra Comisión, Dirección o Secretaría.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const unidadActualId = tramiteADerivar.ubicacion_actual_id || (activeRole && activeRole.ubicacionOrgId) || '';
                          const unidadActualNombre = tramiteADerivar.destinatario_unidad || (activeRole && activeRole.ubicacionOrgNombre) || '';
                          setDerivarForm(prev => ({
                            ...prev,
                            modoAsignacion: 'SUBASIGNACION_COMISION',
                            codUDestino: unidadActualId ? String(unidadActualId) : prev.codUDestino,
                            destinatarioUnidad: unidadActualNombre || prev.destinatarioUnidad,
                            actividadNombre: 'Sub-asignación interna a Asesor de Comisión',
                            proveido: prev.proveido || 'Para análisis técnico-jurídico y formulación de informe o proyecto de resolución de comisión.',
                            instruccion: 'Para análisis y formulación de informe de comisión (plazo reglamentario)',
                            diasPlazo: 10
                          }));
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: derivarForm.modoAsignacion === 'SUBASIGNACION_COMISION' ? '2px solid #800000' : '1px solid #CBD5E1',
                          backgroundColor: derivarForm.modoAsignacion === 'SUBASIGNACION_COMISION' ? '#FFF5F5' : '#FFFFFF',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#800000' }}>
                          ⚡ Sub-asignación Interna de Comisión
                        </div>
                        <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: '3px' }}>
                          Presidencia de Comisión → Asesor (Mantiene Hoja de Ruta matriz).
                        </div>
                      </button>
                    </div>

                    {derivarForm.modoAsignacion === 'SUBASIGNACION_COMISION' && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '8px 12px',
                          backgroundColor: '#FEF3C7',
                          borderRadius: '6px',
                          border: '1px solid #FCD34D',
                          fontSize: '0.76rem',
                          color: '#92400E',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <div>
                          <strong>Hoja de Ruta Matriz Preservada ({tramiteADerivar.numero_correlativo}):</strong>{' '}
                          La sub-asignación interna dentro de la comisión no fragmenta el expediente. Toda actuación o informe del asesor se registrará cronológicamente en esta misma Hoja de Ruta.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Destinatario Principal */}
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      padding: '1.25rem',
                      marginBottom: '1.25rem',
                      backgroundColor: '#FFFFFF',
                      borderLeft: derivarForm.modoAsignacion === 'SUBASIGNACION_COMISION' ? '4px solid #800000' : '4px solid #1B365D'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                      <Building2 size={18} color={derivarForm.modoAsignacion === 'SUBASIGNACION_COMISION' ? '#800000' : '#1B365D'} />
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1B365D' }}>
                        {derivarForm.modoAsignacion === 'SUBASIGNACION_COMISION'
                          ? '1. Asignación a Asesor de Comisión'
                          : '1. Destinatario Institucional Principal'}
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

              {/* Sección 4: Plazo Reglamentario CMS y Prioridad (Solo si no es conclusión) */}
              {!derivarForm.esConclusion && (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '1.25rem',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    marginBottom: '1rem',
                    borderLeft: '4px solid #1B365D'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                    <Timer size={18} color="#1B365D" />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1B365D' }}>
                      4. Plazo Reglamentario CMS de Informe y Prioridad
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', alignItems: 'start' }}>
                    {/* Prioridad de Despacho */}
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#212529', marginBottom: '6px', display: 'block' }}>
                        Prioridad de Despacho:
                      </label>
                      <select
                        className="form-select"
                        style={{ fontSize: '0.85rem' }}
                        value={derivarForm.prioridad}
                        onChange={(e) => setDerivarForm({ ...derivarForm, prioridad: e.target.value })}
                      >
                        <option value="NORMAL">Normal (Flujo Ordinario)</option>
                        <option value="ALTA">Alta Prioridad (Requerimiento Urgente)</option>
                        <option value="URGENTE">Urgente (Atención Inmediata)</option>
                      </select>
                    </div>

                    {/* Selector Rápido de Plazos Reglamentarios CMS */}
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#212529', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="#800000" />
                        <span>Selector Rápido de Plazo Reglamentario de Comisión:</span>
                      </label>

                      {/* Botones Preset de Plazos CMS (5, 10, 15 días) */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
                        {PLAZOS_REGLAMENTARIOS_CMS.map(p => {
                          const isSelected = parseInt(derivarForm.diasPlazo, 10) === p.dias;
                          return (
                            <button
                              key={p.dias}
                              type="button"
                              onClick={() => setDerivarForm({ ...derivarForm, diasPlazo: p.dias })}
                              style={{
                                padding: '6px 4px',
                                borderRadius: '6px',
                                border: isSelected ? `2px solid ${p.color}` : '1px solid #CBD5E1',
                                backgroundColor: isSelected ? p.bg : '#FFFFFF',
                                cursor: 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isSelected ? p.color : '#334155' }}>
                                {p.label}
                              </div>
                              <div style={{ fontSize: '0.67rem', color: isSelected ? p.color : '#64748B' }}>
                                {p.subtitulo}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Días:</span>
                          <input
                            type="number"
                            min="1"
                            max="90"
                            className="form-control"
                            style={{ fontSize: '0.85rem', width: '80px' }}
                            value={derivarForm.diasPlazo}
                            onChange={(e) => setDerivarForm({ ...derivarForm, diasPlazo: e.target.value })}
                          />
                        </div>

                        <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                          Límite calculado:{' '}
                          <strong style={{ color: '#800000', fontSize: '0.82rem' }}>
                            {new Date(Date.now() + (parseInt(derivarForm.diasPlazo || 10, 10) * 86400000)).toLocaleDateString('es-BO')}
                          </strong>
                          <span style={{ color: '#64748B', marginLeft: '4px' }}>
                            ({derivarForm.diasPlazo || 10} días)
                          </span>
                        </div>
                      </div>
                    </div>
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

              {/* Checkboxes de Instrumentos Normativos Generados CMS */}
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#1B365D',
                    marginBottom: '4px'
                  }}
                >
                  <FileText size={16} color="#800000" />
                  <span>Instrumentos Normativos Generados en Comisión (Selección Múltiple):</span>
                </label>
                <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '0 0 8px 0' }}>
                  Marque uno o varios instrumentos técnicos/legislativos resultantes de la labor de la comisión:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '10px' }}>
                  {INSTRUMENTOS_LEGISLATIVOS_CMS.map((inst) => {
                    const isChecked = instrumentosAtencion.includes(inst.id);
                    return (
                      <div
                        key={inst.id}
                        onClick={() => toggleInstrumentoAtencion(inst.id)}
                        style={{
                          padding: '9px 11px',
                          borderRadius: '6px',
                          border: isChecked ? `2px solid ${inst.color}` : '1px solid #CBD5E1',
                          backgroundColor: isChecked ? inst.bg : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          boxShadow: isChecked ? `0 2px 6px ${inst.color}25` : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Manejado por onClick del contenedor
                              style={{ accentColor: inst.color, cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: isChecked ? inst.color : '#1E293B' }}>
                              {inst.icono} {inst.sigla}
                            </span>
                          </div>
                          {isChecked && (
                            <span
                              style={{
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                backgroundColor: inst.color,
                                color: '#FFFFFF',
                                padding: '1px 5px',
                                borderRadius: '6px'
                              }}
                            >
                              GENERADO
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.77rem', fontWeight: 600, color: isChecked ? inst.color : '#334155' }}>
                          {inst.nombre}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', lineHeight: 1.25 }}>
                          {inst.descripcion}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selector Rápido de Plazo Normativo SLA de Comisión */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '10px 14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Clock size={15} color="#800000" />
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1B365D', margin: 0 }}>
                    Plazo Normativo SLA para Informe / Respuesta (Normativa CMS):
                  </label>
                </div>

                {/* Botones Presets [5 días], [10 días], [15 días] */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
                  {PLAZOS_REGLAMENTARIOS_CMS.map((p) => {
                    const isSelected = parseInt(diasPlazoAtencion, 10) === p.dias;
                    return (
                      <button
                        key={p.dias}
                        type="button"
                        onClick={() => setDiasPlazoAtencion(p.dias)}
                        style={{
                          padding: '6px 4px',
                          borderRadius: '6px',
                          border: isSelected ? `2px solid ${p.color}` : '1px solid #CBD5E1',
                          backgroundColor: isSelected ? p.bg : '#FFFFFF',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isSelected ? p.color : '#334155' }}>
                          {p.label}
                        </div>
                        <div style={{ fontSize: '0.67rem', color: isSelected ? p.color : '#64748B' }}>
                          {p.subtitulo}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Días hábiles:</span>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      className="form-control"
                      style={{ fontSize: '0.82rem', width: '70px', padding: '2px 6px' }}
                      value={diasPlazoAtencion}
                      onChange={(e) => setDiasPlazoAtencion(e.target.value)}
                    />
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                    Fecha límite calculada:{' '}
                    <strong style={{ color: '#800000' }}>
                      {new Date(Date.now() + (parseInt(diasPlazoAtencion || 10, 10) * 86400000)).toLocaleDateString('es-BO')}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Adjuntar PDF del Informe o Proyecto de Norma */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Paperclip size={15} color="#800000" />
                  <span>Adjuntar PDF del Informe o Proyecto de Norma (Opcional):</span>
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  className="form-control"
                  style={{ fontSize: '0.82rem' }}
                  onChange={(e) => setArchivoPdfAtencion(e.target.files?.[0] || null)}
                />
                {archivoPdfAtencion && (
                  <div style={{ marginTop: '5px', fontSize: '0.74rem', color: '#0F766E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} />
                    <span>PDF cargado: {archivoPdfAtencion.name} ({(archivoPdfAtencion.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
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

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CONSTANCIA DE APROBACIÓN EN SESIÓN DEL PLENO CMS
         ───────────────────────────────────────────────────────────── */}
      {plenoModalOpen && tramiteAPleno && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1060,
            padding: '1rem'
          }}
        >
          <div
            className="modal-content"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              className="modal-header"
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#1E3A8A',
                color: '#FFFFFF'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Award size={20} color="#93C5FD" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Aprobación en Sesión del Pleno del CMS
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#BFDBFE', marginTop: '2px' }}>
                    Trámite: <strong>{tramiteAPleno.numero_correlativo || tramiteAPleno.codigo}</strong> • Concejo Municipal de Sucre
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlenoModalOpen(false)}
                disabled={guardandoPleno}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.8
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
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
              {/* Resumen */}
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div><strong>Referencia:</strong> {tramiteAPleno.referencia || tramiteAPleno.asunto}</div>
                <div><strong>Remitente:</strong> {tramiteAPleno.remitente || tramiteAPleno.remitenteNombre}</div>
              </div>

              {/* Número de Sesión del Pleno */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1E3A8A', marginBottom: '4px' }}>
                  Número o Denominación de la Sesión del Pleno *
                </label>
                <input
                  type="text"
                  value={sesionPlenoNro}
                  onChange={(e) => setSesionPlenoNro(e.target.value)}
                  placeholder="Ej: Sesión Ordinaria N° 045/2026"
                  className="form-control"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem'
                  }}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setSesionPlenoNro(`Sesión Ordinaria N° 045/${new Date().getFullYear()}`)}
                    style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', border: '1px solid #93C5FD', backgroundColor: '#EFF6FF', color: '#1E3A8A', cursor: 'pointer' }}
                  >
                    + Ordinaria N° 045/{new Date().getFullYear()}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSesionPlenoNro(`Sesión Extraordinaria N° 012/${new Date().getFullYear()}`)}
                    style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', border: '1px solid #93C5FD', backgroundColor: '#EFF6FF', color: '#1E3A8A', cursor: 'pointer' }}
                  >
                    + Extraordinaria N° 012/{new Date().getFullYear()}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSesionPlenoNro(`Sesión de Honor N° 003/${new Date().getFullYear()}`)}
                    style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', border: '1px solid #93C5FD', backgroundColor: '#EFF6FF', color: '#1E3A8A', cursor: 'pointer' }}
                  >
                    + Sesión de Honor N° 003/{new Date().getFullYear()}
                  </button>
                </div>
              </div>

              {/* Fecha y Resultado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1E3A8A', marginBottom: '4px' }}>
                    Fecha y Hora de Sesión
                  </label>
                  <input
                    type="datetime-local"
                    value={sesionPlenoFecha}
                    onChange={(e) => setSesionPlenoFecha(e.target.value)}
                    className="form-control"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1E3A8A', marginBottom: '4px' }}>
                    Resultado del Pleno Camaral *
                  </label>
                  <select
                    value={sesionPlenoResultado}
                    onChange={(e) => setSesionPlenoResultado(e.target.value)}
                    className="form-control"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    <option value="APROBADO_UNANIMIDAD">🟢 Aprobado por Unanimidad</option>
                    <option value="APROBADO_MAYORIA">🟢 Aprobado por Mayoría Absoluta</option>
                    <option value="APROBADO_MODIFICACIONES">🟡 Aprobado con Modificaciones</option>
                    <option value="RECHAZADO">🔴 Rechazado por el Pleno</option>
                  </select>
                </div>
              </div>

              {/* Confirmación de Instrumento Normativo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1E3A8A', marginBottom: '4px' }}>
                  Instrumento Legislativo Proyectado
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
                  {[
                    { sigla: 'MINUTA', nombre: 'Minuta de Comunicación', color: '#1E3A8A' },
                    { sigla: 'RESOLUCION', nombre: 'Resolución Municipal', color: '#7C3AED' },
                    { sigla: 'PIE', nombre: 'Petición Inf. Escrito', color: '#0369A1' },
                    { sigla: 'PIO', nombre: 'Petición Inf. Oral', color: '#0D9488' },
                    { sigla: 'NOTA_EXTERNA', nombre: 'Nota Externa Saliente', color: '#047857' },
                    { sigla: 'INFORME', nombre: 'Informe de Comisión', color: '#4B5563' }
                  ].map((inst) => {
                    const sel = instrumentoPleno === inst.sigla;
                    return (
                      <button
                        key={inst.sigla}
                        type="button"
                        onClick={() => setInstrumentoPleno(inst.sigla)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: sel ? `2px solid ${inst.color}` : '1px solid #E2E8F0',
                          backgroundColor: sel ? '#F8FAFC' : '#FFFFFF',
                          color: sel ? inst.color : '#475569',
                          fontWeight: sel ? 700 : 500,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        <span>{inst.sigla}</span>
                        <span style={{ fontSize: '0.68rem', color: '#64748B' }}>{inst.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Considerandos y Proveído */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1E3A8A', marginBottom: '4px' }}>
                  Considerandos, Debate y Proveído del Pleno
                </label>
                <textarea
                  rows={3}
                  value={proveidoPleno}
                  onChange={(e) => setProveidoPleno(e.target.value)}
                  placeholder="Considerandos del debate plenario y remisión a Presidencia / Secretaría para suscripción de firmas duales..."
                  className="form-control"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {plenoError && (
                <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '8px 12px', borderRadius: '4px', fontSize: '0.82rem' }}>
                  {plenoError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="modal-footer"
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                backgroundColor: '#F8F9FA'
              }}
            >
              <button
                type="button"
                onClick={() => setPlenoModalOpen(false)}
                disabled={guardandoPleno}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarPleno}
                disabled={guardandoPleno || !sesionPlenoNro}
                className="btn btn-primary"
                style={{
                  backgroundColor: '#1E3A8A',
                  borderColor: '#1E3A8A',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {guardandoPleno ? <RefreshCw size={14} className="spin-animation" /> : <Award size={15} />}
                <span>Registrar Aprobación en Pleno</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: REGISTRO DE FIRMAS DUALES CONCURRENTES CMS
         ───────────────────────────────────────────────────────────── */}
      {firmasModalOpen && tramiteAFirmas && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1060,
            padding: '1rem'
          }}
        >
          <div
            className="modal-content"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              className="modal-header"
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#0D9488',
                color: '#FFFFFF'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Stamp size={22} color="#A7F3D0" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Firmas Duales Concurrentes (CMS)
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#CCFBF1', marginTop: '2px' }}>
                    Trámite: <strong>{tramiteAFirmas.numero_correlativo || tramiteAFirmas.codigo}</strong> • Presidencia y Secretaría General
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFirmasModalOpen(false)}
                disabled={firmando}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.8
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div
              className="modal-body"
              style={{
                padding: '1.5rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2rem'
              }}
            >
              {/* Explicación reglamentaria */}
              <div
                style={{
                  backgroundColor: '#F0FDFA',
                  borderLeft: '4px solid #0D9488',
                  padding: '10px 14px',
                  borderRadius: '0 6px 6px 0',
                  fontSize: '0.82rem',
                  color: '#134E4A'
                }}
              >
                <strong>Principio de Firmas Duales Concurrentes:</strong>
                <p style={{ margin: '3px 0 0' }}>
                  De acuerdo con el Reglamento Interno del Concejo Municipal de Sucre, los instrumentos legislativos aprobados por el Pleno deben ser suscritos conjuntamente por <strong>Presidencia del CMS</strong> y <strong>Secretaría General del CMS</strong> antes de su remisión formal al Alcalde Municipal. Ambas firmas pueden estamparse en cualquier orden cronológico.
                </p>
              </div>

              {/* Panel de sellos de firmas duales */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Sello Presidencia */}
                <div
                  style={{
                    border: tramiteAFirmas.firma_presidencia ? '2px solid #10B981' : '2px dashed #CBD5E1',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    backgroundColor: tramiteAFirmas.firma_presidencia ? '#F0FDF4' : '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '190px',
                    position: 'relative'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534' }}>
                        🏛️ PRESIDENCIA CMS
                      </span>
                      {tramiteAFirmas.firma_presidencia ? (
                        <span className="badge" style={{ backgroundColor: '#10B981', color: '#FFFFFF', fontSize: '10px', fontWeight: 700 }}>
                          ✓ FIRMADO
                        </span>
                      ) : (
                        <span className="badge" style={{ backgroundColor: '#94A3B8', color: '#FFFFFF', fontSize: '10px' }}>
                          PENDIENTE
                        </span>
                      )}
                    </div>
                    {tramiteAFirmas.firma_presidencia ? (
                      <div style={{ fontSize: '0.82rem', color: '#14532D', marginTop: '6px' }}>
                        <div><strong>Firmado por:</strong> {tramiteAFirmas.firma_presidencia_usuario}</div>
                        <div style={{ fontSize: '0.75rem', color: '#15803D', marginTop: '3px' }}>
                          📅 {formatFecha(tramiteAFirmas.firma_presidencia_fecha)}
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#166534', fontStyle: 'italic' }}>
                          Sello y rúbrica electrónica registrada conforme a Ley.
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '6px' }}>
                        Firma reglamentaria de la Presidencia del Concejo Municipal pendiente de estampado.
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => handleFirmar('PRESIDENCIA')}
                      disabled={firmando}
                      className="btn btn-sm"
                      style={{
                        width: '100%',
                        backgroundColor: tramiteAFirmas.firma_presidencia ? '#059669' : '#0D9488',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '7px 12px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      {firmando ? <RefreshCw size={13} className="spin-animation" /> : <Stamp size={14} />}
                      <span>{tramiteAFirmas.firma_presidencia ? 'Re-confirmar Firma Presidencia' : 'Estampar Firma Presidencia'}</span>
                    </button>
                  </div>
                </div>

                {/* Sello Secretaría General */}
                <div
                  style={{
                    border: tramiteAFirmas.firma_secretaria ? '2px solid #10B981' : '2px dashed #CBD5E1',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    backgroundColor: tramiteAFirmas.firma_secretaria ? '#F0FDF4' : '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '190px',
                    position: 'relative'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534' }}>
                        ✍️ SECRETARÍA GENERAL CMS
                      </span>
                      {tramiteAFirmas.firma_secretaria ? (
                        <span className="badge" style={{ backgroundColor: '#10B981', color: '#FFFFFF', fontSize: '10px', fontWeight: 700 }}>
                          ✓ FIRMADO
                        </span>
                      ) : (
                        <span className="badge" style={{ backgroundColor: '#94A3B8', color: '#FFFFFF', fontSize: '10px' }}>
                          PENDIENTE
                        </span>
                      )}
                    </div>
                    {tramiteAFirmas.firma_secretaria ? (
                      <div style={{ fontSize: '0.82rem', color: '#14532D', marginTop: '6px' }}>
                        <div><strong>Firmado por:</strong> {tramiteAFirmas.firma_secretaria_usuario}</div>
                        <div style={{ fontSize: '0.75rem', color: '#15803D', marginTop: '3px' }}>
                          📅 {formatFecha(tramiteAFirmas.firma_secretaria_fecha)}
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#166534', fontStyle: 'italic' }}>
                          Sello y rúbrica electrónica registrada conforme a Ley.
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '6px' }}>
                        Firma reglamentaria de la Secretaría General del Concejo Municipal pendiente de estampado.
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => handleFirmar('SECRETARIA')}
                      disabled={firmando}
                      className="btn btn-sm"
                      style={{
                        width: '100%',
                        backgroundColor: tramiteAFirmas.firma_secretaria ? '#059669' : '#0D9488',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '7px 12px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      {firmando ? <RefreshCw size={13} className="spin-animation" /> : <Stamp size={14} />}
                      <span>{tramiteAFirmas.firma_secretaria ? 'Re-confirmar Firma Secretaría' : 'Estampar Firma Secretaría'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Observaciones de Firma */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Observaciones adicionales de rúbrica (opcional)
                </label>
                <input
                  type="text"
                  value={observacionesFirma}
                  onChange={(e) => setObservacionesFirma(e.target.value)}
                  placeholder="Ej: Suscrito en Sala de Sesiones con constancia de quórum reglamentario."
                  className="form-control"
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Resumen de estado de firmas */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  backgroundColor: (tramiteAFirmas.firma_presidencia && tramiteAFirmas.firma_secretaria) ? '#ECFDF5' : '#FFFBEB',
                  border: `1px solid ${(tramiteAFirmas.firma_presidencia && tramiteAFirmas.firma_secretaria) ? '#A7F3D0' : '#FDE68A'}`,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {(tramiteAFirmas.firma_presidencia && tramiteAFirmas.firma_secretaria) ? (
                  <>
                    <CheckCheck size={18} color="#059669" />
                    <span style={{ color: '#065F46', fontWeight: 600 }}>
                      ¡Firmas duales concurrentes 100% completas! El trámite se encuentra habilitado para el Despacho Final.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={18} color="#D97706" />
                    <span style={{ color: '#92400E' }}>
                      Rúbricas incompletas ({tramiteAFirmas.firma_presidencia || tramiteAFirmas.firma_secretaria ? '1 de 2 registradas' : '0 de 2 registradas'}). El Despacho Final permanecerá bloqueado hasta estampar ambas firmas.
                    </span>
                  </>
                )}
              </div>

              {firmasError && (
                <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '8px 12px', borderRadius: '4px', fontSize: '0.82rem' }}>
                  {firmasError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="modal-footer"
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                backgroundColor: '#F8F9FA'
              }}
            >
              <button
                type="button"
                onClick={() => setFirmasModalOpen(false)}
                className="btn btn-secondary"
              >
                Cerrar
              </button>
              {tramiteAFirmas.firma_presidencia && tramiteAFirmas.firma_secretaria && (
                <button
                  type="button"
                  onClick={() => {
                    setFirmasModalOpen(false);
                    handleAbrirDespacho(tramiteAFirmas);
                  }}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: '#7C3AED',
                    borderColor: '#7C3AED',
                    color: '#FFFFFF',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FileCheck size={15} />
                  <span>Proceder al Despacho Final</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: DESPACHO FINAL AL EJECUTIVO O DESTINO EXTERNO CMS
         ───────────────────────────────────────────────────────────── */}
      {despachoModalOpen && tramiteADespacho && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1060,
            padding: '1rem'
          }}
        >
          <div
            className="modal-content"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              className="modal-header"
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#7C3AED',
                color: '#FFFFFF'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FileCheck size={22} color="#DDD6FE" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Despacho Final al Ejecutivo Municipal / Institución Externa
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#EDE9FE', marginTop: '2px' }}>
                    Trámite: <strong>{tramiteADespacho.numero_correlativo || tramiteADespacho.codigo}</strong> • Conclusión de Expediente CMS
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDespachoModalOpen(false)}
                disabled={despachando}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.8
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
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
              {/* Validación previa de firmas duales */}
              {(!tramiteADespacho.firma_presidencia || !tramiteADespacho.firma_secretaria) ? (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1.5px solid #F87171',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    color: '#991B1B'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '6px' }}>
                    <AlertCircle size={20} color="#DC2626" />
                    <span>DESPACHO FINAL BLOQUEADO POR NORMATIVA CMS</span>
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: '0.85rem' }}>
                    De acuerdo con el Reglamento del Concejo Municipal de Sucre, ningún instrumento normativo saliente puede ser remitido al Alcalde Municipal sin contar con ambas firmas duales concurrentes.
                  </p>
                  <div style={{ fontSize: '0.8rem', display: 'flex', gap: '1rem', marginBottom: '10px' }}>
                    <span>Presidencia CMS: {tramiteADespacho.firma_presidencia ? '🟢 FIRMADO' : '🔴 PENDIENTE'}</span>
                    <span>Secretaría General CMS: {tramiteADespacho.firma_secretaria ? '🟢 FIRMADO' : '🔴 PENDIENTE'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDespachoModalOpen(false);
                      handleAbrirFirmas(tramiteADespacho);
                    }}
                    className="btn btn-sm"
                    style={{
                      backgroundColor: '#DC2626',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '5px 12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Ir a Firmas Duales Ahora
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    fontSize: '0.82rem',
                    color: '#065F46',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <CheckCheck size={18} color="#059669" />
                  <span>
                    <strong>Firmas Duales Verificadas:</strong> Presidencia y Secretaría General han firmado reglamentariamente. El despacho está legalmente habilitado.
                  </span>
                </div>
              )}

              {/* CITE Oficial de Despacho */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#7C3AED', marginBottom: '4px' }}>
                  CITE Oficial del Oficio Saliente del CMS *
                </label>
                <input
                  type="text"
                  value={citeDespacho}
                  onChange={(e) => setCiteDespacho(e.target.value)}
                  placeholder="Ej: CMS-DESP-0145/2026"
                  className="form-control"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* Destinatario Final */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#7C3AED', marginBottom: '4px' }}>
                  Destinatario Final Institucional *
                </label>
                <input
                  type="text"
                  value={destinatarioFinal}
                  onChange={(e) => setDestinatarioFinal(e.target.value)}
                  placeholder="Ej: Dr. Enrique Leaño Palenque - Alcalde Municipal de Sucre"
                  className="form-control"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem'
                  }}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setDestinatarioFinal('Dr. Enrique Leaño Palenque - Alcalde Municipal de Sucre')}
                    style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', border: '1px solid #DDD6FE', backgroundColor: '#F5F3FF', color: '#7C3AED', cursor: 'pointer' }}
                  >
                    + Alcalde Dr. Enrique Leaño
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinatarioFinal('Gobierno Autónomo Municipal de Sucre (GAMS) - Despacho del Ejecutivo')}
                    style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', border: '1px solid #DDD6FE', backgroundColor: '#F5F3FF', color: '#7C3AED', cursor: 'pointer' }}
                  >
                    + Despacho Ejecutivo GAMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinatarioFinal(tramiteADespacho.remitente || 'Institución Peticionaria Externa')}
                    style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', border: '1px solid #DDD6FE', backgroundColor: '#F5F3FF', color: '#7C3AED', cursor: 'pointer' }}
                  >
                    + Remitente Original ({tramiteADespacho.remitente || 'Peticionario'})
                  </button>
                </div>
              </div>

              {/* Proveído de Despacho */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#7C3AED', marginBottom: '4px' }}>
                  Proveído o Texto de Remisión Saliente
                </label>
                <textarea
                  rows={3}
                  value={proveidoDespacho}
                  onChange={(e) => setProveidoDespacho(e.target.value)}
                  placeholder="Remisión formal de instrumento normativo aprobado por el Pleno Camaral del CMS para su cumplimiento..."
                  className="form-control"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {despachoError && (
                <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '8px 12px', borderRadius: '4px', fontSize: '0.82rem' }}>
                  {despachoError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="modal-footer"
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                backgroundColor: '#F8F9FA'
              }}
            >
              <button
                type="button"
                onClick={() => setDespachoModalOpen(false)}
                disabled={despachando}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarDespacho}
                disabled={
                  despachando ||
                  !citeDespacho ||
                  !destinatarioFinal ||
                  !tramiteADespacho.firma_presidencia ||
                  !tramiteADespacho.firma_secretaria
                }
                className="btn btn-primary"
                style={{
                  backgroundColor: '#7C3AED',
                  borderColor: '#7C3AED',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: (!tramiteADespacho.firma_presidencia || !tramiteADespacho.firma_secretaria || !citeDespacho || !destinatarioFinal) ? 0.6 : 1,
                  cursor: (!tramiteADespacho.firma_presidencia || !tramiteADespacho.firma_secretaria || !citeDespacho || !destinatarioFinal) ? 'not-allowed' : 'pointer'
                }}
              >
                {despachando ? <RefreshCw size={14} className="spin-animation" /> : <FileCheck size={15} />}
                <span>Despachar Oficialmente y Concluir Trámite</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
