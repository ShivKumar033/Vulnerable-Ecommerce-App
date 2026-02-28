import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import api from '../services/api'

const Navbar = () => {
  const { user, logout, isAdmin, isVendor, isSupport } = useAuth()
  const navigate = useNavigate()
  const [cartCount, setCartCount] = useState(0)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    fetchCartCount()
  }, [])

  const fetchCartCount = async () => {
    try {
      const response = await api.get('/cart')
      if (response.data.items) {
        setCartCount(response.data.items.reduce((sum, item) => sum + item.quantity, 0))
      }
    } catch (error) {
      // Guest cart might not be accessible
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-primary-600">VulnShop</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-8">
            <Link to="/products" className="text-gray-700 hover:text-primary-600">
              Products
            </Link>
            <Link to="/categories" className="text-gray-700 hover:text-primary-600">
              Categories
            </Link>

            {user && (
              <>
                <Link to="/cart" className="text-gray-700 hover:text-primary-600 relative">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>

                {/* User Menu */}
                <div className="relative">
                  <button 
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="text-gray-700 hover:text-primary-600 flex items-center space-x-1"
                  >
                    <span>{user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                      <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Profile
                      </Link>
                      <Link to="/orders" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        My Orders
                      </Link>
                      <Link to="/addresses" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Addresses
                      </Link>
                      <Link to="/wishlist" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Wishlist
                      </Link>
                      <Link to="/wallet" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Wallet
                      </Link>
                      <Link to="/loyalty" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Loyalty Points
                      </Link>
                      <Link to="/giftcards" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Gift Cards
                      </Link>
                      <Link to="/returns" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Returns
                      </Link>
                      <button onClick={() => { setUserMenuOpen(false); handleLogout(); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Logout
                      </button>
                    </div>
                  )}
                </div>

                {/* Role-based Dashboard Links */}
                {isAdmin && (
                  <Link to="/admin/dashboard" className="text-purple-600 hover:text-purple-700 font-medium">
                    Admin
                  </Link>
                )}
                {isVendor && (
                  <Link to="/vendor/dashboard" className="text-green-600 hover:text-green-700 font-medium">
                    Vendor
                  </Link>
                )}
                {isSupport && (
                  <Link to="/support/dashboard" className="text-orange-600 hover:text-orange-700 font-medium">
                    Support
                  </Link>
                )}
              </>
            )}

            {!user && (
              <>
                <Link to="/login" className="text-gray-700 hover:text-primary-600">
                  Login
                </Link>
                <Link to="/register" className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">VulnShop</h3>
            <p className="text-gray-400 text-sm">
              An intentionally vulnerable e-commerce platform for security testing and training.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/products" className="hover:text-white">All Products</Link></li>
              <li><Link to="/categories" className="hover:text-white">Categories</Link></li>
              <li><Link to="/cart" className="hover:text-white">Cart</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Account</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/login" className="hover:text-white">Login</Link></li>
              <li><Link to="/register" className="hover:text-white">Register</Link></li>
              <li><Link to="/orders" className="hover:text-white">My Orders</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Dashboards</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/admin/dashboard" className="hover:text-white">Admin Panel</Link></li>
              <li><Link to="/vendor/dashboard" className="hover:text-white">Vendor Panel</Link></li>
              <li><Link to="/support/dashboard" className="hover:text-white">Support Panel</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2024 VulnShop. For security testing only.</p>
        </div>
      </div>
    </footer>
  )
}

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default Layout

