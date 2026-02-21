import { useState, useEffect } from 'react'
import api from '../../services/api'

const AdminFeatureFlags = () => {
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', isEnabled: true })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchFlags()
  }, [])

  const fetchFlags = async () => {
    try {
      const response = await api.get('/admin/feature-flags')
      setFlags(response.data || [])
    } catch (error) {
      console.error('Error fetching flags:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (id, currentStatus) => {
    try {
      await api.put(`/admin/feature-flags/${id}`, { isEnabled: !currentStatus })
      fetchFlags()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to toggle flag')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/admin/feature-flags', formData)
      fetchFlags()
      setShowForm(false)
      setFormData({ name: '', description: '', isEnabled: true })
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create flag')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this feature flag?')) return
    try {
      await api.delete(`/admin/feature-flags/${id}`)
      fetchFlags()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete flag')
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
        <h1 className="text-3xl font-bold">Feature Flags</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Add Flag
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Add Feature Flag</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isEnabled}
                onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                className="mr-2"
              />
              <label>Enabled by default</label>
            </div>
            <div className="flex space-x-2">
              <button type="submit" disabled={submitting} className="bg-primary-600 text-white px-4 py-2 rounded-md">
                {submitting ? 'Creating...' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-md">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {flags.map((flag) => (
              <tr key={flag.id}>
                <td className="px-6 py-4 font-mono">{flag.name}</td>
                <td className="px-6 py-4">{flag.description || '-'}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggle(flag.id, flag.isEnabled)}
                    className={`px-3 py-1 rounded-full text-xs ${
                      flag.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {flag.isEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleDelete(flag.id)} className="text-red-600 hover:text-red-700">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminFeatureFlags

