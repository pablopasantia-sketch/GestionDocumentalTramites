import React from 'react';
import {
  FileText,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  Flame,
  Lock,
  ArrowRight
} from 'lucide-react';

/**
 * Componente de Gráfica del Flujo Institucional (RF-08.6, RF-09.2)
 * Proyecta de manera visual el ciclo de vida del trámite:
 * - Actividades Concluidas: Azul/Verde con Checkmark
 * - Actividad Actual / En Proceso: Naranja / Dorado con pulso
 * - Actividades Pendientes: Gris
 */
export default function FlujoGraficoTramite({ tramite }) {
  if (!tramite) return null;

  const { estado = '', historial = [] } = tramite;

  // Determinar la etapa actual en base al estado del trámite y el historial
  const determineStepIndex = () => {
    if (estado === 'CONCLUIDO') return 5; // Todas concluidas
    if (estado === 'ANULADO') return -1;  // Anulado

    // Revisar actividades en el historial
    const ultimosMovs = [...historial].sort((a, b) => b.orden - a.orden);
    const ultimo = ultimosMovs[0];

    if (!ultimo) return 0;

    const actLower = (ultimo.actividad || '').toLowerCase();
    const estLower = (ultimo.estado || estado || '').toLowerCase();

    if (actLower.includes('conclusión') || actLower.includes('despacho final') || estLower === 'concluido') {
      return 5;
    }
    if (actLower.includes('firma') || actLower.includes('dual') || actLower.includes('secretaria')) {
      return 4;
    }
    if (actLower.includes('pleno') || actLower.includes('sesión') || actLower.includes('aprobación')) {
      return 3;
    }
    if (actLower.includes('comisión') || actLower.includes('informe') || actLower.includes('asesor')) {
      return 2;
    }
    if (actLower.includes('presidencia') || actLower.includes('derivación') || actLower.includes('despacho')) {
      return 1;
    }

    return 0; // Ventanilla Única
  };

  const currentStep = determineStepIndex();

  const etapas = [
    {
      id: 0,
      nombre: 'Ventanilla Única',
      subtitulo: 'Recepción y Radicación',
      icon: FileText
    },
    {
      id: 1,
      nombre: 'Presidencia CMS',
      subtitulo: 'Asignación Institucional',
      icon: Building2
    },
    {
      id: 2,
      nombre: 'Comisión y Asesoría',
      subtitulo: 'Informe Técnico-Legal (SLA 5-15d)',
      icon: Users
    },
    {
      id: 3,
      nombre: 'Pleno del Concejo',
      subtitulo: 'Deliberación y Sesión',
      icon: Building2
    },
    {
      id: 4,
      nombre: 'Circuito de Firmas',
      subtitulo: 'Firma Dual y Despacho',
      icon: Send
    },
    {
      id: 5,
      nombre: 'Respuesta Oficial',
      subtitulo: 'Conclusión y Notificación',
      icon: CheckCircle2
    }
  ];

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '8px',
      border: '1px solid #E2E8F0',
      padding: '1.25rem',
      marginBottom: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        borderBottom: '1px solid #F1F5F9',
        paddingBottom: '0.75rem'
      }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#800000', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            RF-08.6 • Diagrama del Circuito Institucional
          </span>
          <h3 style={{ margin: '2px 0 0 0', fontSize: '1.05rem', color: '#1B365D', fontWeight: 700 }}>
            Flujo de Atención y Progreso del Trámite
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {estado === 'BLOQUEADO' && (
            <span style={{
              background: '#F3E8FF',
              color: '#6B21A8',
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Lock size={12} /> EN PAUSA / BLOQUEADO
            </span>
          )}
          {estado === 'ANULADO' && (
            <span style={{
              background: '#FEE2E2',
              color: '#B91C1C',
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <AlertTriangle size={12} /> PROCESO ANULADO
            </span>
          )}
          {estado === 'CONCLUIDO' && (
            <span style={{
              background: '#ECFDF5',
              color: '#065F46',
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <CheckCircle2 size={12} /> TRÁMITE CONCLUIDO
            </span>
          )}
        </div>
      </div>

      {/* Stepper horizontal responsivo */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '8px',
        position: 'relative'
      }}>
        {etapas.map((etapa, idx) => {
          const IconComponent = etapa.icon;
          const isDone = estado === 'CONCLUIDO' || idx < currentStep;
          const isCurrent = estado !== 'CONCLUIDO' && estado !== 'ANULADO' && idx === currentStep;
          const isPending = !isDone && !isCurrent;

          let stepBg = '#F8FAFC';
          let iconColor = '#94A3B8';
          let borderColor = '#E2E8F0';
          let textColor = '#64748B';
          let statusText = 'Pendiente';

          if (isDone) {
            stepBg = '#F0FDF4';
            iconColor = '#10B981';
            borderColor = '#86EFAC';
            textColor = '#166534';
            statusText = 'Concluido';
          } else if (isCurrent) {
            stepBg = '#FFFBEB';
            iconColor = '#D97706';
            borderColor = '#FCD34D';
            textColor = '#B45309';
            statusText = 'En Atención';
          }

          return (
            <div
              key={etapa.id}
              style={{
                background: stepBg,
                border: `1.5px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '10px 8px',
                textAlign: 'center',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: isCurrent ? '0 2px 8px rgba(217, 119, 6, 0.15)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Círculo de Icono */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isDone ? '#10B981' : isCurrent ? '#D97706' : '#E2E8F0',
                color: isDone || isCurrent ? '#FFFFFF' : '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '6px'
              }}>
                {isDone ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <IconComponent size={16} />
                )}
              </div>

              {/* Título de la Etapa */}
              <div style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: isCurrent ? '#B45309' : isDone ? '#1B365D' : '#64748B',
                lineHeight: 1.2,
                marginBottom: '2px'
              }}>
                {etapa.nombre}
              </div>

              {/* Subtítulo descriptivo */}
              <div style={{
                fontSize: '0.675rem',
                color: '#64748B',
                lineHeight: 1.2,
                marginBottom: '6px'
              }}>
                {etapa.subtitulo}
              </div>

              {/* Badge de Estado del Paso */}
              <span style={{
                marginTop: 'auto',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '10px',
                background: isDone ? '#DCFCE7' : isCurrent ? '#FEF3C7' : '#E2E8F0',
                color: textColor
              }}>
                {statusText}
              </span>
            </div>
          );
        })}
      </div>

      {/* Indicadores de Leyenda */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        marginTop: '1rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid #F1F5F9',
        fontSize: '0.75rem',
        color: '#64748B',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} />
          <span>Actividades Concluidas (Verde/Azul)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#D97706' }} />
          <span>Actividad Actual en Trámite (Naranja)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#94A3B8' }} />
          <span>Actividades Siguientes (Gris)</span>
        </div>
      </div>
    </div>
  );
}
