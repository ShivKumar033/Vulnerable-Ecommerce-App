import { useState, useEffect } from 'react'
import api from '../../services/api'

const AdminLogs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const response = await api.get('/admin/audit-logs')
      const rawLogs = response.data?.data?.auditLogs || response.data?.auditLogs || response.data || []
      // Map backend field names to frontend expected names
      const mappedLogs = rawLogs.map(log => ({
        ...log,
        timestamp: log.createdAt,
        ip: log.ipAddress,
        details: log.metadata ? JSON.stringify(log.metadata) : '-'
      }))
      setLogs(mappedLogs)
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      const response = await api.get('/admin/logs/download', {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `logs-${new Date().toISOString()}.txt`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      alert('Failed to download logs')
    }
  }

  const filteredLogs = logs.filter(log => {
    return !filter || log.action?.toLowerCase().includes(filter.toLowerCase())
  })

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
        <h1 className="text-3xl font-bold">System Logs</h1>
        <button
          onClick={handleDownload}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Download Logs
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <input
          type="text"
          placeholder="Filter logs by action..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full md:w-1/3 px-3 py-2 border rounded-md"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-3 whitespace-nowrap text-sm">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-sm">{log.user?.email || 'System'}</td>
                  <td className="px-6 py-3 text-sm">{log.action}</td>
                  <td className="px-6 py-3 text-sm">{log.details || '-'}</td>
                  <td className="px-6 py-3 text-sm font-mono text-xs">{log.ip || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminLogs

