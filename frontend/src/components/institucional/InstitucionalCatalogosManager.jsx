import React, { useState, useEffect } from 'react';
import { institucionalService } from '../../services/api';
import { 
  Building2, 
  Briefcase, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Layers,
  ChevronRight
} from 'lucide-react';

export default function InstitucionalCatalogosManager() {
  const [subTab, setSubTab] = useState('unidades'); // 'unidades' | 'cargos'
  
  // Datos
  const [unidades, setUnidades] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnidadFilter, setSelectedUnidadFilter] = useState('');

  // Feedback
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // Modal Unidad
  const [showUnidadModal, setShowUnidadModal] = useState(false);
  const [editingUnidad, setEditingUnidad] = useState(null);
  const [unidadForm, setUnidadForm] = useState({ codU: '', nombU: '', activo: true });
  const [unidadModalError, setUnidadModalError] = useState(null);

  // Modal Cargo
  const [showCargoModal, setShowCargoModal] = useState(false);
  const [editingCargo, setEditingCargo] = useState(null);
  const [cargoForm, setCargoForm] = useState({ codCargo: '', nombreC: '', codU: '' });
  const [cargoModalError, setCargoModalError] = useState(null);

  // Confirmar eliminación
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'unidad' | 'cargo', item: {} }

  const showMsg = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [resU, resC] = await Promise.all([
        institucionalService.getUnidades(),
        institucionalService.getCargos()
      ]);
      const listU = Array.isArray(resU) ? resU : (resU?.data || []);
      const listC = Array.isArray(resC) ? resC : (resC?.data || []);
      setUnidades(listU);
      setCargos(listC);
    } catch (err) {
      console.error(err);
      showMsg('error', 'Error al cargar catálogos institucionales de DBNotasCMS.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Handlers para Unidad
  const handleOpenNuevaUnidad = () => {
    setEditingUnidad(null);
    setUnidadForm({ codU: '', nombU: '', activo: true });
    setUnidadModalError(null);
    setShowUnidadModal(true);
  };

  const handleOpenEditarUnidad = (u) => {
    setEditingUnidad(u);
    setUnidadForm({ codU: u.codU, nombU: u.nombU, activo: u.activo });
    setUnidadModalError(null);
    setShowUnidadModal(true);
  };

  const handleSaveUnidad = async (e) => {
    e.preventDefault();
    if (!unidadForm.nombU.trim()) {
      setUnidadModalError('El nombre de la unidad es obligatorio.');
      return;
    }

    try {
      if (editingUnidad) {
        await institucionalService.updateUnidad(editingUnidad.codU, {
          nombU: unidadForm.nombU.trim(),
          activo: unidadForm.activo
        });
        showMsg('success', `Unidad '${unidadForm.nombU.trim()}' actualizada con éxito.`);
      } else {
        await institucionalService.createUnidad({
          codU: unidadForm.codU ? parseInt(unidadForm.codU, 10) : null,
          nombU: unidadForm.nombU.trim(),
          activo: unidadForm.activo
        });
        showMsg('success', `Unidad '${unidadForm.nombU.trim()}' registrada con éxito.`);
      }
      setShowUnidadModal(false);
      loadAll();
    } catch (err) {
      setUnidadModalError(err.response?.data?.message || err.message || 'Error al guardar la unidad.');
    }
  };

  // Handlers para Cargo
  const handleOpenNuevoCargo = () => {
    setEditingCargo(null);
    setCargoForm({ 
      codCargo: '', 
      nombreC: '', 
      codU: selectedUnidadFilter || (unidades[0]?.codU ? String(unidades[0].codU) : '') 
    });
    setCargoModalError(null);
    setShowCargoModal(true);
  };

  const handleOpenEditarCargo = (c) => {
    setEditingCargo(c);
    setCargoForm({ codCargo: c.codCargo, nombreC: c.nombreC, codU: String(c.codU) });
    setCargoModalError(null);
    setShowCargoModal(true);
  };

  const handleSaveCargo = async (e) => {
    e.preventDefault();
    if (!cargoForm.nombreC.trim()) {
      setCargoModalError('El nombre del cargo es obligatorio.');
      return;
    }
    if (!cargoForm.codU) {
      setCargoModalError('Debe seleccionar la unidad a la que pertenece el cargo.');
      return;
    }

    try {
      if (editingCargo) {
        await institucionalService.updateCargo(editingCargo.codCargo, {
          nombreC: cargoForm.nombreC.trim(),
          codU: parseInt(cargoForm.codU, 10)
        });
        showMsg('success', `Cargo '${cargoForm.nombreC.trim()}' actualizado con éxito.`);
      } else {
        await institucionalService.createCargo({
          codCargo: cargoForm.codCargo ? parseInt(cargoForm.codCargo, 10) : null,
          nombreC: cargoForm.nombreC.trim(),
          codU: parseInt(cargoForm.codU, 10)
        });
        showMsg('success', `Cargo '${cargoForm.nombreC.trim()}' registrado con éxito.`);
      }
      setShowCargoModal(false);
      loadAll();
    } catch (err) {
      setCargoModalError(err.response?.data?.message || err.message || 'Error al guardar el cargo.');
    }
  };

  // Eliminación
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'unidad') {
        const res = await institucionalService.deleteUnidad(confirmDelete.item.codU);
        showMsg('success', res?.message || 'Unidad eliminada o desactivada correctamente.');
      } else {
        const res = await institucionalService.deleteCargo(confirmDelete.item.codCargo);
        showMsg('success', res?.message || 'Cargo eliminado correctamente.');
      }
      setConfirmDelete(null);
      loadAll();
    } catch (err) {
      showMsg('error', err.response?.data?.message || err.message || 'Error al eliminar el registro.');
      setConfirmDelete(null);
    }
  };

  // Filtros
  const filteredUnidades = unidades.filter(u => 
    u.nombU.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(u.codU).includes(searchTerm)
  );

  const filteredCargos = cargos.filter(c => {
    const matchSearch = c.nombreC.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        String(c.codCargo).includes(searchTerm) ||
                        (c.unidadNombre && c.unidadNombre.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchUnidad = selectedUnidadFilter ? String(c.codU) === String(selectedUnidadFilter) : true;
    return matchSearch && matchUnidad;
  });

  return (
    <div>
      {/* Banner de Retroalimentación */}
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

      {/* Sub-Navegación de Catálogos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => { setSubTab('unidades'); setSearchTerm(''); }}
            className={`btn btn-sm ${subTab === 'unidades' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Building2 size={15} />
            <span>Unidades Institucionales (TUnidad)</span>
            <span style={{ 
              marginLeft: '4px', 
              fontSize: '0.75rem', 
              padding: '1px 6px', 
              borderRadius: '10px', 
              backgroundColor: subTab === 'unidades' ? 'rgba(255,255,255,0.25)' : 'var(--color-border)' 
            }}>
              {unidades.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setSubTab('cargos'); setSearchTerm(''); }}
            className={`btn btn-sm ${subTab === 'cargos' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Briefcase size={15} />
            <span>Cargos Dependientes (TCargo)</span>
            <span style={{ 
              marginLeft: '4px', 
              fontSize: '0.75rem', 
              padding: '1px 6px', 
              borderRadius: '10px', 
              backgroundColor: subTab === 'cargos' ? 'rgba(255,255,255,0.25)' : 'var(--color-border)' 
            }}>
              {cargos.length}
            </span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={loadAll} 
            disabled={loading} 
            className="btn btn-secondary btn-sm"
            title="Recargar datos de DBNotasCMS"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          {subTab === 'unidades' ? (
            <button 
              onClick={handleOpenNuevaUnidad} 
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              <span>Nueva Unidad</span>
            </button>
          ) : (
            <button 
              onClick={handleOpenNuevoCargo} 
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              <span>Nuevo Cargo</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6C757D' }} />
            <input
              type="text"
              placeholder={subTab === 'unidades' ? "Buscar por código o nombre de unidad..." : "Buscar por cargo, código o unidad..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
            />
          </div>

          {subTab === 'cargos' && (
            <div style={{ minWidth: '220px' }}>
              <select
                value={selectedUnidadFilter}
                onChange={(e) => setSelectedUnidadFilter(e.target.value)}
                className="form-control"
                style={{ fontSize: '0.85rem' }}
              >
                <option value="">Todas las unidades ({unidades.length})</option>
                {unidades.map(u => (
                  <option key={u.codU} value={u.codU}>
                    {u.codU} - {u.nombU}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* VISTA 1: TABLA DE UNIDADES (TUnidad) */}
      {subTab === 'unidades' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table-sucre">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>CodU</th>
                  <th>Nombre de la Unidad Institucional</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Cargos Registrados</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Estado</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnidades.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#6C757D' }}>
                      No se encontraron unidades institucionales que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredUnidades.map((u) => (
                    <tr key={u.codU}>
                      <td>
                        <span className="badge badge-azul" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          #{u.codU}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1B365D' }}>{u.nombU}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6C757D' }}>Catálogo Oficial DBNotasCMS</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-sucre" style={{ fontSize: '0.8rem' }}>
                          {cargos.filter(c => c.codU === u.codU).length} cargo(s)
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {u.activo ? (
                          <span className="badge badge-vigente">ACTIVO</span>
                        ) : (
                          <span className="badge badge-alerta">INACTIVO</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            onClick={() => handleOpenEditarUnidad(u)}
                            className="btn btn-secondary btn-xs"
                            title="Editar Unidad"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ type: 'unidad', item: u })}
                            className="btn btn-danger btn-xs"
                            title="Desactivar / Eliminar Unidad"
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
        </div>
      )}

      {/* VISTA 2: TABLA DE CARGOS (TCargo) */}
      {subTab === 'cargos' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table-sucre">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>CodCargo</th>
                  <th>Nombre del Cargo Oficial</th>
                  <th>Unidad Dependiente (TUnidad)</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCargos.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#6C757D' }}>
                      No se encontraron cargos institucionales que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredCargos.map((c) => (
                    <tr key={c.codCargo}>
                      <td>
                        <span className="badge badge-sucre" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          #{c.codCargo}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1B365D' }}>{c.nombreC}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={14} color="#800000" />
                          <span style={{ fontSize: '0.85rem', color: '#495057', fontWeight: 500 }}>
                            {c.unidadNombre || `Unidad CodU: ${c.codU}`}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            onClick={() => handleOpenEditarCargo(c)}
                            className="btn btn-secondary btn-xs"
                            title="Editar Cargo"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ type: 'cargo', item: c })}
                            className="btn btn-danger btn-xs"
                            title="Eliminar Cargo"
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
        </div>
      )}

      {/* MODAL: CREAR / EDITAR UNIDAD (TUnidad) */}
      {showUnidadModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowUnidadModal(false); }}>
          <div className="modal-dialog" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#1B365D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Building2 size={16} />
                </div>
                <h2 className="modal-title">
                  {editingUnidad ? 'Editar Unidad Institucional' : 'Nueva Unidad Institucional'}
                </h2>
              </div>
              <button onClick={() => setShowUnidadModal(false)} className="modal-close-btn" title="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUnidad}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {unidadModalError && (
                  <div style={{ padding: '10px 14px', borderRadius: '4px', backgroundColor: '#F8D7DA', color: '#721C24', border: '1px solid #F5C6CB', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{unidadModalError}</span>
                  </div>
                )}

                <div>
                  <label className="form-label">
                    Código de Unidad (CodU) <span style={{ fontSize: '0.75rem', color: '#6C757D' }}>(Opcional)</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Generado automáticamente si se deja vacío"
                    value={unidadForm.codU}
                    disabled={!!editingUnidad}
                    onChange={(e) => setUnidadForm({ ...unidadForm, codU: e.target.value })}
                  />
                  {editingUnidad && (
                    <small style={{ color: '#6C757D', fontSize: '0.75rem' }}>El código de unidad es clave primaria y no puede modificarse.</small>
                  )}
                </div>

                <div>
                  <label className="form-label">Nombre de la Unidad <span style={{ color: '#E53E3E' }}>*</span></label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    className="form-control"
                    placeholder="Ej. DIRECCION DE MEDIO AMBIENTE"
                    value={unidadForm.nombU}
                    onChange={(e) => setUnidadForm({ ...unidadForm, nombU: e.target.value })}
                  />
                  <small style={{ color: '#6C757D', fontSize: '0.75rem' }}>Se guardará en mayúsculas conforme al estándar de DBNotasCMS.</small>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="unidadActivoCheck"
                    checked={unidadForm.activo}
                    onChange={(e) => setUnidadForm({ ...unidadForm, activo: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="unidadActivoCheck" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1B365D', cursor: 'pointer', margin: 0 }}>
                    Unidad Activa en el Sistema
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowUnidadModal(false)} className="btn btn-secondary btn-sm">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {editingUnidad ? 'Actualizar Unidad' : 'Guardar Unidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR CARGO (TCargo) */}
      {showCargoModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowCargoModal(false); }}>
          <div className="modal-dialog" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#800000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Briefcase size={16} />
                </div>
                <h2 className="modal-title">
                  {editingCargo ? 'Editar Cargo Institucional' : 'Nuevo Cargo Institucional'}
                </h2>
              </div>
              <button onClick={() => setShowCargoModal(false)} className="modal-close-btn" title="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCargo}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cargoModalError && (
                  <div style={{ padding: '10px 14px', borderRadius: '4px', backgroundColor: '#F8D7DA', color: '#721C24', border: '1px solid #F5C6CB', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{cargoModalError}</span>
                  </div>
                )}

                <div>
                  <label className="form-label">
                    Unidad de Pertenencia (TUnidad) <span style={{ color: '#E53E3E' }}>*</span>
                  </label>
                  <select
                    required
                    className="form-control"
                    value={cargoForm.codU}
                    onChange={(e) => setCargoForm({ ...cargoForm, codU: e.target.value })}
                  >
                    <option value="">-- Seleccionar Unidad Institucional --</option>
                    {unidades.map(u => (
                      <option key={u.codU} value={u.codU}>
                        #{u.codU} - {u.nombU}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    Código de Cargo (CodCargo) <span style={{ fontSize: '0.75rem', color: '#6C757D' }}>(Opcional)</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Generado automáticamente si se deja vacío"
                    value={cargoForm.codCargo}
                    disabled={!!editingCargo}
                    onChange={(e) => setCargoForm({ ...cargoForm, codCargo: e.target.value })}
                  />
                  {editingCargo && (
                    <small style={{ color: '#6C757D', fontSize: '0.75rem' }}>El código de cargo es clave primaria y no puede modificarse.</small>
                  )}
                </div>

                <div>
                  <label className="form-label">Nombre del Cargo <span style={{ color: '#E53E3E' }}>*</span></label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    className="form-control"
                    placeholder="Ej. JEFE DE UNIDAD AMBIENTAL"
                    value={cargoForm.nombreC}
                    onChange={(e) => setCargoForm({ ...cargoForm, nombreC: e.target.value })}
                  />
                  <small style={{ color: '#6C757D', fontSize: '0.75rem' }}>Denominación del puesto oficial en la estructura municipal.</small>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCargoModal(false)} className="btn btn-secondary btn-sm">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {editingCargo ? 'Actualizar Cargo' : 'Guardar Cargo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
          <div className="modal-dialog" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#DC3545', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Trash2 size={16} />
                </div>
                <h2 className="modal-title">Confirmar Eliminación</h2>
              </div>
              <button onClick={() => setConfirmDelete(null)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: '#495057' }}>
                ¿Estás seguro de que deseas eliminar {confirmDelete.type === 'unidad' ? 'la unidad institucional' : 'el cargo institucional'}{' '}
                <strong>
                  "{confirmDelete.type === 'unidad' ? confirmDelete.item.nombU : confirmDelete.item.nombreC}"
                </strong>?
              </p>
              {confirmDelete.type === 'unidad' && (
                <div style={{ padding: '8px 12px', backgroundColor: '#FFF3CD', border: '1px solid #FFEEBA', borderRadius: '4px', fontSize: '0.8rem', color: '#856404', marginTop: '10px' }}>
                  Si la unidad tiene cargos asociados, el sistema aplicará una <strong>desactivación lógica</strong> (Activo = false) para proteger la integridad referencial.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setConfirmDelete(null)} className="btn btn-secondary btn-sm">
                Cancelar
              </button>
              <button onClick={handleDeleteConfirm} className="btn btn-danger btn-sm">
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
