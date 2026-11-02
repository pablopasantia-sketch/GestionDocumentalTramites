import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Flame,
  Printer,
  RefreshCw,
  Search,
  Send,
  User,
  Users
} from 'lucide-react';

const COLORES = {
  pendientes: '#1B365D',
  atencion: '#0F766E',
  movimiento: '#D97706',
  vencidos: '#B91C1C',
  atendidos: '#15803D',
  bloqueados: '#6B21A8'
};

const ESTADOS = {
  POR_RECIBIR: { label: 'Por Recibir', color: '#B45309', bg: '#FFF7ED', border: '#FED7AA' },
  EN_TRANSITO: { label: 'En Tránsito', color: '#B45309', bg: '#FFF7ED', border: '#FED7AA' },
  CREADO: { label: 'Creado', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  RECIBIDO: { label: 'Recibido', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  EN_ATENCION: { label: 'En Atención', color: '#0F766E', bg: '#F0FDFA', border: '#99F6E4' },
  ATENDIDO: { label: 'Atendido', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
  BLOQUEADO: { label: 'Bloqueado', color: '#6B21A8', bg: '#FAF5FF', border: '#E9D5FF' },
  CONCLUIDO: { label: 'Concluido', color: '#475569', bg: '#F8FAFC', border: '#E2E8F0' },
  ANULADO: { label: 'Anulado', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' }
};

const PRIORIDADES = {
  URGENTE: { label: 'Urgente', color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
  ALTA: { label: 'Alta', color: '#B45309', bg: '#FFF7ED', border: '#FED7AA' },
  NORMAL: { label: 'Normal', color: '#475569', bg: '#F8FAFC', border: '#E2E8F0' },
  BAJA: { label: 'Baja', color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' }
};

const metaEstado = (estado) =>
  ESTADOS[estado] || {
    label: estado || 'Sin estado',
    color: '#475569',
    bg: '#F8FAFC',
    border: '#E2E8F0'
  };

const metaPrioridad = (prioridad) =>
  PRIORIDADES[prioridad] || PRIORIDADES.NORMAL;

const formatearFecha = (valor) => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const toInputDate = (fecha) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

function CampoFiltro({ label, children }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#475569',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          marginBottom: '6px'
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function BadgeEstado({ estado }) {
  const meta = metaEstado(estado);
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 9px',
        borderRadius: '12px',
        fontSize: '0.72rem',
        fontWeight: 700,
        color: meta.color,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      {meta.label}
    </span>
  );
}

function BadgePrioridad({ prioridad }) {
  const meta = metaPrioridad(prioridad);
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 700,
        color: meta.color,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        textTransform: 'uppercase'
      }}
    >
      {meta.label}
    </span>
  );
}

function TarjetaKpi({ titulo, valor, detalle, color, icono, alerta }) {
  return (
    <div className="card" style={{ padding: '1.15rem', borderLeft: `5px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span
          style={{
            fontSize: '0.76rem',
            color: '#6C757D',
            fontWeight: 700,
            textTransform: 'uppercase'
          }}
        >
          {titulo}
        </span>
        <span style={{ color, display: 'flex' }}>{icono}</span>
      </div>
      <div
        style={{
          fontSize: '2rem',
          fontWeight: 800,
          color: alerta && valor > 0 ? color : '#1B365D',
          margin: '6px 0 2px 0'
        }}
      >
        {valor}
      </div>
      <div style={{ fontSize: '0.76rem', color: '#6C757D' }}>{detalle}</div>
    </div>
  );
}

export default function PendientesFuncionarioPanel({
  data,
  loading,
  filtros = {},
  funcionarios = [],
  onFiltroChange,
  onConsultar,
  onLimpiar
}) {
  if (loading && !data) {
    return (
      <div
        style={{
          padding: '3rem',
          textAlign: 'center',
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E8F0'
        }}
      >
        <RefreshCw
          size={32}
          className="spinning"
          style={{ color: '#1B365D', margin: '0 auto 1rem auto' }}
        />
        <h3 style={{ color: '#1B365D', fontSize: '1.1rem', margin: '0 0 6px 0' }}>
          Generando Pendientes por Funcionario...
        </h3>
        <p style={{ color: '#6C757D', fontSize: '0.875rem', margin: 0 }}>
          Consultando el escritorio virtual y los estados de los trámites asignados.
        </p>
      </div>
    );
  }

  const funcionario = data?.funcionario;
  const totales = data?.totales || {};
  const porEstado = data?.por_estado || [];
  const detalle = data?.detalle || [];

  const actualizar = (campo, valor) => {
    if (onFiltroChange) {
      onFiltroChange({ ...filtros, [campo]: valor });
    }
  };

  const opcionesFuncionario = funcionarios.map((u) => {
    const nombre = `${u.nombres || ''} ${u.apellido_paterno || ''}`.trim();
    const rolPrincipal = (u.roles || []).find((r) => r.es_principal) || (u.roles || [])[0];
    const detalleRol = rolPrincipal
      ? `${rolPrincipal.rol_nombre}${rolPrincipal.ubicacion_sigla ? ` · ${rolPrincipal.ubicacion_sigla}` : ''}`
      : u.cargo || 'Sin rol activo';
    return { ...u, nombreMostrar: nombre || u.login || `Funcionario #${u.id}`, detalleRol };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ========================================================= */}
      {/* CABECERA + FILTROS                                       */}
      {/* ========================================================= */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          borderTop: '4px solid #800000',
          background: '#FFFFFF'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#800000',
                flexShrink: 0
              }}
            >
              <Users size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.15rem', color: '#1B365D', margin: 0, fontWeight: 700 }}>
                  Pendientes por Funcionario
                </h2>
                <span
                  style={{
                    background: '#FFF7ED',
                    color: '#B45309',
                    border: '1px solid #FED7AA',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  RF-12.7 · ESCRITORIO VIRTUAL
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6C757D' }}>
                Resumen semanal de trámites pendientes por estado y detalle de la bandeja del funcionario.
              </p>
              {data && (
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#475569' }}>
                  <strong>Fecha de corte:</strong> {formatearFecha(data.fecha_corte)}
                  {data.gestion ? ` · Gestión ${data.gestion}` : ' · Todas las gestiones'}
                  {data.fecha_calculo ? ` · Calculado: ${formatearFecha(data.fecha_calculo)}` : ''}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Imprimir reporte"
          >
            <Printer size={14} />
            <span>Imprimir</span>
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '1rem',
            alignItems: 'end'
          }}
        >
          <CampoFiltro label="Funcionario">
            <select
              className="form-control"
              value={filtros.funcionarioId || ''}
              onChange={(e) => actualizar('funcionarioId', e.target.value)}
            >
              <option value="">Seleccione un funcionario</option>
              {opcionesFuncionario.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombreMostrar} — {u.detalleRol}
                </option>
              ))}
            </select>
          </CampoFiltro>

          <CampoFiltro label="Gestión">
            <select
              className="form-control"
              value={filtros.gestion ?? ''}
              onChange={(e) => actualizar('gestion', e.target.value)}
            >
              <option value="">Todas las gestiones</option>
              {[0, 1, 2, 3, 4].map((offset) => {
                const anio = new Date().getFullYear() - offset;
                return (
                  <option key={anio} value={anio}>
                    {anio}
                  </option>
                );
              })}
            </select>
          </CampoFiltro>

          <CampoFiltro label="Fecha de corte">
            <input
              type="date"
              className="form-control"
              value={filtros.fechaCorte || ''}
              max={toInputDate(new Date())}
              onChange={(e) => actualizar('fechaCorte', e.target.value)}
            />
          </CampoFiltro>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={onConsultar}
              disabled={loading || !filtros.funcionarioId}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 16px',
                flex: 1
              }}
              title={!filtros.funcionarioId ? 'Seleccione un funcionario' : 'Generar reporte'}
            >
              {loading ? <RefreshCw size={15} className="spinning" /> : <Search size={15} />}
              <span>{loading ? 'Generando...' : 'Generar reporte'}</span>
            </button>
            <button
              onClick={onLimpiar}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '9px 14px' }}
              title="Restablecer filtros"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ESTADO INICIAL: SIN REPORTE GENERADO                      */}
      {/* ========================================================= */}
      {!data && (
        <div
          className="card"
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            background: '#FFFFFF',
            border: '1px dashed #CBD5E1'
          }}
        >
          <Users size={40} color="#94A3B8" style={{ margin: '0 auto 10px auto' }} />
          <h3 style={{ fontSize: '1.05rem', color: '#1B365D', margin: '0 0 6px 0' }}>
            Seleccione un funcionario para consultar sus pendientes
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#6C757D' }}>
            Elija el funcionario, la gestión y la fecha de corte; luego presione{' '}
            <strong>Generar reporte</strong> para ver el resumen semanal y el detalle de su bandeja.
          </p>
        </div>
      )}

      {/* ========================================================= */}
      {/* FICHA DEL FUNCIONARIO                                    */}
      {/* ========================================================= */}
      {data && funcionario && (
        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '14px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#1B365D',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <User size={20} />
          </div>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1B365D' }}>
              {funcionario.nombre || 'Funcionario'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
              {funcionario.cargo || 'Sin cargo registrado'}
              {funcionario.unidad_nombre ? ` · ${funcionario.unidad_nombre}` : ''}
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
              <Building2 size={13} />
              <strong>{funcionario.ubicacion_nombre || 'Oficina no asignada'}</strong>
            </div>
            {funcionario.ubicacion_sigla && (
              <div style={{ fontSize: '0.74rem', color: '#6C757D' }}>({funcionario.ubicacion_sigla})</div>
            )}
          </div>
        </div>
      )}

      {data && (
        <>
      {/* ========================================================= */}
      {/* KPIs                                                     */}
      {/* ========================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(205px, 1fr))',
          gap: '1rem'
        }}
      >
        <TarjetaKpi
          titulo="Pendientes Totales"
          valor={totales.pendientes ?? 0}
          detalle="Trámites activos en su bandeja"
          color={COLORES.pendientes}
          icono={<FileText size={20} />}
        />
        <TarjetaKpi
          titulo="En Atención"
          valor={totales.en_atencion ?? 0}
          detalle="Creados, recibidos o en atención"
          color={COLORES.atencion}
          icono={<Clock size={20} />}
        />
        <TarjetaKpi
          titulo="En Movimiento"
          valor={totales.en_movimiento ?? 0}
          detalle="Por recibir o en tránsito"
          color={COLORES.movimiento}
          icono={<Send size={20} />}
        />
        <TarjetaKpi
          titulo="Vencidos"
          valor={totales.vencidos ?? 0}
          detalle="Con plazo de respuesta superado"
          color={COLORES.vencidos}
          icono={<Flame size={20} />}
          alerta
        />
      </div>

      {data && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            marginTop: '-0.65rem'
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: COLORES.atendidos,
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '6px',
              padding: '4px 10px'
            }}
          >
            <CheckCircle2 size={13} />
            Atendidos listos para despacho: {totales.atendidos ?? 0}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: COLORES.bloqueados,
              background: '#FAF5FF',
              border: '1px solid #E9D5FF',
              borderRadius: '6px',
              padding: '4px 10px'
            }}
          >
            <AlertTriangle size={13} />
            Bloqueados: {totales.bloqueados ?? 0}
          </span>
        </div>
      )}

      {/* ========================================================= */}
      {/* RESUMEN SEMANAL POR ESTADO                               */}
      {/* ========================================================= */}
      <div className="card" style={{ padding: '1.25rem', background: '#FFFFFF' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '1rem',
            borderBottom: '1px solid #E2E8F0',
            paddingBottom: '0.75rem'
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '1.05rem',
                color: '#1B365D',
                margin: 0,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CalendarDays size={18} color="#800000" />
              <span>Resumen Semanal por Estado</span>
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#6C757D' }}>
              Antigüedad de los trámites pendientes según su ingreso a la bandeja actual.
            </p>
          </div>
          <span
            style={{
              background: '#F1F5F9',
              color: '#334155',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            {porEstado.length} estado(s)
          </span>
        </div>

        {porEstado.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#6C757D' }}>
            <AlertCircle size={36} color="#CBD5E1" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontWeight: 600, color: '#1B365D' }}>Sin pendientes en la bandeja</div>
            <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              El funcionario no tiene trámites activos para la gestión y fecha seleccionadas.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Estado</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>
                    Anterior
                  </th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>
                    Esta semana
                  </th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>
                    Hoy
                  </th>
                  <th style={{ padding: '10px 12px', color: '#1B365D', fontWeight: 700, textAlign: 'center' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {porEstado.map((item) => (
                  <tr key={item.estado} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <BadgeEstado estado={item.estado} />
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>
                      {item.anterior}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>
                      {item.semana_actual}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>
                      {item.hoy}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: '#1B365D' }}>
                      {item.total}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1B365D' }}>TOTAL</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800 }}>
                    {porEstado.reduce((acc, item) => acc + (item.anterior || 0), 0)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800 }}>
                    {porEstado.reduce((acc, item) => acc + (item.semana_actual || 0), 0)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800 }}>
                    {porEstado.reduce((acc, item) => acc + (item.hoy || 0), 0)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: '#800000' }}>
                    {totales.pendientes ?? 0}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* DETALLE DE PENDIENTES                                    */}
      {/* ========================================================= */}
      <div className="card" style={{ padding: '1.25rem', background: '#FFFFFF' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '1rem',
            borderBottom: '1px solid #E2E8F0',
            paddingBottom: '0.75rem'
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '1.05rem',
                color: '#1B365D',
                margin: 0,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FileText size={18} color="#1B365D" />
              <span>Detalle de Trámites Pendientes</span>
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#6C757D' }}>
              Bandeja actual del funcionario, ordenada por vencimiento y prioridad.
            </p>
          </div>
          <span
            style={{
              background: '#F1F5F9',
              color: '#334155',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            {detalle.length} trámite(s)
          </span>
        </div>

        {detalle.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#6C757D' }}>
            <AlertCircle size={36} color="#CBD5E1" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontWeight: 600, color: '#1B365D' }}>Sin trámites pendientes</div>
            <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              Ajuste la gestión o seleccione otro funcionario.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Nro. Trámite</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Tipo</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Remitente / Referencia</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Estado</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Prioridad</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Actividad actual</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Ingreso a bandeja</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>
                    Días
                  </th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>
                    Plazo
                  </th>
                </tr>
              </thead>
              <tbody>
                {detalle.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: item.es_vencido ? '#FFF8F8' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700, color: '#1B365D' }}>{item.numero_correlativo}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6C757D' }}>Gestión {item.gestion}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          background: '#1B365D',
                          color: '#FFFFFF',
                          borderRadius: '4px',
                          padding: '2px 7px',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                      >
                        {item.tipo_proceso_codigo}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: '#6C757D', marginTop: '3px' }}>
                        {item.tipo_proceso_nombre}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: '210px' }}>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{item.remitente}</div>
                      <div style={{ fontSize: '0.74rem', color: '#6C757D' }}>
                        {item.referencia || item.institucion_remitente || 'Sin referencia'}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <BadgeEstado estado={item.estado} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <BadgePrioridad prioridad={item.prioridad} />
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: '180px', color: '#475569' }}>
                      {item.actividad_actual || 'Atención institucional'}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#475569' }}>
                      {formatearFecha(item.fecha_ingreso_bandeja)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          minWidth: '28px',
                          padding: '3px 7px',
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: item.dias_en_bandeja > 7 ? '#B45309' : '#475569',
                          background: item.dias_en_bandeja > 7 ? '#FFF7ED' : '#F8FAFC',
                          border: `1px solid ${item.dias_en_bandeja > 7 ? '#FED7AA' : '#E2E8F0'}`
                        }}
                      >
                        {item.dias_en_bandeja}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {item.es_vencido ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#B91C1C',
                            fontWeight: 700,
                            fontSize: '0.75rem'
                          }}
                        >
                          <Flame size={13} />
                          Vencido
                        </span>
                      ) : (
                        <span style={{ color: '#475569', fontSize: '0.75rem' }}>
                          {item.fecha_limite_respuesta ? formatearFecha(item.fecha_limite_respuesta) : 'Sin plazo'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nota metodológica */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '6px',
          padding: '10px 12px'
        }}
      >
        <AlertCircle size={16} color="#6C757D" style={{ marginTop: '2px', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748B', lineHeight: 1.5 }}>
          <strong>Pendientes:</strong> trámites activos asignados al funcionario, excluyendo los estados
          CONCLUIDO y ANULADO. <strong>En movimiento:</strong> trámites por recibir o en tránsito.{' '}
          <strong>Resumen semanal:</strong> clasifica cada pendiente según la fecha en que ingresó a su
          bandeja actual, tomando como referencia el último movimiento de recepción o envío.
        </p>
      </div>
        </>
      )}
    </div>
  );
}
