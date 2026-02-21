import { useState, useEffect } from 'react'
import api from '../../services/api'

const AdminWebhooks = () => {
  const [webhooks, setWebhooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    url: '',
    event: 'order.created',
    secret: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [testing, setTesting] = useState(null)

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const fetchWebhooks = async () => {
    try {
      const response = await api.get('/webhooks/configs')
      setWebhooks(response.data || [])
    } catch (error) {
      console.error('Error fetching webhooks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/webhooks/configs', formData)
      fetchWebhooks()
      setShowForm(false)
      setFormData({ url: '', event: 'order.created', secret: '' })
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create webhook')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this webhook?')) return
    try {
      await api.delete(`/webhooks/configs/${id}`)
      fetchWebhooks()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete webhook')
    }
  }

  // Test webhook - VULNERABLE: SSRF
  const handleTest = async (id, url) => {
    setTesting(id)
    try {
      // VULNERABLE: User can test any URL (SSRF)
      const testUrl = prompt('Enter webhook URL to test (SSRF vulnerable):', url)
      if (testUrl) {
        await api.post('/webhooks/test', { url: testUrl })
        alert('Webhook test triggered!')
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to test webhook')
    } finally {
      setTesting(null)
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
        <h1 className="text-3xl font-bold">Webhook Configuration</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Add Webhook
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Add Webhook</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">URL</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="https://example.com/webhook"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Event</label>
              <select
                value={formData.event}
                onChange={(e) => setFormData({ ...formData, event: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="order.created">Order Created</option>
                <option value="order.updated">Order Updated</option>
                <option value="payment.success">Payment Success</option>
                <option value="payment.failed">Payment Failed</option>
                <option value="user.registered">User Registered</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Secret</label>
              <input
                type="text"
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Webhook secret"
              />
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {webhooks.map((webhook) => (
              <tr key={webhook.id}>
                <td className="px-6 py-4">
                  <span className="font-mono text-sm">{webhook.url}</span>
                </td>
                <td className="px-6 py-4">{webhook.event}</td>
                <td className="px-6 py-4">{new Date(webhook.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleTest(webhook.id, webhook.url)}
                      disabled={testing === webhook.id}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {testing === webhook.id ? 'Testing...' : 'Test'}
                    </button>
                    <button
                      onClick={() => handleDelete(webhook.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminWebhooks

