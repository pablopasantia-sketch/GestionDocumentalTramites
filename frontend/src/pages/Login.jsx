import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Key, AlertCircle, CheckCircle, ArrowRight, Shield } from 'lucide-react';
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

    if (password.length < 6 || password.length > 10) {
      setErrorMsg('La clave/PIN debe contener entre 6 y 10 caracteres.');
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
    <div style={{ maxWidth: '440px', margin: '2rem auto' }}>
      <div className="card" style={{ padding: '2.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: 'var(--radius-md)', 
            background: 'var(--primary-gradient)', 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white',
            marginBottom: '1rem',
            boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)'
          }}>
            <Lock size={26} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Ingreso al Sistema</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            Autenticación de funcionarios Wayka
          </p>
        </div>

        {errorMsg && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.15)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            padding: '0.75rem 1rem', 
            borderRadius: 'var(--radius-sm)', 
            color: '#fca5a5', 
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Usuario Institucional
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="username"
                type="text"
                className="form-control"
                placeholder="Ej: admin o mfernandez"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Clave / PIN (6 a 10 caracteres)
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
              maxLength={10}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem' }}
          >
            {loading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>Ingresar</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Cuentas de demostración preparadas en el Seed */}
        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Cuentas Demo Sembradas (Seed):
          </div>

          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'admin123')}
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'space-between', width: '100%', fontSize: '0.82rem' }}
            >
              <span><strong>admin</strong> (Admin Sistema / Wayka)</span>
              <span style={{ color: 'var(--text-muted)' }}>admin123</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('mfernandez', 'password123')}
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'space-between', width: '100%', fontSize: '0.82rem' }}
            >
              <span><strong>mfernandez</strong> (Ventanilla Única)</span>
              <span style={{ color: 'var(--text-muted)' }}>password123</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('cmamani', 'password123')}
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'space-between', width: '100%', fontSize: '0.82rem' }}
            >
              <span><strong>cmamani</strong> (Funcionario)</span>
              <span style={{ color: 'var(--text-muted)' }}>password123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
