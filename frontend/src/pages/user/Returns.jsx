import { useState, useEffect } from 'react'
import api from '../../services/api'

const Returns = () => {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    orderId: '',
    itemId: '',
    reason: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchReturns()
  }, [])

  const fetchReturns = async () => {
    try {
      const response = await api.get('/returns')
      setReturns(response.data || [])
    } catch (error) {
      console.error('Error fetching returns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/returns', formData)
      alert('Return request submitted!')
      setShowForm(false)
      setFormData({ orderId: '', itemId: '', reason: '', description: '' })
      fetchReturns()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit return request')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      REQUESTED: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      REJECTED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-green-100 text-green-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Returns & Refunds</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Request Return
        </button>
      </div>

      {/* Request Return Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Request Return</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Order ID</label>
              <input
                type="number"
                value={formData.orderId}
                onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Item ID</label>
              <input
                type="number"
                value={formData.itemId}
                onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select a reason</option>
                <option value="defective">Defective Product</option>
                <option value="wrong_item">Wrong Item</option>
                <option value="not_as_described">Not as Described</option>
                <option value="changed_mind">Changed Mind</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                rows={4}
                required
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Returns List */}
      <div className="space-y-4">
        {returns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No return requests</p>
          </div>
        ) : (
          returns.map((returnItem) => (
            <div key={returnItem.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Return #{returnItem.id}</h3>
                  <p className="text-gray-500 text-sm">
                    Order #{returnItem.orderId} - Item #{returnItem.itemId}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(returnItem.status)}`}>
                  {returnItem.status}
                </span>
              </div>
              <div className="border-t pt-4">
                <p><strong>Reason:</strong> {returnItem.reason}</p>
                <p className="text-gray-600 mt-2">{returnItem.description}</p>
                <p className="text-sm text-gray-400 mt-2">
                  Requested: {new Date(returnItem.createdAt).toLocaleDateString()}
                </p>
                {returnItem.refundAmount && (
                  <p className="mt-2 font-semibold">
                    Refund Amount: ${returnItem.refundAmount.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Returns

