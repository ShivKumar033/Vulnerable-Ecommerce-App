import { useState, useEffect } from 'react'
import api from '../../services/api'

const AdminBackups = () => {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchBackups()
  }, [])

  const fetchBackups = async () => {
    try {
      const response = await api.get('/admin/backups')
      setBackups(response.data || [])
    } catch (error) {
      console.error('Error fetching backups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    setCreating(true)
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
      alert('Backup created successfully!')
      fetchBackups()
    } catch (error) {
      alert('Failed to create backup')
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (backupId) => {
    if (!confirm('Are you sure you want to restore this backup? This will overwrite current data.')) return
    try {
      await api.post(`/admin/backups/${backupId}/restore`)
      alert('Backup restored successfully!')
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to restore backup')
    }
  }

  const handleDelete = async (backupId) => {
    if (!confirm('Are you sure you want to delete this backup?')) return
    try {
      await api.delete(`/admin/backups/${backupId}`)
      fetchBackups()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete backup')
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
        <h1 className="text-3xl font-bold">Backup Management</h1>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create Backup'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {backups.length > 0 ? (
              backups.map((backup) => (
                <tr key={backup.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{backup.id}</td>
                  <td className="px-6 py-4">{backup.filename}</td>
                  <td className="px-6 py-4">{backup.size ? `${(backup.size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}</td>
                  <td className="px-6 py-4">{new Date(backup.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleRestore(backup.id)}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleDelete(backup.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No backups available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminBackups

