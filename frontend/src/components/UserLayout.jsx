import { Outlet, Link, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from './Layout'
import UserSidebar from './UserSidebar'

const UserLayout = () => {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Layout />
      <div className="flex flex-1">
        <UserSidebar />
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default UserLayout

