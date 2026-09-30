import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { useAuth } from './lib/auth-context'
import AuthPage from './pages/AuthPage'
import { AppShell, BoardPage, DashboardPage, ProfilePage, TasksPage } from './pages/Workspace'

function ProtectedWorkspace() {
  const { user, loading } = useAuth()
  if (loading) return <div className="boot-screen"><span className="loader" />Restoring your workspace</div>
  if (!user) return <Navigate to="/login" replace />
  return <AppShell />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <AuthPage register />} />
      <Route element={<ProtectedWorkspace />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/board" element={<BoardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>
}
