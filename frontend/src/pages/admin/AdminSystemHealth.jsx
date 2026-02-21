import { useState, useEffect } from 'react'
import api from '../../services/api'

const AdminSystemHealth = () => {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchHealth()
  }, [])

  const fetchHealth = async () => {
    setRefreshing(true)
    try {
      const response = await api.get('/admin/system-health')
      setHealth(response.data)
    } catch (error) {
      console.error('Error fetching system health:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">System Health</h1>
        <button
          onClick={fetchHealth}
          disabled={refreshing}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm">Server Status</h3>
          <div className="flex items-center mt-2">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            <span className="text-xl font-bold">Online</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm">Database</h3>
          <div className="flex items-center mt-2">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            <span className="text-xl font-bold">Connected</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm">Uptime</h3>
          <p className="text-xl font-bold mt-2">
            {health?.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : 'N/A'}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm">Environment</h3>
          <p className="text-xl font-bold mt-2">{health?.environment || 'development'}</p>
        </div>
      </div>

      {/* Detailed Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">System Information</h2>
        <div className="space-y-4">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Node Version</span>
            <span className="font-mono">{health?.nodeVersion || 'N/A'}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Timestamp</span>
            <span>{health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'N/A'}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600">Memory Usage</span>
            <span>{health?.memory ? `${Math.round(health.memory.used / 1024 / 1024)} MB` : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminSystemHealth

