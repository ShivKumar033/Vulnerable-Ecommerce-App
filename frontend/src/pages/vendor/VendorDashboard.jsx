import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

const VendorDashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    revenue: 0,
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [ordersRes] = await Promise.all([
        api.get('/orders/vendor/my-orders'),
      ])
      
      setRecentOrders(ordersRes.data?.slice(0, 5) || [])
      setStats({
        products: 0, // Would need separate endpoint
        orders: ordersRes.data?.length || 0,
        revenue: ordersRes.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0,
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Vendor Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm">Total Products</h3>
          <p className="text-3xl font-bold">{stats.products}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm">Total Orders</h3>
          <p className="text-3xl font-bold">{stats.orders}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm">Total Revenue</h3>
          <p className="text-3xl font-bold">${(stats.revenue || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link to="/vendor/products" className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg">
          <h3 className="font-semibold">Manage Products</h3>
          <p className="text-sm text-gray-500">Add, edit, delete products</p>
        </Link>
        <Link to="/vendor/products/add" className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg">
          <h3 className="font-semibold">Add Product</h3>
          <p className="text-sm text-gray-500">Create new listing</p>
        </Link>
        <Link to="/vendor/orders" className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg">
          <h3 className="font-semibold">My Orders</h3>
          <p className="text-sm text-gray-500">View order details</p>
        </Link>
        <Link to="/vendor/returns" className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg">
          <h3 className="font-semibold">Returns</h3>
          <p className="text-sm text-gray-500">Handle return requests</p>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <p className="text-gray-500">No orders yet</p>
        ) : (
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex justify-between items-center border-b pb-4">
                <div>
                  <p className="font-semibold">Order #{order.id}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">${order.total?.toFixed(2)}</p>
                  <span className="text-sm text-gray-500">{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default VendorDashboard

