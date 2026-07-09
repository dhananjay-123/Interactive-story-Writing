import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ConnectingLoader from './ConnectingLoader'

// Route guard: only signed-in admins get through. Anyone else is sent home.
export default function RequireAdmin({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <ConnectingLoader message="Checking credentials" />
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />
  return children
}
