import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect based on role
    switch (user.role) {
      case 'ADMIN':
        return <Navigate to="/admin/dashboard" replace />
      case 'VENDOR':
        return <Navigate to="/vendor/dashboard" replace />
      case 'SUPPORT':
        return <Navigate to="/support/dashboard" replace />
      default:
        return <Navigate to="/" replace />
    }
  }

  return <Outlet />
}

export default ProtectedRoute

