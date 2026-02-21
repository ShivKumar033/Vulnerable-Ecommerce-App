import { useState, useEffect } from 'react'
import api from '../../services/api'

const AdminReports = () => {
  const [loading, setLoading] = useState(false)
  const [reportType, setReportType] = useState('sales')
  const [format, setFormat] = useState('csv')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // VULNERABLE: OS Command Injection - user input directly used in command
  const handleGenerateReport = async () => {
    setLoading(true)
    try {
      // VULNERABLE: The backend directly uses parameters in OS commands without sanitization
      const params = new URLSearchParams()
      if (dateFrom) params.append('from', dateFrom)
      if (dateTo) params.append('to', dateTo)
      
      const response = await api.get(`/admin/reports/${reportType}?${params.toString()}`, {
        responseType: 'blob',
      })
      
      // Download the report
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      alert('Failed to generate report')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Report Generation</h1>

      {/* VULNERABLE: Report generation with OS command injection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Generate Report</h2>
        <p className="text-gray-600 mb-4">
          Generate sales, user, or order reports. Reports are processed on the server.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="sales">Sales Report</option>
              <option value="users">User Report</option>
              <option value="orders">Order Report</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Backup Section - VULNERABLE: OS Command Injection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Backup Management</h2>
        <p className="text-gray-600 mb-4">
          Create and download database backups. Backups are generated on the server.
        </p>

        <div className="space-y-4">
          <button
            onClick={async () => {
              setLoading(true)
              try {
                const response = await api.post('/admin/backup/create', {}, {
                  responseType: 'blob',
                })
                const url = window.URL.createObjectURL(new Blob([response.data]))
                const link = document.createElement('a')
                link.href = url
                link.setAttribute('download', `backup-${new Date().toISOString()}.sql`)
                document.body.appendChild(link)
                link.click()
                link.remove()
              } catch (error) {
                alert('Failed to create backup')
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Backup'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminReports

