// src/components/ProtectedRoute.jsx
// Wraps role-specific route trees. Redirects to /login if not
// authenticated, or to the user's own dashboard if their role
// doesn't match the route they're trying to access.

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ROLE_REDIRECTS = {
  admin:  '/admin/dashboard',
  mentor: '/mentor/dashboard',
  intern: '/intern/dashboard',
};

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_REDIRECTS[user.role] || '/login'} replace />;
  }

  return <Outlet />;
}
