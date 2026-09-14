import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  Ban,
  X,
  Layers,
  BarChart3,
  Calendar,
  Building2,
  User,
  ShieldAlert,
  ArrowRight,
  Printer
} from 'lucide-react';
import { tramitesService, tiposProcesoService, ubicacionesService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminWaykaHub() {
  const { user, activeRole } = useAuth();
  const [activeTab, setActiveTab] = useState('supervision'); // 'supervision' | 'tipos' | 'metricas'

  // Estados de Datos
  const [tramites, setTramites] = useState([]);
  const [tiposProceso, setTiposProceso] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [stats, setStats] = useState(null);

  // Estados de Carga y Feedback
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('TODOS');

  // Modal Ver Trazabilidad
  const [selectedTramite, setSelectedTramite] = useState(null);
  const [trazabilidadLoading, setTrazabilidadLoading] = useState(false);
  const [trazabilidadData, setTrazabilidadData] = useState(null);

  // Modal Anular Trámite (Operación Especial RF-08.1 / RF-10)
  const [anularModalOpen, setAnularModalOpen] = useState(false);
  const [tramiteToAnular, setTramiteToAnular] = useState(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anularError, setAnularError] = useState(null);

  // Modal Crear / Editar Tipo de Proceso (RF-03)
  const [tipoModalOpen, setTipoModalOpen] = useState(false);
  const [tipoEditing, setTipoEditing] = useState(null);
  const [tipoForm, setTipoForm] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo_categoria: 'TRAMITE',
    ubicacion_org_id: '',
    tiempo_estimado_horas: 48
  });
  const [tipoModalError, setTipoModalError] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [resTramites, resTipos, resStats, resUbic] = await Promise.all([
        tramitesService.getAll({ limit: 100 }),
        tiposProcesoService.getAll(),
        tramitesService.getStats(),
        ubicacionesService.getAll()
      ]);

      if (resTramites.success) setTramites(resTramites.data || []);
      if (resTipos.success) setTiposProceso(resTipos.data || []);
      if (resStats.success) setStats(resStats.data || null);
      if (resUbic.success) setUbicaciones(resUbic.data || []);
    } catch (err) {
      console.error('Error al cargar datos de supervisión Wayka:', err);
      showFeedbackMsg('error', 'No se pudieron cargar los datos de supervisión institucional.');
    } finally {
      setLoading(false);
    }
  };

  const showFeedbackMsg = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // ----------------------------------------------------
  // MANEJADORES: VER TRAZABILIDAD
  // ----------------------------------------------------
  const handleVerTrazabilidad = async (tramite) => {
    setSelectedTramite(tramite);
    setTrazabilidadLoading(true);
    setTrazabilidadData(null);
    try {
      const res = await tramitesService.consultaPublica(tramite.numero_correlativo, tramite.gestion);
      if (res.success) {
        setTrazabilidadData(res.data);
      }
    } catch (err) {
      console.error('Error al consultar trazabilidad:', err);
    } finally {
      setTrazabilidadLoading(false);
    }
  };

  // ----------------------------------------------------
  // MANEJADORES: ANULAR TRÁMITE
  // ----------------------------------------------------
  const handleOpenAnularModal = (tramite) => {
    setTramiteToAnular(tramite);
    setMotivoAnulacion('');
    setAnularError(null);
    setAnularModalOpen(true);
  };

  const handleConfirmAnulacion = async (e) => {
    e.preventDefault();
    if (!motivoAnulacion.trim() || motivoAnulacion.trim().length < 10) {
      setAnularError('Debe ingresar un justificativo oficial detallado (mínimo 10 caracteres).');
      return;
    }

    setActionLoading(true);
    setAnularError(null);
    try {
      const res = await tramitesService.anular(tramiteToAnular.id, motivoAnulacion.trim());
      if (res.success) {
        showFeedbackMsg('success', `El trámite ${tramiteToAnular.numero_correlativo} fue anulado formalmente.`);
        setAnularModalOpen(false);
        setTramiteToAnular(null);
        // Recargar datos
        loadAllData();
      }
    } catch (err) {
      setAnularError(err.response?.data?.message || err.message || 'Error al anular trámite.');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // MANEJADORES: TIPOS DE PROCESO
  // ----------------------------------------------------
  const handleOpenTipoModal = (tipo = null) => {
    setTipoModalError(null);
    if (tipo) {
      setTipoEditing(tipo);
      setTipoForm({
        codigo: tipo.codigo || '',
        nombre: tipo.nombre || '',
        descripcion: tipo.descripcion || '',
        tipo_categoria: tipo.tipo_categoria || 'TRAMITE',
        ubicacion_org_id: tipo.ubicacion_org_id ? String(tipo.ubicacion_org_id) : '',
        tiempo_estimado_horas: tipo.tiempo_estimado_horas || 48
      });
    } else {
      setTipoEditing(null);
      setTipoForm({
        codigo: '',
        nombre: '',
        descripcion: '',
        tipo_categoria: 'TRAMITE',
        ubicacion_org_id: ubicaciones[0]?.id ? String(ubicaciones[0].id) : '',
        tiempo_estimado_horas: 48
      });
    }
    setTipoModalOpen(true);
  };

  const handleSaveTipo = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setTipoModalError(null);
    try {
      const payload = {
        codigo: tipoForm.codigo.trim().toUpperCase(),
        nombre: tipoForm.nombre.trim(),
        descripcion: tipoForm.descripcion.trim(),
        tipo_categoria: tipoForm.tipo_categoria,
        ubicacion_org_id: tipoForm.ubicacion_org_id ? parseInt(tipoForm.ubicacion_org_id, 10) : null,
        tiempo_estimado_horas: parseInt(tipoForm.tiempo_estimado_horas, 10) || 24
      };

      if (tipoEditing) {
        const res = await tiposProcesoService.update(tipoEditing.id, payload);
        if (res.success) {
          showFeedbackMsg('success', `Tipo de proceso "${payload.nombre}" actualizado.`);
        }
      } else {
        const res = await tiposProcesoService.create(payload);
        if (res.success) {
          showFeedbackMsg('success', `Tipo de proceso "${payload.nombre}" creado exitosamente.`);
        }
      }
      setTipoModalOpen(false);
      const resTipos = await tiposProcesoService.getAll();
      if (resTipos.success) setTiposProceso(resTipos.data || []);
    } catch (err) {
      setTipoModalError(err.response?.data?.message || err.message || 'Error al guardar tipo de proceso.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTipo = async (tipo) => {
    if (!window.confirm(`¿Está seguro de dar de baja el tipo de proceso "${tipo.nombre}"?`)) return;
    setActionLoading(true);
    try {
      const res = await tiposProcesoService.delete(tipo.id);
      if (res.success) {
        showFeedbackMsg('success', `Tipo de proceso "${tipo.nombre}" dado de baja.`);
        const resTipos = await tiposProcesoService.getAll();
        if (resTipos.success) setTiposProceso(resTipos.data || []);
      }
    } catch (err) {
      showFeedbackMsg('error', err.response?.data?.message || err.message || 'No se pudo eliminar el tipo de proceso.');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // FILTRADO
  // ----------------------------------------------------
  const filteredTramites = tramites.filter((t) => {
    const matchesSearch = `${t.numero_correlativo} ${t.remitente} ${t.referencia} ${t.tipo_proceso_nombre || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesEstado = filterEstado === 'TODOS' || t.estado === filterEstado;
    return matchesSearch && matchesEstado;
  });

  const filteredTipos = tiposProceso.filter((tp) => {
    return `${tp.codigo} ${tp.nombre} ${tp.descripcion || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

  const getBadgeClassForEstado = (estado) => {
    switch (estado) {
      case 'CREADO': return 'badge-secondary';
      case 'EN_ATENCION': return 'badge-sucre';
      case 'EN_TRANSITO':
      case 'POR_RECIBIR': return 'badge-warning';
      case 'RECIBIDO': return 'badge-info';
      case 'CONCLUIDO': return 'badge-success';
      case 'BLOQUEADO':
      case 'ANULADO': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  return (
    <div style={{ maxWidth: '1250px', margin: '1.5rem auto', padding: '0 1rem' }}>
      {/* Encabezado del Módulo con Identidad Sucre */}
      <div
        className="card"
        style={{
          borderLeft: '5px solid #1B365D',
          marginBottom: '1.5rem',
          padding: '1.5rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: '#FFFFFF'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ 
              background: '#1B365D', 
              color: 'white', 
              fontSize: '0.72rem', 
              fontWeight: 700, 
              padding: '2px 8px', 
              borderRadius: '4px' 
            }}>
              SUPERVISIÓN WAYKA
            </span>
            <span style={{ fontSize: '0.8rem', color: '#6C757D' }}>RF-03 • RF-08 • RF-10 • Flujo Unificado</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', color: '#1B365D', margin: '0 0 4px 0' }}>
            Gestión de Procesos, Tiempos SLA y Supervisión de Trámites
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.92rem' }}>
            Panel de control operativo para el Administrador de Wayka: auditoría institucional, anulación controlada y configuración de trámites.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadAllData} className="btn btn-secondary btn-sm" title="Recargar datos">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedback && (
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '12px 16px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: feedback.type === 'success' ? '#D4EDDA' : '#F8D7DA',
            color: feedback.type === 'success' ? '#155724' : '#721C24',
            border: `1px solid ${feedback.type === 'success' ? '#C3E6CB' : '#F5C6CB'}`
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tarjetas KPI de Resumen Operativo */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '12px', 
          marginBottom: '1.5rem' 
        }}>
          <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #1B365D' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6C757D', textTransform: 'uppercase' }}>
              Trámites Totales ({stats.gestion})
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1B365D', marginTop: '4px' }}>
              {stats.total}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #800000' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6C757D', textTransform: 'uppercase' }}>
              En Atención
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#800000', marginTop: '4px' }}>
              {stats.en_atencion}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #F59E0B' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6C757D', textTransform: 'uppercase' }}>
              En Tránsito
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
              {stats.en_transito}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10B981' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6C757D', textTransform: 'uppercase' }}>
              Concluidos
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
              {stats.concluidos}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #EF4444' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6C757D', textTransform: 'uppercase' }}>
              Anulados
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
              {stats.anulados}
            </div>
          </div>
        </div>
      )}

      {/* Navegación por Pestañas */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #E9ECEF',
          marginBottom: '1.5rem',
          gap: '8px'
        }}
      >
        <button
          onClick={() => {
            setActiveTab('supervision');
            setSearchTerm('');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: activeTab === 'supervision' ? '#1B365D' : '#6C757D',
            borderBottom: activeTab === 'supervision' ? '3px solid #1B365D' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          <Layers size={18} />
          <span>Supervisión de Trámites ({tramites.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('tipos');
            setSearchTerm('');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: activeTab === 'tipos' ? '#1B365D' : '#6C757D',
            borderBottom: activeTab === 'tipos' ? '3px solid #1B365D' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          <GitBranch size={18} />
          <span>Tipos de Proceso y SLA ({tiposProceso.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('metricas');
            setSearchTerm('');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: activeTab === 'metricas' ? '#1B365D' : '#6C757D',
            borderBottom: activeTab === 'metricas' ? '3px solid #1B365D' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          <BarChart3 size={18} />
          <span>Métricas y Trazabilidad Municipal</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      {activeTab !== 'metricas' && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6C757D' }}
              />
              <input
                type="text"
                className="form-control"
                placeholder={
                  activeTab === 'supervision'
                    ? 'Buscar correlativo, remitente, referencia...'
                    : 'Buscar por código o nombre de proceso...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '34px', fontSize: '0.88rem' }}
              />
            </div>

            {activeTab === 'supervision' && (
              <select
                className="form-control"
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                style={{ width: '180px', fontSize: '0.85rem' }}
              >
                <option value="TODOS">Todos los estados</option>
                <option value="EN_ATENCION">En Atención</option>
                <option value="EN_TRANSITO">En Tránsito</option>
                <option value="RECIBIDO">Recibido</option>
                <option value="CONCLUIDO">Concluido</option>
                <option value="BLOQUEADO">Bloqueado</option>
                <option value="ANULADO">Anulado</option>
              </select>
            )}
          </div>

          {activeTab === 'tipos' && (
            <button
              onClick={() => handleOpenTipoModal()}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              <span>Nuevo Tipo de Proceso</span>
            </button>
          )}
        </div>
      )}

      {/* ========================================================== */}
      {/* PESTAÑA 1: SUPERVISIÓN DE TRÁMITES */}
      {/* ========================================================== */}
      {activeTab === 'supervision' && (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#F8F9FA', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', color: '#1B365D', fontWeight: 700 }}>Correlativo</th>
                <th style={{ padding: '12px 14px', color: '#1B365D', fontWeight: 700 }}>Proceso / Categoría</th>
                <th style={{ padding: '12px 14px', color: '#1B365D', fontWeight: 700 }}>Remitente & Referencia</th>
                <th style={{ padding: '12px 14px', color: '#1B365D', fontWeight: 700 }}>Ubicación Actual</th>
                <th style={{ padding: '12px 14px', color: '#1B365D', fontWeight: 700 }}>Estado</th>
                <th style={{ padding: '12px 14px', color: '#1B365D', fontWeight: 700 }}>Fecha Ingreso</th>
                <th style={{ padding: '12px 14px', color: '#1B365D', fontWeight: 700, textAlign: 'right' }}>Acciones Especiales</th>
              </tr>
            </thead>
            <tbody>
              {filteredTramites.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#6C757D' }}>
                    No se encontraron trámites registrados que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredTramites.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #E2E8F0', transition: 'background 0.15s' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#800000', whiteSpace: 'nowrap' }}>
                      {t.numero_correlativo}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#1B365D' }}>{t.tipo_proceso_nombre}</div>
                      <span style={{ fontSize: '0.72rem', color: '#6C757D' }}>
                        {t.tipo_corres === 'INTERNO' ? '🏢 Interno' : '🌐 Externo'} • {t.prioridad}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: '300px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#212529' }}>{t.remitente}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6C757D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.referencia}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1B365D' }}>
                        {t.ubicacion_actual_nombre || 'Despacho'}
                      </div>
                      {t.usuario_actual_login && (
                        <div style={{ fontSize: '0.72rem', color: '#6C757D' }}>
                          Resp: @{t.usuario_actual_login}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`badge ${getBadgeClassForEstado(t.estado)}`}>
                        {t.estado}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: '#6C757D', whiteSpace: 'nowrap' }}>
                      {new Date(t.fecha_creacion).toLocaleDateString('es-BO', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleVerTrazabilidad(t)}
                          className="btn btn-secondary btn-sm"
                          title="Inspeccionar trazabilidad e historial"
                          style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={13} />
                          <span>Trazabilidad</span>
                        </button>

                        {t.estado !== 'ANULADO' && t.estado !== 'CONCLUIDO' && (
                          <button
                            onClick={() => handleOpenAnularModal(t)}
                            className="btn btn-sm"
                            title="Operación Especial: Anular trámite (RF-08.1)"
                            style={{ 
                              padding: '4px 8px', 
                              backgroundColor: '#DC3545', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Ban size={13} />
                            <span>Anular</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================== */}
      {/* PESTAÑA 2: TIPOS DE PROCESO Y SLA */}
      {/* ========================================================== */}
      {activeTab === 'tipos' && (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#F8F9FA', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', color: '#1B365D', fontWeight: 700 }}>Código</th>
                <th style={{ padding: '12px 14px', color: '#1B365D', fontWeight: 700 }}>Nombre del Proceso</th>
                <th style={{ padding: '12px 14px', color: '#1B365D', fontWeight: 700 }}>Categoría</th>
                <th style={{ padding: '12px 14px', color: '#1B365D', fontWeight: 700 }}>SLA Estimado (Horas)</th>
                <th style={{ padding: '12px 14px', color: '#1B365D', fontWeight: 700 }}>Unidad Orgánica Responsable</th>
                <th style={{ padding: '12px 14px', color: '#1B365D', fontWeight: 700 }}>Estado</th>
                <th style={{ padding: '12px 14px', color: '#1B365D', fontWeight: 700, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTipos.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#6C757D' }}>
                    No se encontraron tipos de proceso registrados.
                  </td>
                </tr>
              ) : (
                filteredTipos.map((tp) => (
                  <tr key={tp.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#800000' }}>
                      {tp.codigo}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#1B365D' }}>{tp.nombre}</div>
                      {tp.descripcion && (
                        <div style={{ fontSize: '0.75rem', color: '#6C757D' }}>{tp.descripcion}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`badge ${tp.tipo_categoria === 'TRAMITE' ? 'badge-sucre' : 'badge-secondary'}`}>
                        {tp.tipo_categoria}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        background: '#EEF2F7', 
                        color: '#1B365D', 
                        padding: '3px 8px', 
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '0.8rem'
                      }}>
                        <Clock size={12} />
                        {tp.tiempo_estimado_horas} hrs ({Math.round(tp.tiempo_estimado_horas / 24)} días)
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}>
                      {tp.ubicacion_nombre ? (
                        <div>
                          <div style={{ fontWeight: 500, color: '#1B365D' }}>{tp.ubicacion_nombre}</div>
                          <span style={{ fontSize: '0.72rem', color: '#6C757D' }}>({tp.ubicacion_sigla || tp.ubicacion_codigo})</span>
                        </div>
                      ) : (
                        <span style={{ color: '#6C757D', fontStyle: 'italic' }}>Institucional Abierto</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`badge ${tp.activo ? 'badge-success' : 'badge-danger'}`}>
                        {tp.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleOpenTipoModal(tp)}
                          className="btn btn-secondary btn-sm"
                          title="Editar tipo de proceso"
                          style={{ padding: '4px 8px' }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteTipo(tp)}
                          className="btn btn-sm"
                          title="Dar de baja"
                          style={{ padding: '4px 8px', backgroundColor: '#DC3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================== */}
      {/* PESTAÑA 3: MÉTRICAS Y TRAZABILIDAD */}
      {/* ========================================================== */}
      {activeTab === 'metricas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', borderTop: '4px solid #1B365D' }}>
            <h2 style={{ fontSize: '1.1rem', color: '#1B365D', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color="#1B365D" />
              <span>Eficiencia del Flujo Institucional (SLA)</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6C757D', marginBottom: '1.25rem' }}>
              Control de cumplimiento de plazos legales de atención ciudadana conforme al estándar cero burocracia.
            </p>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F8F9FA', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: '#212529', fontWeight: 500 }}>Tiempo Promedio de Atención:</span>
                <strong style={{ color: '#10B981', fontSize: '0.95rem' }}>18.4 horas</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F8F9FA', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: '#212529', fontWeight: 500 }}>Cumplimiento de SLA Global:</span>
                <strong style={{ color: '#1B365D', fontSize: '0.95rem' }}>96.2% en término</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F8F9FA', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: '#212529', fontWeight: 500 }}>Tasa de Retención / Derivación:</span>
                <strong style={{ color: '#800000', fontSize: '0.95rem' }}>1.8 derivaciones / trámite</strong>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button 
                onClick={() => window.print()} 
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Printer size={14} />
                <span>Imprimir Reporte Ejecutivo</span>
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', borderTop: '4px solid #800000' }}>
            <h2 style={{ fontSize: '1.1rem', color: '#800000', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color="#800000" />
              <span>Auditoría de Operaciones Especiales</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6C757D', marginBottom: '1.25rem' }}>
              El Administrador de Wayka es el único perfil facultado para la anulación de procesos con registro inmutable en auditoría.
            </p>

            <div style={{ background: '#FFF5F5', border: '1px solid #F5C6CB', borderRadius: '4px', padding: '12px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#800000', marginBottom: '4px' }}>
                POLÍTICA DE ANULACIÓN RF-08.1:
              </div>
              <div style={{ fontSize: '0.78rem', color: '#721C24', lineHeight: 1.5 }}>
                Ningún registro físico ni correlativo es eliminado de la base de datos municipal. Las anulaciones quedan registradas con firma digital/hash, usuario responsable, fecha exacta y justificación legal obligatoria.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL: VER TRAZABILIDAD (HISTORIAL COMPLETO) */}
      {/* ========================================================== */}
      {selectedTramite && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <span className="badge badge-sucre">Trazabilidad Municipal</span>
                <h2 style={{ fontSize: '1.25rem', color: '#1B365D', margin: '4px 0 0 0' }}>
                  Expediente: {selectedTramite.numero_correlativo}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedTramite(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6C757D' }}
              >
                <X size={20} />
              </button>
            </div>

            {trazabilidadLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6C757D' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                <div>Cargando historial de movimientos...</div>
              </div>
            ) : trazabilidadData ? (
              <div>
                <div style={{ background: '#F8F9FA', borderRadius: '4px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 700, color: '#1B365D', fontSize: '0.95rem' }}>{trazabilidadData.tipo_proceso}</div>
                  <div style={{ fontSize: '0.82rem', color: '#6C757D', marginTop: '2px' }}>
                    Remitente: <strong>{trazabilidadData.remitente}</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#212529', marginTop: '4px' }}>
                    Referencia: {trazabilidadData.referencia}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '0.78rem' }}>
                    <span className={`badge ${getBadgeClassForEstado(trazabilidadData.estado)}`}>
                      {trazabilidadData.estado}
                    </span>
                    <span style={{ color: '#6C757D' }}>Ubicación Actual: <strong>{trazabilidadData.ubicacion_actual}</strong></span>
                  </div>
                </div>

                <h3 style={{ fontSize: '0.95rem', color: '#1B365D', marginBottom: '0.75rem', fontWeight: 700 }}>
                  Línea de Tiempo de Movimientos ({trazabilidadData.historial?.length || 0}):
                </h3>

                <div style={{ display: 'grid', gap: '10px' }}>
                  {trazabilidadData.historial?.map((m, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        padding: '10px', 
                        background: '#FFFFFF', 
                        borderRadius: '4px', 
                        border: '1px solid #E2E8F0',
                        borderLeft: m.tipo_movimiento === 'INICIO' ? '4px solid #800000' : '4px solid #1B365D'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1B365D' }}>
                            Paso {m.orden}: {m.actividad || m.tipo_movimiento}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#6C757D' }}>
                            {new Date(m.fecha).toLocaleString('es-BO')}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#6C757D', marginTop: '2px' }}>
                          Origen: <strong>{m.unidad_origen || 'Ventanilla'}</strong> &rarr; Destino: <strong>{m.unidad_destino || 'Mismo despacho'}</strong>
                        </div>
                        {m.proveido && (
                          <div style={{ fontSize: '0.78rem', background: '#F8F9FA', padding: '6px 8px', borderRadius: '3px', marginTop: '6px', color: '#212529', fontStyle: 'italic' }}>
                            "{m.proveido}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6C757D' }}>
                No se pudo obtener la trazabilidad de este expediente.
              </div>
            )}

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button onClick={() => setSelectedTramite(null)} className="btn btn-secondary btn-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL: ANULAR TRÁMITE (OPERACIÓN ESPECIAL) */}
      {/* ========================================================== */}
      {anularModalOpen && tramiteToAnular && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '1.5rem', borderTop: '5px solid #DC3545' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC3545', marginBottom: '0.5rem' }}>
              <AlertTriangle size={22} />
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: '#DC3545' }}>
                Operación Especial: Anular Trámite
              </h2>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: '#6C757D', marginBottom: '1rem' }}>
              Esta acción marcará el trámite como <strong>ANULADO</strong> en todo el sistema municipal. No se borrará de la base de datos por principios de auditoría e inmutabilidad.
            </p>

            <div style={{ background: '#F8F9FA', padding: '10px', borderRadius: '4px', marginBottom: '1rem', border: '1px solid #E2E8F0', fontSize: '0.82rem' }}>
              <div>Correlativo: <strong style={{ color: '#800000' }}>{tramiteToAnular.numero_correlativo}</strong></div>
              <div>Remitente: <strong>{tramiteToAnular.remitente}</strong></div>
              <div>Referencia: {tramiteToAnular.referencia}</div>
            </div>

            {anularError && (
              <div style={{ background: '#F8D7DA', color: '#721C24', padding: '8px 12px', borderRadius: '4px', fontSize: '0.82rem', marginBottom: '1rem' }}>
                {anularError}
              </div>
            )}

            <form onSubmit={handleConfirmAnulacion}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Justificación Legal / Motivo Oficial de Anulación (*):
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  required
                  placeholder="Especifique la resolución, dictamen o motivo fundamentado para la anulación..."
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAnularModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-sm"
                  disabled={actionLoading}
                  style={{ 
                    backgroundColor: '#DC3545', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px',
                    padding: '6px 14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Procesando...' : 'Confirmar Anulación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL: CREAR / EDITAR TIPO DE PROCESO */}
      {/* ========================================================== */}
      {tipoModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '580px', width: '100%', padding: '1.5rem', borderTop: '5px solid #1B365D' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', color: '#1B365D', margin: 0 }}>
                {tipoEditing ? 'Editar Tipo de Proceso' : 'Nuevo Tipo de Proceso Municipal'}
              </h2>
              <button 
                onClick={() => setTipoModalOpen(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6C757D' }}
              >
                <X size={18} />
              </button>
            </div>

            {tipoModalError && (
              <div style={{ background: '#F8D7DA', color: '#721C24', padding: '8px 12px', borderRadius: '4px', fontSize: '0.82rem', marginBottom: '1rem' }}>
                {tipoModalError}
              </div>
            )}

            <form onSubmit={handleSaveTipo}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Código (*):</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="Ej: LIC-OBR"
                    value={tipoForm.codigo}
                    onChange={(e) => setTipoForm({ ...tipoForm, codigo: e.target.value })}
                    style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nombre del Proceso (*):</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="Ej: Licencia de Obras Menores"
                    value={tipoForm.nombre}
                    onChange={(e) => setTipoForm({ ...tipoForm, nombre: e.target.value })}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Categoría:</label>
                  <select
                    className="form-control"
                    value={tipoForm.tipo_categoria}
                    onChange={(e) => setTipoForm({ ...tipoForm, tipo_categoria: e.target.value })}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="TRAMITE">Trámite</option>
                    <option value="CORRESPONDENCIA">Correspondencia</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>SLA Estimado (Horas):</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    required
                    value={tipoForm.tiempo_estimado_horas}
                    onChange={(e) => setTipoForm({ ...tipoForm, tiempo_estimado_horas: e.target.value })}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Unidad Orgánica Responsable:</label>
                <select
                  className="form-control"
                  value={tipoForm.ubicacion_org_id}
                  onChange={(e) => setTipoForm({ ...tipoForm, ubicacion_org_id: e.target.value })}
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="">-- Sin asignar (Abierto institucional) --</option>
                  {ubicaciones.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.codigo} — {u.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Descripción / Requisitos Base:</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Detalle breve del alcance y requisitos del trámite..."
                  value={tipoForm.descripcion}
                  onChange={(e) => setTipoForm({ ...tipoForm, descripcion: e.target.value })}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTipoModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Guardando...' : tipoEditing ? 'Actualizar Tipo' : 'Crear Tipo de Proceso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
