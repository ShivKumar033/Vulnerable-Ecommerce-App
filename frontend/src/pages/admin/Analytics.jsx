import { useState, useEffect } from 'react'
import api from '../../services/api'

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/admin/analytics')
      setAnalytics(response.data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
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
      <h1 className="text-3xl font-bold mb-8">Sales Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm">Total Revenue</h3>
          <p className="text-3xl font-bold mt-2">${analytics?.totalRevenue?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm">Total Orders</h3>
          <p className="text-3xl font-bold mt-2">{analytics?.totalOrders || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm">Average Order Value</h3>
          <p className="text-3xl font-bold mt-2">${analytics?.avgOrderValue?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm">Total Users</h3>
          <p className="text-3xl font-bold mt-2">{analytics?.totalUsers || 0}</p>
        </div>
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Sales by Category</h2>
          <div className="h-64 flex items-center justify-center text-gray-500">
            {analytics?.salesByCategory ? (
              <pre>{JSON.stringify(analytics.salesByCategory, null, 2)}</pre>
            ) : (
              <p>No data available</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Top Products</h2>
          <div className="h-64 flex items-center justify-center text-gray-500">
            {analytics?.topProducts ? (
              <pre>{JSON.stringify(analytics.topProducts, null, 2)}</pre>
            ) : (
              <p>No data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminAnalytics

