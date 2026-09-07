import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Building2,
  Search,
  Plus,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Star,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import {
  personasService,
  usuariosService,
  rolesService,
  usuarioRolesService,
  ubicacionesService
} from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminHub() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('personas'); // 'personas' | 'usuarios' | 'roles'

  // Datos del backend
  const [personas, setPersonas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);

  // Estados de carga y feedback
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [personaEditing, setPersonaEditing] = useState(null);
  const [personaForm, setPersonaForm] = useState({
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    ci: '',
    ci_expedido: 'CH',
    sexo: 'M',
    estado_civil: 'Soltero/a',
    telefono: '',
    email: '',
    empresa_telefonica: 'Entel',
    direccion: ''
  });

  const [showUsuarioModal, setShowUsuarioModal] = useState(false);
  const [usuarioForm, setUsuarioForm] = useState({
    persona_id: '',
    login: '',
    password: '',
    cargo: ''
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [userForPassword, setUserForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const [showRolesModal, setShowRolesModal] = useState(false);
  const [userForRoles, setUserForRoles] = useState(null);
  const [userAssignedRoles, setUserAssignedRoles] = useState([]);
  const [newRoleForm, setNewRoleForm] = useState({
    rol_id: '',
    ubicacion_org_id: '',
    nivel_acceso: 'CONTROL_TOTAL',
    fecha_expiracion: '',
    es_principal: false
  });

  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'persona' | 'usuario', item: {} }

  // Carga inicial
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [resPers, resUsr, resRol, resUbic] = await Promise.all([
        personasService.getAll({ search: '' }),
        usuariosService.getAll({ search: '' }),
        rolesService.getAll(),
        ubicacionesService.getAll()
      ]);

      if (resPers.success) setPersonas(resPers.data || []);
      if (resUsr.success) setUsuarios(resUsr.data || []);
      if (resRol.success) setRoles(resRol.data || []);
      if (resUbic.success) setUbicaciones(resUbic.data || []);
    } catch (err) {
      console.error('Error al cargar datos administrativos:', err);
      showFeedbackMsg('error', 'No se pudieron cargar los datos del panel administrativo.');
    } finally {
      setLoading(false);
    }
  };

  const showFeedbackMsg = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  // ----------------------------------------------------
  // MANEJADORES: PERSONAS
  // ----------------------------------------------------
  const handleOpenPersonaModal = (persona = null) => {
    if (persona) {
      setPersonaEditing(persona);
      setPersonaForm({
        nombres: persona.nombres || '',
        apellido_paterno: persona.apellido_paterno || '',
        apellido_materno: persona.apellido_materno || '',
        ci: persona.ci || '',
        ci_expedido: persona.ci_expedido || 'CH',
        sexo: persona.sexo || 'M',
        estado_civil: persona.estado_civil || 'Soltero/a',
        telefono: persona.telefono || '',
        email: persona.email || '',
        empresa_telefonica: persona.empresa_telefonica || 'Entel',
        direccion: persona.direccion || ''
      });
    } else {
      setPersonaEditing(null);
      setPersonaForm({
        nombres: '',
        apellido_paterno: '',
        apellido_materno: '',
        ci: '',
        ci_expedido: 'CH',
        sexo: 'M',
        estado_civil: 'Soltero/a',
        telefono: '',
        email: '',
        empresa_telefonica: 'Entel',
        direccion: ''
      });
    }
    setShowPersonaModal(true);
  };

  const handleSavePersona = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (personaEditing) {
        const res = await personasService.update(personaEditing.id, personaForm);
        if (res.success) {
          showFeedbackMsg('success', 'Datos de la persona actualizados exitosamente.');
        }
      } else {
        const res = await personasService.create(personaForm);
        if (res.success) {
          showFeedbackMsg('success', 'Persona registrada en el sistema exitosamente.');
        }
      }
      setShowPersonaModal(false);
      const resPers = await personasService.getAll({ search: searchTerm });
      if (resPers.success) setPersonas(resPers.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al guardar persona.';
      showFeedbackMsg('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePersona = async (persona) => {
    setActionLoading(true);
    try {
      const res = await personasService.delete(persona.id);
      if (res.success) {
        showFeedbackMsg('success', `La persona ${persona.nombres} ${persona.apellido_paterno} fue dada de baja.`);
        setConfirmDelete(null);
        const resPers = await personasService.getAll({ search: searchTerm });
        if (resPers.success) setPersonas(resPers.data || []);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'No se pudo dar de baja a la persona.';
      showFeedbackMsg('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // MANEJADORES: USUARIOS
  // ----------------------------------------------------
  const handleOpenUsuarioModal = () => {
    const activePersonas = personas.filter((p) => p.activo);
    setUsuarioForm({
      persona_id: activePersonas[0]?.id || '',
      login: '',
      password: '',
      cargo: ''
    });
    setShowUsuarioModal(true);
  };

  const handleSaveUsuario = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await usuariosService.create(usuarioForm);
      if (res.success) {
        showFeedbackMsg('success', `Usuario '${usuarioForm.login}' creado exitosamente.`);
        setShowUsuarioModal(false);
        const resUsr = await usuariosService.getAll({ search: searchTerm });
        if (resUsr.success) setUsuarios(resUsr.data || []);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al registrar el usuario.';
      showFeedbackMsg('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPasswordModal = (usuario) => {
    setUserForPassword(usuario);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showFeedbackMsg('error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await usuariosService.resetPassword(userForPassword.id, newPassword);
      if (res.success) {
        showFeedbackMsg('success', `Contraseña restablecida exitosamente para '${userForPassword.login}'.`);
        setShowPasswordModal(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al restablecer contraseña.';
      showFeedbackMsg('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUsuario = async (usuario) => {
    setActionLoading(true);
    try {
      const res = await usuariosService.delete(usuario.id);
      if (res.success) {
        showFeedbackMsg('success', `El usuario '${usuario.login}' fue dado de baja.`);
        setConfirmDelete(null);
        const resUsr = await usuariosService.getAll({ search: searchTerm });
        if (resUsr.success) setUsuarios(resUsr.data || []);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'No se pudo dar de baja al usuario.';
      showFeedbackMsg('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // MANEJADORES: ROLES DE USUARIO
  // ----------------------------------------------------
  const handleOpenRolesModal = async (usuario) => {
    setUserForRoles(usuario);
    setNewRoleForm({
      rol_id: roles[0]?.id || '',
      ubicacion_org_id: ubicaciones[0]?.id || '',
      nivel_acceso: 'CONTROL_TOTAL',
      fecha_expiracion: '',
      es_principal: false
    });

    try {
      const res = await usuarioRolesService.getByUsuario(usuario.id);
      if (res.success) {
        setUserAssignedRoles(res.data || []);
      }
    } catch (err) {
      console.error('Error al cargar roles del usuario:', err);
    }

    setShowRolesModal(true);
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        usuario_id: userForRoles.id,
        rol_id: parseInt(newRoleForm.rol_id, 10),
        ubicacion_org_id: parseInt(newRoleForm.ubicacion_org_id, 10),
        nivel_acceso: newRoleForm.nivel_acceso,
        fecha_expiracion: newRoleForm.fecha_expiracion || null,
        es_principal: newRoleForm.es_principal
      };

      const res = await usuarioRolesService.assign(payload);
      if (res.success) {
        showFeedbackMsg('success', 'Rol asignado al usuario exitosamente.');
        // Recargar asignaciones del usuario
        const resRoles = await usuarioRolesService.getByUsuario(userForRoles.id);
        if (resRoles.success) setUserAssignedRoles(resRoles.data || []);
        // Recargar listado general de usuarios
        const resUsr = await usuariosService.getAll();
        if (resUsr.success) setUsuarios(resUsr.data || []);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al asignar rol.';
      showFeedbackMsg('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetPrincipalRole = async (asignacionId) => {
    setActionLoading(true);
    try {
      const res = await usuarioRolesService.setPrincipal(asignacionId);
      if (res.success) {
        showFeedbackMsg('success', 'Rol marcado como principal para el usuario.');
        const resRoles = await usuarioRolesService.getByUsuario(userForRoles.id);
        if (resRoles.success) setUserAssignedRoles(resRoles.data || []);
        const resUsr = await usuariosService.getAll();
        if (resUsr.success) setUsuarios(resUsr.data || []);
      }
    } catch (err) {
      showFeedbackMsg('error', err.message || 'No se pudo actualizar el rol principal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveRole = async (asignacionId) => {
    setActionLoading(true);
    try {
      const res = await usuarioRolesService.delete(asignacionId);
      if (res.success) {
        showFeedbackMsg('success', 'Rol desasignado del usuario.');
        const resRoles = await usuarioRolesService.getByUsuario(userForRoles.id);
        if (resRoles.success) setUserAssignedRoles(resRoles.data || []);
        const resUsr = await usuariosService.getAll();
        if (resUsr.success) setUsuarios(resUsr.data || []);
      }
    } catch (err) {
      showFeedbackMsg('error', err.message || 'No se pudo desasignar el rol.');
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // FILTRADO
  // ----------------------------------------------------
  const filteredPersonas = personas.filter((p) => {
    const full = `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno || ''} ${p.ci}`.toLowerCase();
    return full.includes(searchTerm.toLowerCase());
  });

  const filteredUsuarios = usuarios.filter((u) => {
    const full = `${u.login} ${u.nombres || ''} ${u.apellido_paterno || ''} ${u.cargo || ''} ${u.ci || ''}`.toLowerCase();
    return full.includes(searchTerm.toLowerCase());
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '1.5rem auto', padding: '0 1rem' }}>
      {/* Encabezado del Módulo con Identidad Sucre */}
      <div
        className="card"
        style={{
          borderLeft: '5px solid #800000',
          marginBottom: '1.5rem',
          padding: '1.5rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-sucre">Módulo de Administración</span>
            <span style={{ fontSize: '0.8rem', color: '#6C757D' }}>RF-02 • Sprint 1</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', color: '#1B365D', margin: '0 0 4px 0' }}>
            Gestión de Personas, Cuentas y Roles Institucionales
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.92rem' }}>
            Administración centralizada de identidades, credenciales de acceso y permisos orgánicos de la Municipalidad de Sucre.
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
            setActiveTab('personas');
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
            color: activeTab === 'personas' ? '#800000' : '#6C757D',
            borderBottom: activeTab === 'personas' ? '3px solid #800000' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          <Users size={18} />
          <span>Personas ({personas.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('usuarios');
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
            color: activeTab === 'usuarios' ? '#800000' : '#6C757D',
            borderBottom: activeTab === 'usuarios' ? '3px solid #800000' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          <UserPlus size={18} />
          <span>Usuarios y Asignaciones ({usuarios.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('roles');
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
            color: activeTab === 'roles' ? '#800000' : '#6C757D',
            borderBottom: activeTab === 'roles' ? '3px solid #800000' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          <Shield size={18} />
          <span>Roles del Sistema ({roles.length})</span>
        </button>
      </div>

      {/* Barra de Búsqueda y Botón de Acción */}
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
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6C757D' }}
          />
          <input
            type="text"
            className="form-control"
            placeholder={
              activeTab === 'personas'
                ? 'Buscar por nombre o CI...'
                : activeTab === 'usuarios'
                ? 'Buscar por login, nombre, cargo...'
                : 'Buscar roles...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '34px', fontSize: '0.88rem' }}
          />
        </div>

        {activeTab === 'personas' && (
          <button onClick={() => handleOpenPersonaModal()} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>Nueva Persona</span>
          </button>
        )}

        {activeTab === 'usuarios' && (
          <button onClick={handleOpenUsuarioModal} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>Nuevo Usuario</span>
          </button>
        )}
      </div>

      {/* ==================================================== */}
      {/* PESTAÑA 1: TABLA DE PERSONAS */}
      {/* ==================================================== */}
      {activeTab === 'personas' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>C.I. / Expedido</th>
                  <th>Apellidos y Nombres</th>
                  <th>Sexo / Est. Civil</th>
                  <th>Contacto</th>
                  <th>Dirección</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                      Cargando personas...
                    </td>
                  </tr>
                ) : filteredPersonas.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6C757D' }}>
                      No se encontraron registros de personas.
                    </td>
                  </tr>
                ) : (
                  filteredPersonas.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.ci}</strong> <span style={{ color: '#6C757D', fontSize: '0.82rem' }}>{p.ci_expedido}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#1B365D' }}>
                          {p.apellido_paterno} {p.apellido_materno || ''}, {p.nombres}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>
                          {p.sexo === 'M' ? 'Masc.' : 'Fem.'} • {p.estado_civil || 'S/D'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          {p.telefono && <div>📞 {p.telefono} ({p.empresa_telefonica || 'N/D'})</div>}
                          {p.email && <div style={{ color: '#6C757D' }}>✉️ {p.email}</div>}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#495057', maxWidth: '200px' }}>
                        {p.direccion || '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${p.activo ? 'badge-active' : 'badge-inactive'}`}>
                          {p.activo ? 'Vigente' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenPersonaModal(p)}
                            className="btn btn-secondary btn-sm"
                            title="Editar persona"
                            style={{ padding: '4px 8px' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          {p.activo ? (
                            <button
                              onClick={() => setConfirmDelete({ type: 'persona', item: p })}
                              className="btn btn-outline-danger btn-sm"
                              title="Dar de baja"
                              style={{ padding: '4px 8px' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : null}
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

      {/* ==================================================== */}
      {/* PESTAÑA 2: TABLA DE USUARIOS Y ROLES */}
      {/* ==================================================== */}
      {activeTab === 'usuarios' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuario / Login</th>
                  <th>Persona Asociada</th>
                  <th>Cargo Institucional</th>
                  <th>Roles & Oficinas Asignadas</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                      Cargando usuarios...
                    </td>
                  </tr>
                ) : filteredUsuarios.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#6C757D' }}>
                      No se encontraron usuarios registrados.
                    </td>
                  </tr>
                ) : (
                  filteredUsuarios.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '4px',
                              background: '#1B365D',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: '0.85rem'
                            }}
                          >
                            {u.login.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <strong style={{ color: '#1B365D' }}>{u.login}</strong>
                            <div style={{ fontSize: '0.78rem', color: '#6C757D' }}>ID: #{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {u.apellido_paterno} {u.apellido_materno || ''}, {u.nombres}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6C757D' }}>CI: {u.ci}</div>
                      </td>
                      <td style={{ fontSize: '0.88rem' }}>{u.cargo || 'Funcionario'}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {u.roles && u.roles.length > 0 ? (
                            u.roles.map((r) => (
                              <span
                                key={r.usuario_rol_id}
                                className={`badge ${r.es_principal ? 'badge-sucre' : 'badge-gold'}`}
                                style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title={`Oficina: ${r.ubicacion_nombre} • Nivel: ${r.nivel_acceso}`}
                              >
                                {r.es_principal && <Star size={10} />}
                                {r.rol_nombre} ({r.ubicacion_codigo || 'OF'})
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#DC3545', fontStyle: 'italic' }}>
                              Sin roles asignados
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${u.activo ? 'badge-active' : 'badge-inactive'}`}>
                          {u.activo ? 'Vigente' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenRolesModal(u)}
                            className="btn btn-secondary btn-sm"
                            title="Gestionar roles y oficinas"
                            style={{ padding: '4px 8px' }}
                          >
                            <Shield size={14} />
                            <span>Roles</span>
                          </button>
                          <button
                            onClick={() => handleOpenPasswordModal(u)}
                            className="btn btn-secondary btn-sm"
                            title="Restablecer contraseña"
                            style={{ padding: '4px 8px' }}
                          >
                            <KeyRound size={14} />
                          </button>
                          {u.activo && u.id !== currentUser?.userId ? (
                            <button
                              onClick={() => setConfirmDelete({ type: 'usuario', item: u })}
                              className="btn btn-outline-danger btn-sm"
                              title="Dar de baja usuario"
                              style={{ padding: '4px 8px' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : null}
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

      {/* ==================================================== */}
      {/* PESTAÑA 3: ROLES DEL SISTEMA */}
      {/* ==================================================== */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {roles.map((rol) => (
            <div key={rol.id} className="card" style={{ borderTop: '4px solid #1B365D', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color="#800000" />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1B365D' }}>{rol.nombre}</h3>
                </div>
                <span className="badge badge-gold" style={{ fontFamily: 'monospace' }}>
                  {rol.codigo}
                </span>
              </div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', minHeight: '40px' }}>
                {rol.descripcion || 'Sin descripción asignada en el sistema.'}
              </p>
              <div
                style={{
                  marginTop: '1rem',
                  paddingTop: '10px',
                  borderTop: '1px solid #E9ECEF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.82rem',
                  color: '#6C757D'
                }}
              >
                <span>Estado: <strong>{rol.activo ? 'Activo' : 'Inactivo'}</strong></span>
                <span className="badge badge-sucre">Base Wayka</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: REGISTRAR / EDITAR PERSONA */}
      {/* ==================================================== */}
      {showPersonaModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowPersonaModal(false); }}>
          <div className="modal-dialog" style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#800000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Users size={16} />
                </div>
                <h2 className="modal-title">
                  {personaEditing ? 'Editar Datos de Persona' : 'Registrar Nueva Persona'}
                </h2>
              </div>
              <button onClick={() => setShowPersonaModal(false)} className="modal-close-btn" title="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePersona}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label required">Nombres</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={personaForm.nombres}
                    onChange={(e) => setPersonaForm({ ...personaForm, nombres: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label required">Apellido Paterno</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={personaForm.apellido_paterno}
                    onChange={(e) => setPersonaForm({ ...personaForm, apellido_paterno: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Apellido Materno</label>
                  <input
                    type="text"
                    className="form-control"
                    value={personaForm.apellido_materno}
                    onChange={(e) => setPersonaForm({ ...personaForm, apellido_materno: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label required">Cédula de Identidad (CI)</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={personaForm.ci}
                    onChange={(e) => setPersonaForm({ ...personaForm, ci: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label required">Expedido en</label>
                  <select
                    className="form-control"
                    value={personaForm.ci_expedido}
                    onChange={(e) => setPersonaForm({ ...personaForm, ci_expedido: e.target.value })}
                  >
                    <option value="CH">CH - Chuquisaca (Sucre)</option>
                    <option value="LP">LP - La Paz</option>
                    <option value="CB">CB - Cochabamba</option>
                    <option value="SC">SC - Santa Cruz</option>
                    <option value="OR">OR - Oruro</option>
                    <option value="PT">PT - Potosí</option>
                    <option value="TJ">TJ - Tarija</option>
                    <option value="BE">BE - Beni</option>
                    <option value="PD">PD - Pando</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Sexo</label>
                  <select
                    className="form-control"
                    value={personaForm.sexo}
                    onChange={(e) => setPersonaForm({ ...personaForm, sexo: e.target.value })}
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Estado Civil</label>
                  <select
                    className="form-control"
                    value={personaForm.estado_civil}
                    onChange={(e) => setPersonaForm({ ...personaForm, estado_civil: e.target.value })}
                  >
                    <option value="Soltero/a">Soltero/a</option>
                    <option value="Casado/a">Casado/a</option>
                    <option value="Divorciado/a">Divorciado/a</option>
                    <option value="Viudo/a">Viudo/a</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Teléfono / Celular</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: 72881234"
                    value={personaForm.telefono}
                    onChange={(e) => setPersonaForm({ ...personaForm, telefono: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Empresa Telefónica</label>
                  <select
                    className="form-control"
                    value={personaForm.empresa_telefonica}
                    onChange={(e) => setPersonaForm({ ...personaForm, empresa_telefonica: e.target.value })}
                  >
                    <option value="Entel">Entel</option>
                    <option value="Tigo">Tigo</option>
                    <option value="Viva">Viva</option>
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Correo Electrónico</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="ejemplo@sucre.bo"
                    value={personaForm.email}
                    onChange={(e) => setPersonaForm({ ...personaForm, email: e.target.value })}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Dirección / Domicilio</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Calle, Número, Zona"
                    value={personaForm.direccion}
                    onChange={(e) => setPersonaForm({ ...personaForm, direccion: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowPersonaModal(false)}
                  className="btn btn-secondary btn-sm"
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={actionLoading}>
                  {actionLoading ? 'Guardando...' : personaEditing ? 'Actualizar Persona' : 'Registrar Persona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CREAR USUARIO VINCULADO */}
      {/* ==================================================== */}
      {showUsuarioModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowUsuarioModal(false); }}>
          <div className="modal-dialog" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#1B365D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <UserPlus size={16} />
                </div>
                <h2 className="modal-title">Crear Cuenta de Usuario</h2>
              </div>
              <button onClick={() => setShowUsuarioModal(false)} className="modal-close-btn" title="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUsuario}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label required">Seleccionar Persona Vinculada</label>
                  <select
                    className="form-control"
                    required
                    value={usuarioForm.persona_id}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, persona_id: e.target.value })}
                  >
                    <option value="">-- Seleccione una persona --</option>
                    {personas
                      .filter((p) => p.activo)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.apellido_paterno} {p.apellido_materno || ''}, {p.nombres} (CI: {p.ci})
                        </option>
                      ))}
                  </select>
                  <span style={{ fontSize: '0.78rem', color: '#6C757D' }}>
                    Cada cuenta institucional debe estar ligada a una persona registrada (RF-02.2).
                  </span>
                </div>

                <div>
                  <label className="form-label required">Nombre de Usuario (Login)</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="ej: mfernandez"
                    value={usuarioForm.login}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, login: e.target.value.toLowerCase().trim() })}
                  />
                </div>

                <div>
                  <label className="form-label required">Contraseña Inicial</label>
                  <input
                    type="password"
                    className="form-control"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={usuarioForm.password}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, password: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Cargo Institucional</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Encargado de Ventanilla Única"
                    value={usuarioForm.cargo}
                    onChange={(e) => setUsuarioForm({ ...usuarioForm, cargo: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowUsuarioModal(false)}
                  className="btn btn-secondary btn-sm"
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={actionLoading}>
                  {actionLoading ? 'Creando...' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: RESTABLECER CONTRASEÑA DE USUARIO */}
      {/* ==================================================== */}
      {showPasswordModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowPasswordModal(false); }}>
          <div className="modal-dialog" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#800000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <KeyRound size={16} />
                </div>
                <h2 className="modal-title">Restablecer Contraseña</h2>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="modal-close-btn" title="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePassword}>
              <div className="modal-body">
                <p style={{ fontSize: '0.88rem', color: '#495057', marginBottom: '1rem' }}>
                  Restablecer credencial de acceso para el usuario: <strong>{userForPassword?.login}</strong> (
                  {userForPassword?.nombres} {userForPassword?.apellido_paterno}).
                </p>

                <div>
                  <label className="form-label required">Nueva Contraseña</label>
                  <input
                    type="password"
                    className="form-control"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn btn-secondary btn-sm"
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={actionLoading}>
                  {actionLoading ? 'Restableciendo...' : 'Guardar Nueva Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: GESTIÓN DE ROLES Y OFICINAS DE USUARIO */}
      {/* ==================================================== */}
      {showRolesModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowRolesModal(false); }}>
          <div className="modal-dialog" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: '#1B365D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <Shield size={16} />
                  </div>
                  <h2 className="modal-title">Roles y Oficinas de Usuario</h2>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#6C757D', marginTop: '2px', marginLeft: '40px' }}>
                  Usuario: <strong>{userForRoles?.login}</strong> • {userForRoles?.nombres}{' '}
                  {userForRoles?.apellido_paterno}
                </div>
              </div>
              <button onClick={() => setShowRolesModal(false)} className="modal-close-btn" title="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Listado de roles actualmente asignados */}
              <h4 style={{ fontSize: '0.95rem', color: '#1B365D', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck size={16} color="#800000" />
                <span>Asignaciones Actuales ({userAssignedRoles.length})</span>
              </h4>

              {userAssignedRoles.length === 0 ? (
                <div
                  style={{
                    padding: '1rem',
                    background: '#F8F9FA',
                    border: '1px dashed #CED4DA',
                    borderRadius: '4px',
                    textAlign: 'center',
                    color: '#6C757D',
                    fontSize: '0.88rem',
                    marginBottom: '1.5rem'
                  }}
                >
                  Este usuario no tiene ningún rol activo asignado. Asigne un rol a continuación para permitir su acceso.
                </div>
              ) : (
                <div style={{ marginBottom: '1.5rem', border: '1px solid #E9ECEF', borderRadius: '4px', overflow: 'hidden' }}>
                  <table className="table" style={{ margin: 0, fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Rol</th>
                        <th>Oficina / Ubicación</th>
                        <th>Nivel</th>
                        <th>Vigencia</th>
                        <th style={{ textAlign: 'center' }}>Principal</th>
                        <th style={{ textAlign: 'right' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userAssignedRoles.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <strong>{a.rol_nombre}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#6C757D' }}>{a.rol_codigo}</div>
                          </td>
                          <td>
                            <span>{a.ubicacion_nombre}</span>
                            <div style={{ fontSize: '0.75rem', color: '#6C757D' }}>Cod: {a.ubicacion_codigo}</div>
                          </td>
                          <td>
                            <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                              {a.nivel_acceso}
                            </span>
                          </td>
                          <td>
                            {a.fecha_expiracion ? (
                              <span>Hasta {a.fecha_expiracion.substring(0, 10)}</span>
                            ) : (
                              <span style={{ color: '#28A745' }}>Indefinida</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {a.es_principal ? (
                              <span className="badge badge-sucre" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                <Star size={10} /> Principal
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSetPrincipalRole(a.id)}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                                disabled={actionLoading}
                              >
                                Hacer Principal
                              </button>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => handleRemoveRole(a.id)}
                              className="btn btn-outline-danger btn-sm"
                              style={{ padding: '2px 6px' }}
                              disabled={actionLoading}
                              title="Desasignar rol"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Formulario para asignar nuevo rol */}
              <div
                style={{
                  background: '#F8F9FA',
                  padding: '1.25rem',
                  borderRadius: '4px',
                  border: '1px solid #E9ECEF'
                }}
              >
                <h4 style={{ fontSize: '0.92rem', color: '#800000', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={16} />
                  <span>Asignar Nuevo Rol al Usuario</span>
                </h4>

                <form onSubmit={handleAssignRole}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label required">Rol Institucional</label>
                      <select
                        className="form-control"
                        required
                        value={newRoleForm.rol_id}
                        onChange={(e) => setNewRoleForm({ ...newRoleForm, rol_id: e.target.value })}
                      >
                        <option value="">-- Seleccionar Rol --</option>
                        {roles
                          .filter((r) => r.activo)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nombre} ({r.codigo})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label required">Oficina / Ubicación Orgánica</label>
                      <select
                        className="form-control"
                        required
                        value={newRoleForm.ubicacion_org_id}
                        onChange={(e) => setNewRoleForm({ ...newRoleForm, ubicacion_org_id: e.target.value })}
                      >
                        <option value="">-- Seleccionar Oficina --</option>
                        {ubicaciones
                          .filter((u) => u.activo)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nombre} ({u.codigo})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Nivel de Acceso</label>
                      <select
                        className="form-control"
                        value={newRoleForm.nivel_acceso}
                        onChange={(e) => setNewRoleForm({ ...newRoleForm, nivel_acceso: e.target.value })}
                      >
                        <option value="CONTROL_TOTAL">Control Total</option>
                        <option value="SOLO_LECTURA">Solo Lectura / Consulta</option>
                        <option value="OPERATIVO">Operativo</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Fecha de Expiración (Opcional)</label>
                      <input
                        type="date"
                        className="form-control"
                        value={newRoleForm.fecha_expiracion}
                        onChange={(e) => setNewRoleForm({ ...newRoleForm, fecha_expiracion: e.target.value })}
                      />
                    </div>

                    <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <input
                        type="checkbox"
                        id="es_principal_check"
                        checked={newRoleForm.es_principal}
                        onChange={(e) => setNewRoleForm({ ...newRoleForm, es_principal: e.target.checked })}
                      />
                      <label htmlFor="es_principal_check" style={{ fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                        Establecer como rol principal por defecto al iniciar sesión
                      </label>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', textAlign: 'right' }}>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={actionLoading}>
                      <Plus size={14} />
                      <span>{actionLoading ? 'Asignando...' : 'Asignar Rol'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowRolesModal(false)} className="btn btn-secondary btn-sm">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CONFIRMACIÓN DE BAJA LÓGICA */}
      {/* ==================================================== */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
          <div className="modal-dialog" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottomColor: '#F5C6CB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC3545' }}>
                <AlertCircle size={20} />
                <h2 className="modal-title" style={{ color: '#DC3545' }}>
                  Confirmar Baja Lógica
                </h2>
              </div>
              <button onClick={() => setConfirmDelete(null)} className="modal-close-btn" title="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {confirmDelete.type === 'persona' && (
                <p style={{ fontSize: '0.9rem', color: '#495057', margin: 0 }}>
                  ¿Está seguro de que desea dar de baja a la persona{' '}
                  <strong>
                    {confirmDelete.item.nombres} {confirmDelete.item.apellido_paterno}
                  </strong>{' '}
                  (CI: {confirmDelete.item.ci})?
                  <br />
                  <br />
                  <span style={{ fontSize: '0.82rem', color: '#6C757D' }}>
                    Nota: De acuerdo a la regla RF-02.9, no se permitirá la baja si la persona tiene un usuario activo
                    asociado.
                  </span>
                </p>
              )}

              {confirmDelete.type === 'usuario' && (
                <p style={{ fontSize: '0.9rem', color: '#495057', margin: 0 }}>
                  ¿Está seguro de que desea dar de baja al usuario <strong>{confirmDelete.item.login}</strong>?
                  <br />
                  <br />
                  <span style={{ fontSize: '0.82rem', color: '#6C757D' }}>
                    El usuario ya no podrá iniciar sesión y sus asignaciones de roles activas serán suspendidas.
                  </span>
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="btn btn-secondary btn-sm"
                disabled={actionLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDelete.type === 'persona') handleDeletePersona(confirmDelete.item);
                  if (confirmDelete.type === 'usuario') handleDeleteUsuario(confirmDelete.item);
                }}
                className="btn btn-primary btn-sm"
                style={{ backgroundColor: '#DC3545', borderColor: '#DC3545' }}
                disabled={actionLoading}
              >
                {actionLoading ? 'Procesando...' : 'Confirmar Baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
