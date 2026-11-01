import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Flame,
  FileText,
  Eye,
  Printer,
  RefreshCw,
  TrendingUp,
  BarChart2,
  Calendar,
  Layers,
  Building2,
  User,
  ArrowRight
} from 'lucide-react';

export default function SupervisionSlaPanel({
  data,
  loading,
  gestion,
  onGestionChange,
  onRefresh,
  onVerTramite,
  onPrintHojaDeRuta
}) {
  if (loading && !data) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
        <RefreshCw size={32} className="spinning" style={{ color: '#1B365D', margin: '0 auto 1rem auto' }} />
        <h3 style={{ color: '#1B365D', fontSize: '1.1rem', margin: '0 0 6px 0' }}>Cargando Supervisión de Tiempos y SLA...</h3>
        <p style={{ color: '#6C757D', fontSize: '0.875rem', margin: 0 }}>Consultando métricas en tiempo real de la base de datos institucional.</p>
      </div>
    );
  }

  const {
    total_tramites = 0,
    total_activos = 0,
    total_concluidos = 0,
    total_anulados = 0,
    total_bloqueados = 0,
    total_vencidos = 0,
    total_por_vencer = 0,
    total_urgentes = 0,
    con_plazo_activos = 0,
    porcentaje_cumplimiento_sla = 100,
    promedio_horas_atencion = 0,
    max_dias_atraso = 0,
    en_transito = 0,
    en_atencion = 0,
    atendidos_pendiente_cierre = 0,
    fecha_calculo = null,
    criticos = [],
    distribucion_por_tipo = []
  } = data || {};

  // Determinación del Semáforo Institucional
  let semaforoGlobal = {
    color: '#10B981',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    label: 'ÓPTIMO - SLA EN TÉRMINO',
    desc: 'Todos los trámites activos se encuentran dentro de los plazos normativos reglamentarios.'
  };

  if (total_vencidos > 0) {
    semaforoGlobal = {
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA',
      label: `ALERTA CRÍTICA - ${total_vencidos} TRÁMITE(S) VENCIDO(S)`,
      desc: 'Existen trámites en circuito cuyo plazo reglamentario ha expirado y requieren atención inmediata.'
    };
  } else if (total_por_vencer > 0 || total_urgentes > 0) {
    semaforoGlobal = {
      color: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A',
      label: `PRECAUCIÓN - ${total_por_vencer} POR VENCER / ${total_urgentes} URGENTES`,
      desc: 'Trámites próximos al límite reglamentario (≤ 48 hrs) o con prioridad calificada.'
    };
  }

  const getSemaforoBadge = (item) => {
    switch (item.semaforo) {
      case 'VENCIDO':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#FEE2E2',
            color: '#B91C1C',
            border: '1px solid #FCA5A5'
          }}>
            <Flame size={12} />
            VENCIDO (+{item.dias_atraso}d)
          </span>
        );
      case 'POR_VENCER':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#FEF3C7',
            color: '#B45309',
            border: '1px solid #FCD34D'
          }}>
            <Clock size={12} />
            POR VENCER
          </span>
        );
      case 'URGENTE':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#FFEDD5',
            color: '#C2410C',
            border: '1px solid #FDBA74'
          }}>
            <AlertTriangle size={12} />
            URGENTE
          </span>
        );
      case 'ALTA':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE'
          }}>
            ALTA
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 500,
            background: '#F1F5F9',
            color: '#475569',
            border: '1px solid #E2E8F0'
          }}>
            NORMAL
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Barra Superior de Control y Semáforo Global */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#FFFFFF',
        padding: '1.25rem 1.5rem',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: semaforoGlobal.bg,
            border: `2px solid ${semaforoGlobal.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: semaforoGlobal.color
          }}>
            {total_vencidos > 0 ? (
              <Flame size={24} />
            ) : total_por_vencer > 0 ? (
              <Clock size={24} />
            ) : (
              <CheckCircle2 size={24} />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.15rem', color: '#1B365D', margin: 0, fontWeight: 700 }}>
                Supervisión Integral de Tiempos y SLA Wayka
              </h2>
              <span style={{
                background: semaforoGlobal.bg,
                color: semaforoGlobal.color,
                border: `1px solid ${semaforoGlobal.border}`,
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                {semaforoGlobal.label}
              </span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: '#6C757D' }}>
              {semaforoGlobal.desc}
            </p>
          </div>
        </div>

        {/* Filtro de Gestión y Refrescar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="#6C757D" />
            <span style={{ fontSize: '0.85rem', color: '#495057', fontWeight: 600 }}>Gestión:</span>
            <select
              value={gestion || new Date().getFullYear()}
              onChange={(e) => onGestionChange && onGestionChange(Number(e.target.value))}
              className="form-control"
              style={{
                padding: '6px 12px',
                fontSize: '0.875rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontWeight: 600,
                color: '#1B365D'
              }}
            >
              {[2026, 2025, 2024].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={onRefresh}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px' }}
            title="Actualizar datos en tiempo real"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Grid de 6 KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem'
      }}>
        {/* KPI 1: Total Activos en Circuito */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #1B365D', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: '#6C757D', fontWeight: 600, textTransform: 'uppercase' }}>
              Activos en Flujo
            </span>
            <Layers size={18} color="#1B365D" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1B365D', margin: '8px 0 4px 0' }}>
            {total_activos}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6C757D' }}>
            De {total_tramites} trámites registrados
          </div>
        </div>

        {/* KPI 2: Vencidos */}
        <div className="card" style={{
          padding: '1.25rem',
          borderLeft: `4px solid ${total_vencidos > 0 ? '#DC2626' : '#10B981'}`,
          background: total_vencidos > 0 ? '#FFF5F5' : '#FFFFFF'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{
              fontSize: '0.8rem',
              color: total_vencidos > 0 ? '#B91C1C' : '#6C757D',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>
              SLA Vencidos
            </span>
            <Flame size={18} color={total_vencidos > 0 ? '#DC2626' : '#10B981'} />
          </div>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: total_vencidos > 0 ? '#B91C1C' : '#10B981',
            margin: '8px 0 4px 0'
          }}>
            {total_vencidos}
          </div>
          <div style={{ fontSize: '0.75rem', color: total_vencidos > 0 ? '#991B1B' : '#6C757D' }}>
            {total_vencidos > 0 ? `Máx. atraso: ${max_dias_atraso} día(s)` : 'Sin trámites vencidos'}
          </div>
        </div>

        {/* KPI 3: Por Vencer / Urgentes */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #D97706', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: '#6C757D', fontWeight: 600, textTransform: 'uppercase' }}>
              Por Vencer / Urgentes
            </span>
            <Clock size={18} color="#D97706" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#D97706', margin: '8px 0 4px 0' }}>
            {total_por_vencer + total_urgentes}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6C757D' }}>
            {total_por_vencer} por vencer (≤48h) • {total_urgentes} calificados
          </div>
        </div>

        {/* KPI 4: % Cumplimiento SLA */}
        <div className="card" style={{
          padding: '1.25rem',
          borderLeft: `4px solid ${porcentaje_cumplimiento_sla >= 90 ? '#10B981' : porcentaje_cumplimiento_sla >= 75 ? '#D97706' : '#DC2626'}`,
          background: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: '#6C757D', fontWeight: 600, textTransform: 'uppercase' }}>
              Cumplimiento SLA
            </span>
            <TrendingUp size={18} color={porcentaje_cumplimiento_sla >= 90 ? '#10B981' : '#D97706'} />
          </div>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: porcentaje_cumplimiento_sla >= 90 ? '#059669' : porcentaje_cumplimiento_sla >= 75 ? '#D97706' : '#DC2626',
            margin: '8px 0 4px 0'
          }}>
            {porcentaje_cumplimiento_sla}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6C757D' }}>
            {con_plazo_activos} con plazo límite activo
          </div>
        </div>

        {/* KPI 5: Tiempo Promedio de Conclusión */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #800000', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: '#6C757D', fontWeight: 600, textTransform: 'uppercase' }}>
              Tiempo Promedio
            </span>
            <BarChart2 size={18} color="#800000" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#800000', margin: '8px 0 4px 0' }}>
            {promedio_horas_atencion}h
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6C757D' }}>
            {total_concluidos} trámite(s) concluidos
          </div>
        </div>

        {/* KPI 6: Estado de Flujo Operativo */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #4F46E5', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: '#6C757D', fontWeight: 600, textTransform: 'uppercase' }}>
              Desglose Operativo
            </span>
            <Building2 size={18} color="#4F46E5" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#6C757D' }}>En Atención:</span>
              <strong style={{ color: '#1B365D' }}>{en_atencion}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#6C757D' }}>En Tránsito:</span>
              <strong style={{ color: '#D97706' }}>{en_transito}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: '#6C757D' }}>Bloqueados / Pausados:</span>
              <strong style={{ color: '#7C3AED' }}>{total_bloqueados}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Fila Dividida: Top 20 Críticos + Distribución por Tipo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '1.5rem' }}>
        {/* Tabla: Top 20 Trámites Críticos / Con Atraso */}
        <div className="card" style={{ padding: '1.25rem', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: '#1B365D', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#800000" />
                <span>Trámites Críticos y Alertas SLA en Curso</span>
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#6C757D' }}>
                Top 20 trámites activos ordenados por vencimiento, días de atraso y prioridad.
              </p>
            </div>
            <span style={{
              background: '#F1F5F9',
              color: '#334155',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              {criticos.length} registro(s)
            </span>
          </div>

          {criticos.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#6C757D' }}>
              <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontWeight: 600, color: '#1B365D', fontSize: '0.95rem' }}>¡Sin trámites críticos pendientes!</div>
              <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                Todos los trámites activos de la gestión se encuentran operando con normalidad.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>Alerta SLA</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>Expediente</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>Tipo / Referencia</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>Ubicación Actual</th>
                    <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600, textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {criticos.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        {getSemaforoBadge(t)}
                      </td>
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        <strong style={{ color: '#1B365D', display: 'block', fontSize: '0.85rem' }}>
                          {t.numero_correlativo}
                        </strong>
                        <span style={{ fontSize: '0.725rem', color: '#64748B' }}>
                          {t.estado}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle', maxWidth: '240px' }}>
                        <div style={{ fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.tipo_proceso_nombre}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#64748B',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }} title={t.referencia}>
                          {t.referencia || 'Sin referencia'}
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#334155' }}>
                          <Building2 size={12} color="#64748B" />
                          <span style={{ fontSize: '0.775rem' }}>{t.ubicacion_actual}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748B', fontSize: '0.725rem' }}>
                          <User size={12} />
                          <span>{t.usuario_actual_login}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => onVerTramite && onVerTramite(t)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            title="Ver trazabilidad completa"
                          >
                            <Eye size={12} />
                            <span>Ver</span>
                          </button>
                          <button
                            onClick={() => onPrintHojaDeRuta && onPrintHojaDeRuta(t.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            title="Imprimir Hoja de Ruta Oficial"
                          >
                            <Printer size={12} />
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

        {/* Panel: Distribución y Cumplimiento por Tipo de Proceso */}
        <div className="card" style={{ padding: '1.25rem', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', color: '#1B365D', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={18} color="#1B365D" />
                <span>Cumplimiento por Proceso</span>
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#6C757D' }}>
                Plazo reglamentario vs. cumplimiento real.
              </p>
            </div>
            <span style={{
              background: '#F1F5F9',
              color: '#334155',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              {distribucion_por_tipo.length} tipos
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '520px', overflowY: 'auto' }}>
            {distribucion_por_tipo.map((tp) => {
              const compliance = Number(tp.porcentaje_cumplimiento || 100);
              const barColor = compliance >= 90 ? '#10B981' : compliance >= 75 ? '#D97706' : '#DC2626';

              return (
                <div
                  key={tp.tipo_proceso_id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <strong style={{ color: '#1B365D', fontSize: '0.85rem' }}>{tp.tipo_proceso_nombre}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        Código: <strong>{tp.tipo_proceso_codigo}</strong> • SLA: <strong>{tp.tiempo_estimado_horas}h</strong>
                      </div>
                    </div>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: barColor
                    }}>
                      {compliance}%
                    </span>
                  </div>

                  {/* Barra de Progreso */}
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: '#E2E8F0',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    marginBottom: '6px'
                  }}>
                    <div style={{
                      width: `${Math.min(compliance, 100)}%`,
                      height: '100%',
                      background: barColor,
                      transition: 'width 0.4s ease'
                    }} />
                  </div>

                  {/* Detalle numérico */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.725rem',
                    color: '#64748B'
                  }}>
                    <span>Total: <strong>{tp.total}</strong></span>
                    <span>Activos: <strong>{tp.activos}</strong></span>
                    <span>Concluidos: <strong>{tp.concluidos}</strong></span>
                    {tp.vencidos > 0 && (
                      <span style={{ color: '#DC2626', fontWeight: 700 }}>
                        Vencidos: {tp.vencidos}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
