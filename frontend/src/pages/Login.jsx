// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';

const ROLE_REDIRECTS = {
  admin:  '/admin/dashboard',
  mentor: '/mentor/dashboard',
  intern: '/intern/dashboard',
  professor: '/professor/dashboard',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fingerprint = getDeviceFingerprint();
      const user = await login(email,  password,  fingerprint.deviceHash,  fingerprint.deviceLabel);
      console.log('LOGIN USER =', user);
      console.log('ROLE =', user.role);
      const target = ROLE_REDIRECTS[user.role] || '/login';
      console.log('REDIRECT =', target);
      console.log('BEFORE NAVIGATE');
      navigate(target);
      console.log('AFTER NAVIGATE');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center justify-center mb-8">
          <img
            src="/iit-jammu-logo.png"
            alt="Indian Institute of Technology Jammu"
            className="h-60 w-auto mb-3"
          />
          <span className="font-display font-semibold text-white text-xl tracking-tight">
            
        </span>
      <span className="text-slate-400 text-xs mt-0.5">
        RISE-UP Internship Program
        </span>
      </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          <h1 className="font-display font-semibold text-xl text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-6">Sign in to your IIT Jammu RISE-UP account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="you@iitjammu.ac.in"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-danger-600 flex items-center gap-1.5">
                <i className="ti ti-alert-circle" aria-hidden="true" />
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © {new Date().getFullYear()} Indian Institute of Technology Jammu
        </p>
      </div>
    </div>
  );
}
