import React, { useState } from 'react';
import { Lock, User, ArrowRight } from 'lucide-react';

export default function Login({ onLogin, authError }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    await onLogin({ username, password });
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-card-icon">
            <Lock size={20} />
          </div>
          <div>
            <h1>FusionDocs Login</h1>
            <p>Authenticate with a user account to access document generation.</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Username</span>
            <div className="auth-input-group">
              <User size={16} />
              <input
                type="text"
                value={username}
                placeholder="admin"
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </label>

          <label>
            <span>Password</span>
            <div className="auth-input-group">
              <Lock size={16} />
              <input
                type="password"
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </label>

          {authError && <div className="auth-error">{authError}</div>}

          <button type="submit" className="auth-submit" disabled={loading || !username || !password}>
            <span>{loading ? 'Signing in...' : 'Sign in'}</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
