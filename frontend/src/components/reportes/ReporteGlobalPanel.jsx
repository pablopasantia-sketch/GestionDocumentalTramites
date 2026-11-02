import React from 'react';
import {
  AlertCircle,
  ArrowRightLeft,
  BarChart3,
  Building2,
  CalendarRange,
  CheckCircle2,
  FileBarChart,
  FilePlus2,
  Printer,
  RefreshCw,
  Search,
  Send,
  TrendingUp
} from 'lucide-react';

const COLORES = {
  iniciados: '#1B365D',
  movidos: '#D97706',
  concluidos: '#10B981'
};

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

const parseFecha = (valor) => {
  if (!valor) return null;
  const fecha = new Date(valor);
  return isNaN(fecha.getTime()) ? null : fecha;
};

const claveDia = (fecha) => {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Agrupa la serie diaria para que el gráfico sea legible:
 * hasta 31 días -> diario; hasta 120 días -> semanal; más -> mensual.
 */
function agruparSerie(serie = [], fechaDesde, fechaHasta) {
  if (!serie.length) return { modo: 'dia', puntos: [] };

  const desde = parseFecha(fechaDesde) || parseFecha(serie[0].fecha);
  const hasta = parseFecha(fechaHasta) || parseFecha(serie[serie.length - 1].fecha);
  if (!desde || !hasta) return { modo: 'dia', puntos: [] };

  const dias = Math.max(1, Math.round((hasta - desde) / 86400000) + 1);
  const modo = dias <= 31 ? 'dia' : dias <= 120 ? 'semana' : 'mes';

  const grupos = new Map();

  serie.forEach((item) => {
    const fecha = parseFecha(item.fecha);
    if (!fecha) return;

    let clave;
    let etiqueta;

    if (modo === 'dia') {
      clave = claveDia(fecha);
      etiqueta = fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' });
    } else if (modo === 'semana') {
      const indice = Math.floor((fecha - desde) / (7 * 86400000));
      clave = `s-${indice}`;
      const inicioSemana = new Date(desde.getTime() + indice * 7 * 86400000);
      etiqueta = `Sem ${inicioSemana.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit'
      })}`;
    } else {
      clave = `${fecha.getFullYear()}-${fecha.getMonth()}`;
      etiqueta = fecha.toLocaleDateString('es-BO', { month: 'short', year: '2-digit' });
    }

    if (!grupos.has(clave)) {
      grupos.set(clave, { etiqueta, iniciados: 0, movidos: 0, concluidos: 0 });
    }

    const grupo = grupos.get(clave);
    grupo.iniciados += item.iniciados || 0;
    grupo.movidos += item.movidos || 0;
    grupo.concluidos += item.concluidos || 0;
  });

  return { modo, puntos: Array.from(grupos.values()) };
}

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

export default function ReporteGlobalPanel({
  data,
  loading,
  filtros = {},
  ubicaciones = [],
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
          Generando Reporte Global de Trámites...
        </h3>
        <p style={{ color: '#6C757D', fontSize: '0.875rem', margin: 0 }}>
          Consolidando procesos iniciados, movidos y concluidos del período seleccionado.
        </p>
      </div>
    );
  }

  const totales = data?.totales || {};
  const porTipo = data?.por_tipo || [];
  const serieDiaria = data?.serie_diaria || [];
  const { modo, puntos } = agruparSerie(
    serieDiaria,
    data?.fecha_desde,
    data?.fecha_hasta
  );

  const ubicacionNombre = ubicaciones.find(
    (u) => String(u.id) === String(data?.ubicacion_org_id)
  )?.nombre;

  const esGlobal = !data || data.alcance === 'GLOBAL';

  const maxIniciadosTipo = Math.max(1, ...porTipo.map((tp) => tp.iniciados || 0));
  const maxSerie = Math.max(
    1,
    ...puntos.flatMap((p) => [p.iniciados, p.movidos, p.concluidos])
  );

  const actualizar = (campo, valor) => {
    if (onFiltroChange) {
      onFiltroChange({ ...filtros, [campo]: valor });
    }
  };

  const etiquetaModo =
    modo === 'dia' ? 'Detalle diario' : modo === 'semana' ? 'Resumen semanal' : 'Resumen mensual';

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
              <FileBarChart size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.15rem', color: '#1B365D', margin: 0, fontWeight: 700 }}>
                  Reporte Global de Trámites
                </h2>
                <span
                  style={{
                    background: esGlobal ? '#EFF6FF' : '#FFF7ED',
                    color: esGlobal ? '#1D4ED8' : '#B45309',
                    border: `1px solid ${esGlobal ? '#BFDBFE' : '#FED7AA'}`,
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  {esGlobal
                    ? 'ALCANCE GLOBAL · TODAS LAS OFICINAS'
                    : `OFICINA: ${ubicacionNombre || 'FILTRADA'}`}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6C757D' }}>
                RF-12.1 · Procesos iniciados, movidos y concluidos por rango de fechas.
              </p>
              {data && (
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#475569' }}>
                  <strong>Período:</strong> {formatearFecha(data.fecha_desde)} —{' '}
                  {formatearFecha(data.fecha_hasta)}
                  {data.gestion ? ` · Gestión ${data.gestion}` : ' · Todas las gestiones'}
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
            gap: '1rem',
            alignItems: 'end'
          }}
        >
          <CampoFiltro label="Fecha desde">
            <input
              type="date"
              className="form-control"
              value={filtros.fechaDesde || ''}
              max={filtros.fechaHasta || undefined}
              onChange={(e) => actualizar('fechaDesde', e.target.value)}
            />
          </CampoFiltro>

          <CampoFiltro label="Fecha hasta">
            <input
              type="date"
              className="form-control"
              value={filtros.fechaHasta || ''}
              min={filtros.fechaDesde || undefined}
              onChange={(e) => actualizar('fechaHasta', e.target.value)}
            />
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

          <CampoFiltro label="Oficina">
            <select
              className="form-control"
              value={filtros.ubicacionOrgId ?? ''}
              onChange={(e) => actualizar('ubicacionOrgId', e.target.value)}
            >
              <option value="">Todas las oficinas</option>
              {ubicaciones.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                  {u.sigla ? ` (${u.sigla})` : ''}
                </option>
              ))}
            </select>
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
      {/* KPIs PRINCIPALES                                         */}
      {/* ========================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}
      >
        <div
          className="card"
          style={{ padding: '1.25rem', borderLeft: `5px solid ${COLORES.iniciados}` }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6C757D', fontWeight: 700, textTransform: 'uppercase' }}>
              Iniciados
            </span>
            <FilePlus2 size={20} color={COLORES.iniciados} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: COLORES.iniciados, margin: '8px 0 4px 0' }}>
            {totales.iniciados ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6C757D' }}>
            Expedientes creados en el período
          </div>
        </div>

        <div
          className="card"
          style={{ padding: '1.25rem', borderLeft: `5px solid ${COLORES.movidos}` }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6C757D', fontWeight: 700, textTransform: 'uppercase' }}>
              Movidos
            </span>
            <Send size={20} color={COLORES.movidos} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: COLORES.movidos, margin: '8px 0 4px 0' }}>
            {totales.movidos ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6C757D' }}>
            {totales.movimientos ?? 0} movimiento(s) de flujo registrados
          </div>
        </div>

        <div
          className="card"
          style={{ padding: '1.25rem', borderLeft: `5px solid ${COLORES.concluidos}` }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#6C757D', fontWeight: 700, textTransform: 'uppercase' }}>
              Concluidos
            </span>
            <CheckCircle2 size={20} color={COLORES.concluidos} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: COLORES.concluidos, margin: '8px 0 4px 0' }}>
            {totales.concluidos ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6C757D' }}>
            {totales.porcentaje_concluidos ?? 0}% sobre iniciados ·{' '}
            {totales.promedio_dias_conclusion ?? 0} día(s) promedio
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* EVOLUCIÓN DEL PERÍODO                                    */}
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
              <TrendingUp size={18} color="#800000" />
              <span>Evolución del Período</span>
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#6C757D' }}>
              {etiquetaModo} de procesos iniciados, movidos y concluidos.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {[
              { clave: 'iniciados', label: 'Iniciados' },
              { clave: 'movidos', label: 'Movidos' },
              { clave: 'concluidos', label: 'Concluidos' }
            ].map((item) => (
              <div key={item.clave} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    background: COLORES[item.clave],
                    display: 'inline-block'
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {puntos.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#6C757D' }}>
            <BarChart3 size={36} color="#CBD5E1" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontWeight: 600, color: '#1B365D' }}>Sin actividad en el período</div>
            <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              Ajuste el rango de fechas o la gestión para visualizar movimientos.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '10px',
                minHeight: '190px',
                paddingTop: '10px',
                minWidth: '100%',
                width: 'max-content'
              }}
            >
              {puntos.map((punto, indice) => (
                <div
                  key={`${punto.etiqueta}-${indice}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    minWidth: modo === 'mes' ? '52px' : '40px'
                  }}
                  title={`${punto.etiqueta}\nIniciados: ${punto.iniciados}\nMovidos: ${punto.movidos}\nConcluidos: ${punto.concluidos}`}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '3px',
                      height: '145px'
                    }}
                  >
                    {['iniciados', 'movidos', 'concluidos'].map((clave) => (
                      <div
                        key={clave}
                        style={{
                          width: '9px',
                          height: `${Math.max(2, (punto[clave] / maxSerie) * 145)}px`,
                          background: COLORES[clave],
                          borderRadius: '2px 2px 0 0',
                          transition: 'height 0.3s ease'
                        }}
                      />
                    ))}
                  </div>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: '#64748B',
                      whiteSpace: 'nowrap',
                      fontWeight: 600
                    }}
                  >
                    {punto.etiqueta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* DESGLOSE POR TIPO DE PROCESO                             */}
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
              <Building2 size={18} color="#1B365D" />
              <span>Desglose por Tipo de Proceso</span>
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#6C757D' }}>
              Comparativo de iniciados, movidos y concluidos por tipo de trámite.
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
            {porTipo.length} tipo(s)
          </span>
        </div>

        {porTipo.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#6C757D' }}>
            <AlertCircle size={36} color="#CBD5E1" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontWeight: 600, color: '#1B365D' }}>
              No hay trámites para los filtros seleccionados
            </div>
            <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              Verifique el rango de fechas, la gestión o la oficina.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>
                    Tipo de proceso
                  </th>
                  <th style={{ padding: '10px 12px', color: COLORES.iniciados, fontWeight: 700, textAlign: 'center' }}>
                    Iniciados
                  </th>
                  <th style={{ padding: '10px 12px', color: COLORES.movidos, fontWeight: 700, textAlign: 'center' }}>
                    Movidos
                  </th>
                  <th style={{ padding: '10px 12px', color: COLORES.concluidos, fontWeight: 700, textAlign: 'center' }}>
                    Concluidos
                  </th>
                </tr>
              </thead>
              <tbody>
                {porTipo.map((tp) => (
                  <tr key={tp.tipo_proceso_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 12px', minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            background: '#1B365D',
                            color: '#FFFFFF',
                            borderRadius: '4px',
                            padding: '2px 7px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            flexShrink: 0
                          }}
                        >
                          {tp.tipo_proceso_codigo}
                        </span>
                        <span style={{ color: '#334155', fontWeight: 600 }}>
                          {tp.tipo_proceso_nombre}
                        </span>
                      </div>
                      <div
                        style={{
                          height: '4px',
                          background: '#E2E8F0',
                          borderRadius: '2px',
                          marginTop: '6px',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, ((tp.iniciados || 0) / maxIniciadosTipo) * 100)}%`,
                            height: '100%',
                            background: COLORES.iniciados
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <strong style={{ color: COLORES.iniciados, fontSize: '0.95rem' }}>
                        {tp.iniciados}
                      </strong>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <strong style={{ color: COLORES.movidos, fontSize: '0.95rem' }}>
                        {tp.movidos}
                      </strong>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <strong style={{ color: COLORES.concluidos, fontSize: '0.95rem' }}>
                        {tp.concluidos}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1B365D' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CalendarRange size={14} />
                      TOTAL DEL PERÍODO
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: COLORES.iniciados }}>
                    {totales.iniciados ?? 0}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: COLORES.movidos }}>
                    {totales.movidos ?? 0}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: COLORES.concluidos }}>
                    {totales.concluidos ?? 0}
                  </td>
                </tr>
              </tfoot>
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
        <ArrowRightLeft size={16} color="#6C757D" style={{ marginTop: '2px', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748B', lineHeight: 1.5 }}>
          <strong>Iniciados:</strong> trámites creados en el rango. <strong>Movidos:</strong> trámites
          con al menos un movimiento de flujo (derivaciones, recepciones, despachos, evaluaciones o
          firmas) en el rango. <strong>Concluidos:</strong> trámites con fecha de conclusión en el rango.
          Los movimientos administrativos (inicio, anulación, bloqueo o habilitación) no se contabilizan como movimiento de flujo.
        </p>
      </div>
    </div>
  );
}
