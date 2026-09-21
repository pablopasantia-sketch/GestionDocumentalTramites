import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  FileText,
  Clock,
  Plus,
  Search,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Building2,
  Layers,
  Sparkles,
  HelpCircle,
  Award,
  FileCheck,
  Handshake,
  Send
} from 'lucide-react';
import { tiposProcesoService, ubicacionesService } from '../../services/api';

export default function TiposProcesoExternoManager() {
  const [tipos, setTipos] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activos'); // 'activos' | 'inactivos' | 'todos'
  const [feedback, setFeedback] = useState(null);

  // Modal Crear / Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo_categoria: 'CORRESPONDENCIA',
    ubicacion_org_id: '',
    tiempo_estimado_horas: 24
  });

  // Modal Confirmar Baja / Reactivación
  const [confirmModal, setConfirmModal] = useState(null); // { tipo: 'delete' | 'reactivate', item: {} }

  const showMsg = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [resTipos, resUbic] = await Promise.all([
        tiposProcesoService.getAll({
          tipo_categoria: 'CORRESPONDENCIA',
          activo: filtroEstado
        }),
        ubicacionesService.getAll({ activo: 'all' })
      ]);

      const listTipos = resTipos?.data || resTipos || [];
      const listUbic = resUbic?.data || resUbic || [];

      setTipos(Array.isArray(listTipos) ? listTipos : []);
      setUbicaciones(Array.isArray(listUbic) ? listUbic : []);
    } catch (err) {
      console.error(err);
      showMsg('error', 'Error al cargar los tipos de trámite externo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filtroEstado]);

  // Presets institucionales de Trámites Externos (TablasDBNotas)
  const presets = [
    {
      codigo: 'CM',
      nombre: 'Correspondencia Municipal Externa',
      descripcion: 'Hojas de Ruta de correspondencia externa, notas y cartas institucionales recibidas en Ventanilla Única y Despacho',
      tiempo_estimado_horas: 24,
      icon: Send,
      color: '#800000'
    },
    {
      codigo: 'CDE1',
      nombre: 'Contratos Institucionales',
      descripcion: 'Hojas de Ruta para suscripción, revisión legal y fiscalización de contratos de obras, bienes y servicios',
      tiempo_estimado_horas: 72,
      icon: FileCheck,
      color: '#1B365D'
    },
    {
      codigo: 'CDE2',
      nombre: 'Convenios Interinstitucionales',
      descripcion: 'Hojas de Ruta para suscripción de convenios marco y específicos de cooperación técnica y financiera',
      tiempo_estimado_horas: 48,
      icon: Handshake,
      color: '#2B6CB0'
    },
    {
      codigo: 'CDH1',
      nombre: 'Condecoraciones y Distinciones',
      descripcion: 'Hojas de Ruta para otorgación de honores cívicos, distinciones honoríficas y condecoraciones municipales',
      tiempo_estimado_horas: 48,
      icon: Award,
      color: '#D69E2E'
    }
  ];

  const handleOpenNuevo = () => {
    setEditingTipo(null);
    setFormError(null);
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      tipo_categoria: 'CORRESPONDENCIA',
      ubicacion_org_id: ubicaciones[0]?.id ? String(ubicaciones[0].id) : '',
      tiempo_estimado_horas: 24
    });
    setModalOpen(true);
  };

  const handleOpenEditar = (t) => {
    setEditingTipo(t);
    setFormError(null);
    setFormData({
      codigo: t.codigo,
      nombre: t.nombre,
      descripcion: t.descripcion || '',
      tipo_categoria: 'CORRESPONDENCIA',
      ubicacion_org_id: t.ubicacion_org_id ? String(t.ubicacion_org_id) : '',
      tiempo_estimado_horas: t.tiempo_estimado_horas || 24
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.codigo.trim()) {
      setFormError('El código del trámite es obligatorio (ej. CM, CDE1, CDE2, CDH1).');
      return;
    }
    if (!formData.nombre.trim()) {
      setFormError('El nombre oficial del trámite es obligatorio.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const payload = {
      codigo: formData.codigo.trim().toUpperCase(),
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim(),
      tipo_categoria: 'CORRESPONDENCIA',
      ubicacion_org_id: formData.ubicacion_org_id ? parseInt(formData.ubicacion_org_id, 10) : null,
      tiempo_estimado_horas: parseInt(formData.tiempo_estimado_horas, 10) || 24
    };

    try {
      if (editingTipo) {
        await tiposProcesoService.update(editingTipo.id, payload);
        showMsg('success', `Trámite externo '${payload.codigo} - ${payload.nombre}' actualizado con éxito.`);
      } else {
        await tiposProcesoService.create(payload);
        showMsg('success', `Trámite externo '${payload.codigo} - ${payload.nombre}' registrado con éxito.`);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.message || err.message || 'Error al guardar el tipo de trámite.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    try {
      if (confirmModal.tipo === 'delete') {
        await tiposProcesoService.delete(confirmModal.item.id);
        showMsg('success', `Tipo de trámite '${confirmModal.item.codigo}' dado de baja exitosamente.`);
      } else {
        await tiposProcesoService.toggleActivo(confirmModal.item.id);
        showMsg('success', `Tipo de trámite '${confirmModal.item.codigo}' reactivado exitosamente.`);
      }
      setConfirmModal(null);
      loadData();
    } catch (err) {
      showMsg('error', err.response?.data?.message || err.message || 'Error al procesar la acción.');
      setConfirmModal(null);
    }
  };

  // Badge y colores para códigos de Trámite Externo
  const getBadgeStyle = (codigo) => {
    switch (codigo?.toUpperCase()) {
      case 'CM':
        return { background: '#800000', color: '#FFF' };
      case 'CDE1':
        return { background: '#1B365D', color: '#FFF' };
      case 'CDE2':
        return { background: '#2B6CB0', color: '#FFF' };
      case 'CDH1':
        return { background: '#B7791F', color: '#FFF' };
      default:
        return { background: '#4A5568', color: '#FFF' };
    }
  };

  const filteredTipos = tipos.filter(t =>
    t.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.descripcion && t.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      {/* Banner de Feedback */}
      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: feedback.type === 'success' ? '#D4EDDA' : '#F8D7DA',
          color: feedback.type === 'success' ? '#155724' : '#721C24',
          border: `1px solid ${feedback.type === 'success' ? '#C3E6CB' : '#F5C6CB'}`
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{feedback.message}</span>
        </div>
      )}

      {/* Tarjeta Informativa de Alcance Institucional */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '1.25rem', borderLeft: '5px solid #800000', background: '#FDFBF7' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#800000', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Alcance de Trámites Externos
            </div>
            <h3 style={{ fontSize: '1.15rem', color: '#1B365D', margin: '4px 0 6px' }}>
              Catálogo Oficial de Hojas de Ruta y Correspondencia Externa
            </h3>
            <p style={{ color: '#4A5568', fontSize: '0.88rem', margin: 0, maxWidth: '850px' }}>
              Parametrización de los tipos de expedientes externos gestionados en Ventanilla Única y Despachos (<strong>CM</strong>, <strong>CDE1</strong>, <strong>CDE2</strong>, <strong>CDH1</strong>), tiempos reglamentarios de respuesta (SLA) y unidades orgánicas vinculadas.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={loadData}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              title="Recargar tipos de trámite"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Actualizar</span>
            </button>
            <button
              onClick={handleOpenNuevo}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              <span>Nuevo Tipo Externo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '450px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6C757D' }} />
            <input
              type="text"
              placeholder="Buscar por código (CM, CDE1...) o nombre del trámite..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.82rem', color: '#6C757D', fontWeight: 600 }}>Estado:</span>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="form-control"
              style={{ width: 'auto', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <option value="activos">Mostrar: Solo Vigentes (Activos)</option>
              <option value="inactivos">Mostrar: Dados de Baja (Inactivos)</option>
              <option value="todos">Mostrar: Todos los Registros</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLA INSTITUCIONAL DE TRÁMITES EXTERNOS */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table-sucre">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Código</th>
                <th>Nombre del Trámite Externo</th>
                <th>Descripción y Normativa</th>
                <th style={{ width: '130px', textAlign: 'center' }}>SLA Reglamentario</th>
                <th>Unidad Responsable</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Estado</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6C757D' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                    Cargando catálogo de trámites externos...
                  </td>
                </tr>
              ) : filteredTipos.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#6C757D' }}>
                    No se encontraron tipos de trámite externo registrados que coincidan con el filtro.
                  </td>
                </tr>
              ) : (
                filteredTipos.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          ...getBadgeStyle(t.codigo)
                        }}
                      >
                        {t.codigo}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1B365D', fontSize: '0.9rem' }}>
                        {t.nombre}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#718096' }}>
                        Hoja de Ruta Institucional
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', color: '#4A5568', maxWidth: '320px', lineHeight: '1.3' }}>
                        {t.descripcion || <em style={{ color: '#A0AEC0' }}>Sin descripción consignada</em>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          backgroundColor: '#EBF8FF',
                          color: '#2B6CB0',
                          border: '1px solid #BEE3F8'
                        }}
                      >
                        <Clock size={12} />
                        <span>{t.tiempo_estimado_horas || 24} hrs</span>
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#2D3748' }}>
                        <Building2 size={14} color="#800000" />
                        <span>{t.ubicacion_nombre || t.ubicacion_sigla || 'Ventanilla Única / Central'}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {t.activo ? (
                        <span className="badge badge-vigente">VIGENTE</span>
                      ) : (
                        <span className="badge badge-alerta">INACTIVO</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          onClick={() => handleOpenEditar(t)}
                          className="btn btn-secondary btn-xs"
                          title="Editar Trámite Externo"
                        >
                          <Edit2 size={13} />
                        </button>
                        {t.activo ? (
                          <button
                            onClick={() => setConfirmModal({ tipo: 'delete', item: t })}
                            className="btn btn-danger btn-xs"
                            title="Dar de baja este trámite"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmModal({ tipo: 'reactivate', item: t })}
                            className="btn btn-secondary btn-xs"
                            style={{ color: '#28A745', borderColor: '#28A745' }}
                            title="Reactivar este trámite"
                          >
                            <RotateCcw size={13} />
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
      </div>

      {/* MODAL: REGISTRAR / EDITAR TIPO DE TRÁMITE EXTERNO */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal-dialog" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#800000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <GitBranch size={16} />
                </div>
                <h2 className="modal-title">
                  {editingTipo ? 'Editar Tipo de Trámite Externo' : 'Nuevo Tipo de Trámite Externo'}
                </h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="modal-close-btn" title="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {formError && (
                  <div style={{ padding: '10px 14px', borderRadius: '4px', backgroundColor: '#F8D7DA', color: '#721C24', border: '1px solid #F5C6CB', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <div>
                    <label className="form-label">
                      Código de Trámite <span style={{ color: '#E53E3E' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      className="form-control"
                      placeholder="Ej. CM, CDE1"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                      style={{ fontFamily: 'monospace', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Nombre Oficial del Trámite <span style={{ color: '#E53E3E' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={150}
                      className="form-control"
                      placeholder="Ej. Correspondencia Municipal Externa"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Descripción del Trámite / Alcance</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Detalle los documentos que componen este flujo o normativa de respaldo..."
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label">
                      SLA Reglamentario (Horas) <span style={{ color: '#E53E3E' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      required
                      className="form-control"
                      value={formData.tiempo_estimado_horas}
                      onChange={(e) => setFormData({ ...formData, tiempo_estimado_horas: e.target.value })}
                    />
                    <small style={{ fontSize: '0.72rem', color: '#718096' }}>Tiempo máximo de respuesta antes de alerta de vencimiento.</small>
                  </div>

                  <div>
                    <label className="form-label">Unidad Responsable</label>
                    <select
                      className="form-control"
                      value={formData.ubicacion_org_id}
                      onChange={(e) => setFormData({ ...formData, ubicacion_org_id: e.target.value })}
                    >
                      <option value="">-- Sin unidad fija (Ventanilla) --</option>
                      {ubicaciones.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} ({u.sigla})
                        </option>
                      ))}
                    </select>
                    <small style={{ fontSize: '0.72rem', color: '#718096' }}>Oficina que gestiona o fiscaliza este proceso.</small>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary btn-sm" disabled={formSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={formSubmitting}>
                  {formSubmitting ? 'Guardando...' : editingTipo ? 'Actualizar Trámite' : 'Registrar Trámite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR BAJA / REACTIVACIÓN */}
      {confirmModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setConfirmModal(null); }}>
          <div className="modal-dialog" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px',
                  background: confirmModal.tipo === 'delete' ? '#DC3545' : '#28A745',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  {confirmModal.tipo === 'delete' ? <Trash2 size={16} /> : <RotateCcw size={16} />}
                </div>
                <h2 className="modal-title">
                  {confirmModal.tipo === 'delete' ? 'Dar de Baja Trámite' : 'Reactivar Trámite'}
                </h2>
              </div>
              <button onClick={() => setConfirmModal(null)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: '#495057' }}>
                {confirmModal.tipo === 'delete' ? (
                  <>
                    ¿Estás seguro de que deseas dar de baja el trámite externo{' '}
                    <strong>"{confirmModal.item.codigo} - {confirmModal.item.nombre}"</strong>?
                  </>
                ) : (
                  <>
                    ¿Deseas reactivar el trámite externo{' '}
                    <strong>"{confirmModal.item.codigo} - {confirmModal.item.nombre}"</strong> para que vuelva a estar disponible en Ventanilla Única?
                  </>
                )}
              </p>
              {confirmModal.tipo === 'delete' && (
                <small style={{ color: '#718096', fontSize: '0.78rem' }}>
                  Esta acción aplica una <strong>baja lógica</strong> protegiendo las hojas de ruta y correlativos previamente generados.
                </small>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setConfirmModal(null)} className="btn btn-secondary btn-sm">
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                className={`btn btn-sm ${confirmModal.tipo === 'delete' ? 'btn-danger' : 'btn-primary'}`}
              >
                {confirmModal.tipo === 'delete' ? 'Sí, Dar de Baja' : 'Sí, Reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
