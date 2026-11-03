import React from 'react';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  Clock,
  Eye,
  FileText,
  Filter,
  Flame,
  RefreshCw,
  Search,
  User
} from 'lucide-react';

const ESTADOS = {
  CREADO: { label: 'Creado', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  RECIBIDO: { label: 'Recibido', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  EN_ATENCION: { label: 'En Atención', color: '#0F766E', bg: '#F0FDFA', border: '#99F6E4' },
  POR_RECIBIR: { label: 'Por Recibir', color: '#B45309', bg: '#FFF7ED', border: '#FED7AA' },
  EN_TRANSITO: { label: 'En Tránsito', color: '#B45309', bg: '#FFF7ED', border: '#FED7AA' },
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

const ESTADOS_OPCIONES = [
  'CREADO',
  'RECIBIDO',
  'EN_ATENCION',
  'POR_RECIBIR',
  'EN_TRANSITO',
  'ATENDIDO',
  'BLOQUEADO',
  'CONCLUIDO',
  'ANULADO'
];

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

export default function BusquedaTramitesPanel({
  data,
  loading,
  filtros = {},
  tiposProceso = [],
  onFiltroChange,
  onConsultar,
  onLimpiar,
  onVerTrazabilidad,
  onPrintHojaDeRuta
}) {
  const actualizar = (campo, valor) => {
    if (onFiltroChange) {
      onFiltroChange({ ...filtros, [campo]: valor });
    }
  };

  const items = data?.items || [];
  const total = data?.total ?? items.length;

  const conteoPorEstado = items.reduce((acc, item) => {
    acc[item.estado] = (acc[item.estado] || 0) + 1;
    return acc;
  }, {});

  const hayFiltros =
    Boolean(filtros.correlativo) ||
    Boolean(filtros.tipoProcesoId) ||
    (filtros.estado && filtros.estado !== 'TODOS') ||
    Boolean(filtros.fechaDesde) ||
    Boolean(filtros.fechaHasta) ||
    Boolean(filtros.search);

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
              <Search size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.15rem', color: '#1B365D', margin: 0, fontWeight: 700 }}>
                  Búsqueda por Proceso y Estado/Fechas
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
                  RF-12.2 · RF-12.4
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6C757D' }}>
                Localice trámites por número de proceso, tipo, estado o rango de fechas. Consulte actividad
                actual, responsable y fecha de ingreso a bandeja.
              </p>
            </div>
          </div>

          {data && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#6C757D', fontWeight: 700, textTransform: 'uppercase' }}>
                Coincidencias
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1B365D', lineHeight: 1.1 }}>
                {total}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#6C757D' }}>
                {items.length} mostrado(s) en esta página
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
            gap: '1rem',
            alignItems: 'end'
          }}
        >
          <CampoFiltro label="Nº de Proceso / Hoja de Ruta">
            <input
              type="text"
              className="form-control"
              placeholder="Ej: CM-1/2026"
              value={filtros.correlativo || ''}
              onChange={(e) => actualizar('correlativo', e.target.value)}
            />
          </CampoFiltro>

          <CampoFiltro label="Tipo de Proceso">
            <select
              className="form-control"
              value={filtros.tipoProcesoId ?? ''}
              onChange={(e) => actualizar('tipoProcesoId', e.target.value)}
            >
              <option value="">Todos los tipos</option>
              {tiposProceso.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.codigo} — {tp.nombre}
                </option>
              ))}
            </select>
          </CampoFiltro>

          <CampoFiltro label="Estado">
            <select
              className="form-control"
              value={filtros.estado || 'TODOS'}
              onChange={(e) => actualizar('estado', e.target.value)}
            >
              <option value="TODOS">Todos los estados</option>
              {ESTADOS_OPCIONES.map((estado) => (
                <option key={estado} value={estado}>
                  {metaEstado(estado).label}
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

          <CampoFiltro label="Fecha desde">
            <input
              type="date"
              className="form-control"
              value={filtros.fechaDesde || ''}
              max={filtros.fechaHasta || toInputDate(new Date())}
              onChange={(e) => actualizar('fechaDesde', e.target.value)}
            />
          </CampoFiltro>

          <CampoFiltro label="Fecha hasta">
            <input
              type="date"
              className="form-control"
              value={filtros.fechaHasta || ''}
              min={filtros.fechaDesde || ''}
              max={toInputDate(new Date())}
              onChange={(e) => actualizar('fechaHasta', e.target.value)}
            />
          </CampoFiltro>

          <CampoFiltro label="Remitente / Referencia / CITE">
            <input
              type="text"
              className="form-control"
              placeholder="Búsqueda general..."
              value={filtros.search || ''}
              onChange={(e) => actualizar('search', e.target.value)}
            />
          </CampoFiltro>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={onConsultar}
              disabled={loading}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 16px',
                flex: 1
              }}
            >
              {loading ? <RefreshCw size={15} className="spinning" /> : <Search size={15} />}
              <span>{loading ? 'Buscando...' : 'Buscar'}</span>
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

        {hayFiltros && (
          <div
            style={{
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.76rem',
              color: '#64748B'
            }}
          >
            <Filter size={13} />
            <span>Filtros activos aplicados sobre el padrón de trámites.</span>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* RESULTADOS                                                */}
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
              <span>Resultados de la Búsqueda</span>
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#6C757D' }}>
              Datos referenciales, actividad actual y responsable del expediente.
            </p>
          </div>
          {data && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.entries(conteoPorEstado).map(([estado, cantidad]) => (
                <span
                  key={estado}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    color: '#475569',
                    fontWeight: 600
                  }}
                >
                  {metaEstado(estado).label}: {cantidad}
                </span>
              ))}
            </div>
          )}
        </div>

        {loading && !data ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <RefreshCw
              size={30}
              className="spinning"
              style={{ color: '#1B365D', margin: '0 auto 10px auto' }}
            />
            <div style={{ fontWeight: 600, color: '#1B365D' }}>Buscando trámites...</div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#6C757D' }}>
              Aplicando filtros sobre el padrón institucional.
            </p>
          </div>
        ) : !data ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <Search size={40} color="#94A3B8" style={{ margin: '0 auto 10px auto' }} />
            <div style={{ fontWeight: 600, color: '#1B365D' }}>
              Defina los criterios y presione Buscar
            </div>
            <p style={{ fontSize: '0.82rem', color: '#6C757D', margin: '4px 0 0 0' }}>
              Puede buscar por número de proceso, tipo, estado, gestión o rango de fechas.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <AlertCircle size={40} color="#CBD5E1" style={{ margin: '0 auto 10px auto' }} />
            <div style={{ fontWeight: 600, color: '#1B365D' }}>Sin resultados</div>
            <p style={{ fontSize: '0.82rem', color: '#6C757D', margin: '4px 0 0 0' }}>
              No se encontraron trámites con los criterios seleccionados. Ajuste los filtros e intente nuevamente.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.82rem', minWidth: '1180px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Nro. Trámite</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Tipo</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Remitente / Referencia</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Estado</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Actividad actual</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Responsable</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Ubicación</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Creación</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Ingreso bandeja</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Días</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Plazo</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: item.es_vencido ? '#FFF8F8' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
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
                        {item.tipo_proceso_codigo || '—'}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: '#6C757D', marginTop: '3px', maxWidth: '160px' }}>
                        {item.tipo_proceso_nombre}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: '210px' }}>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{item.remitente}</div>
                      <div style={{ fontSize: '0.74rem', color: '#6C757D' }}>
                        {item.referencia || item.institucion_remitente || 'Sin referencia'}
                      </div>
                      {item.cite_externo && (
                        <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>CITE: {item.cite_externo}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <BadgeEstado estado={item.estado} />
                      <div style={{ marginTop: '4px' }}>
                        <BadgePrioridad prioridad={item.prioridad} />
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: '175px', color: '#475569' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                        <Clock size={13} color="#6C757D" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span>{item.actividad_actual || 'Atención institucional'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: '165px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#334155', fontWeight: 600 }}>
                        <User size={13} color="#6C757D" />
                        <span>{item.usuario_actual_nombre || 'Sin responsable'}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#6C757D', marginLeft: '18px' }}>
                        {item.usuario_actual_cargo || item.usuario_actual_login || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: '170px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569' }}>
                        <Building2 size={13} color="#6C757D" />
                        <span>{item.ubicacion_actual_nombre || 'Sin ubicación'}</span>
                      </div>
                      {item.ubicacion_actual_sigla && (
                        <div style={{ fontSize: '0.72rem', color: '#6C757D', marginLeft: '18px' }}>
                          ({item.ubicacion_actual_sigla})
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#475569' }}>
                      {formatearFecha(item.fecha_creacion)}
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
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => onVerTrazabilidad && onVerTrazabilidad(item)}
                          className="btn btn-sm btn-secondary"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Ver trazabilidad e historial del trámite"
                        >
                          <Eye size={13} />
                          <span>Trazabilidad</span>
                        </button>
                        <button
                          onClick={() => onPrintHojaDeRuta && onPrintHojaDeRuta(item.id)}
                          className="btn btn-sm"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#800000',
                            color: '#FFFFFF',
                            border: 'none'
                          }}
                          title="Ver e imprimir la Hoja de Ruta oficial"
                        >
                          <FileText size={13} />
                          <span>Hoja de Ruta</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
