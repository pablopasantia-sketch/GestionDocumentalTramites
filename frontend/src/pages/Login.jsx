import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Key, AlertCircle, ArrowRight, Landmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Por favor complete todos los campos.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La clave/PIN debe contener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(username.trim(), password.trim());
      if (result.success) {
        navigate('/');
      } else {
        setErrorMsg(result.message || 'Error en credenciales');
      }
    } catch (err) {
      setErrorMsg('Error de comunicación con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (userVal, passVal) => {
    setUsername(userVal);
    setPassword(passVal);
    setErrorMsg('');
  };

  return (
    <div style={{ maxWidth: '460px', margin: '2rem auto' }}>
      <div className="card" style={{ padding: '0', overflow: 'hidden', borderTop: '5px solid #800000' }}>
        {/* Encabezado del Formulario */}
        <div style={{ background: '#F8F9FA', padding: '1.75rem 2rem', borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            borderRadius: '4px', 
            background: '#800000', 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white',
            marginBottom: '0.75rem',
            boxShadow: '0 2px 8px rgba(128, 0, 0, 0.25)'
          }}>
            <Landmark size={26} />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#800000', marginBottom: '0.25rem' }}>
            Acceso Institucional
          </h1>
          <p style={{ color: '#6C757D', fontSize: '0.85rem', margin: '0' }}>
            Gobierno Autónomo Municipal de Sucre — Sistema Wayka
          </p>
        </div>

        {/* Cuerpo del Formulario */}
        <div style={{ padding: '2rem' }}>
          {errorMsg && (
            <div style={{ 
              background: 'var(--color-status-alerta-bg)', 
              border: '1px solid var(--color-status-alerta-border)', 
              padding: '10px 14px', 
              borderRadius: '4px', 
              color: 'var(--color-status-alerta-text)', 
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Usuario Funcionario
              </label>
              <input
                id="username"
                type="text"
                className="form-control"
                placeholder="Ej. admin o mfernandez"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Clave / PIN de Acceso (mínimo 6 caracteres)
              </label>
              <input
                id="password"
                type="password"
                className="form-control"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                minLength={6}
                maxLength={50}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.75rem', padding: '12px' }}
            >
              {loading ? (
                <span>Validando credenciales...</span>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Cuentas de Demostración Sembradas */}
          <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6C757D', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Cuentas Demo Sembradas (Seed):
            </div>

            <div style={{ display: 'grid', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'admin123')}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'space-between', width: '100%', fontSize: '0.8rem', padding: '8px 12px' }}
              >
                <span><strong>admin</strong> (Admin de Sistema)</span>
                <span style={{ color: '#6C757D' }}>admin123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('mfernandez', 'password123')}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'space-between', width: '100%', fontSize: '0.8rem', padding: '8px 12px' }}
              >
                <span><strong>mfernandez</strong> (Ventanilla Única)</span>
                <span style={{ color: '#6C757D' }}>password123</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('cmamani', 'password123')}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'space-between', width: '100%', fontSize: '0.8rem', padding: '8px 12px' }}
              >
                <span><strong>cmamani</strong> (Funcionario)</span>
                <span style={{ color: '#6C757D' }}>password123</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
