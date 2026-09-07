import React, { useState } from 'react';
import { KeyRound, X, Check, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { changePassword } = useAuth();

  if (!isOpen) return null;

  // Validación de reglas de PIN en tiempo real
  const hasMinLength = newPassword.length >= 6 && newPassword.length <= 20;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('Por favor complete todos los campos.');
      return;
    }

    if (!hasMinLength) {
      setErrorMsg('La nueva clave debe tener entre 6 y 20 caracteres.');
      return;
    }

    if (!hasLetter || !hasNumber) {
      setErrorMsg('La nueva clave debe combinar al menos una letra y un número.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMsg('La confirmación de la contraseña no coincide.');
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword
      });

      if (res.success) {
        setSuccessMsg('¡Contraseña actualizada correctamente!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          onClose();
          setSuccessMsg('');
        }, 1800);
      } else {
        setErrorMsg(res.message || 'Error al actualizar la contraseña');
      }
    } catch (err) {
      setErrorMsg('Error de comunicación con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '480px',
        padding: 0,
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
        borderTop: '5px solid #800000'
      }}>
        {/* Header del Modal */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          background: '#F8F9FA',
          borderBottom: '1px solid #E2E8F0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '4px',
              background: '#800000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <KeyRound size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#1B365D', margin: 0, fontWeight: '700' }}>
                Cambiar Contraseña / PIN
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#6C757D' }}>
                Seguridad de cuenta institucional (RF-01.3)
              </span>
            </div>
          </div>

          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6C757D',
              padding: '4px',
              borderRadius: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {errorMsg && (
            <div style={{
              background: 'var(--color-status-alerta-bg)',
              border: '1px solid var(--color-status-alerta-border)',
              color: 'var(--color-status-alerta-text)',
              padding: '10px 14px',
              borderRadius: '4px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'var(--color-status-vigente-bg)',
              border: '1px solid var(--color-status-vigente-border)',
              color: 'var(--color-status-vigente-text)',
              padding: '10px 14px',
              borderRadius: '4px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" htmlFor="currentPassword">
              Contraseña Actual *
            </label>
            <input
              id="currentPassword"
              type="password"
              className="form-control"
              placeholder="Ingrese su contraseña vigente"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" htmlFor="newPassword">
              Nueva Contraseña / PIN *
            </label>
            <input
              id="newPassword"
              type="password"
              className="form-control"
              placeholder="Nueva clave (6 a 20 caracteres)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              maxLength={20}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" htmlFor="confirmPassword">
              Confirmar Nueva Contraseña *
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="form-control"
              placeholder="Reingrese la nueva clave"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              maxLength={20}
              required
            />
          </div>

          {/* Guía de Validación de PIN Institucional */}
          <div style={{
            background: 'var(--color-bg-container)',
            padding: '10px 14px',
            borderRadius: '4px',
            border: '1px solid var(--color-border)',
            marginBottom: '1.25rem',
            fontSize: '0.8rem'
          }}>
            <div style={{ fontWeight: '600', color: '#1B365D', marginBottom: '4px' }}>
              Requisitos del PIN Institucional (RF-01):
            </div>
            <div style={{ display: 'grid', gap: '3px' }}>
              <div style={{ color: hasMinLength ? '#1E7E34' : '#6C757D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px' }}>{hasMinLength ? '●' : '○'}</span>
                <span>Entre 6 y 20 caracteres</span>
              </div>
              <div style={{ color: hasLetter && hasNumber ? '#1E7E34' : '#6C757D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px' }}>{hasLetter && hasNumber ? '●' : '○'}</span>
                <span>Combinación de letras y números (ej: Sucre2026)</span>
              </div>
              <div style={{ color: passwordsMatch ? '#1E7E34' : '#6C757D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px' }}>{passwordsMatch ? '●' : '○'}</span>
                <span>Las contraseñas coinciden</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary btn-sm"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !hasMinLength || !hasLetter || !hasNumber || !passwordsMatch}
              className="btn btn-primary btn-sm"
            >
              {loading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
