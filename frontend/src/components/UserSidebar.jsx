import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const UserSidebar = () => {
  const { logout } = useAuth()

  const menuItems = [
    { to: '/profile', label: 'Profile', icon: '👤' },
    { to: '/orders', label: 'My Orders', icon: '📦' },
    { to: '/addresses', label: 'Addresses', icon: '📍' },
    { to: '/wishlist', label: 'Wishlist', icon: '❤️' },
    { to: '/wallet', label: 'Wallet', icon: '💳' },
    { to: '/loyalty', label: 'Loyalty Points', icon: '⭐' },
    { to: '/giftcards', label: 'Gift Cards', icon: '🎁' },
    { to: '/returns', label: 'Returns', icon: '↩️' },
  ]

  return (
    <aside className="w-64 bg-white shadow-md border-r flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-gray-800">Account</h2>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center py-3 px-4 rounded-lg transition-colors font-medium ${
                isActive
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t">
        <button 
          onClick={logout}
          className="w-full flex items-center py-3 px-4 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
        >
          <span className="mr-3 text-lg">🚪</span>
          Logout
        </button>
      </div>
    </aside>
  )
}

export default UserSidebar
