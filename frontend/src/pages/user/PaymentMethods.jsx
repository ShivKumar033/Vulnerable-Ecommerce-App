import { useState, useEffect } from 'react'
import api from '../../services/api'

const PaymentMethods = () => {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    type: 'card',
    cardNumber: '',
    expiry: '',
    cvv: '',
    nameOnCard: '',
    isDefault: false,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchMethods()
  }, [])

  const fetchMethods = async () => {
    try {
      const response = await api.get('/users/payment-methods')
      setMethods(response.data || [])
    } catch (error) {
      console.error('Error fetching payment methods:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/users/payment-methods', formData)
      fetchMethods()
      resetForm()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save payment method')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return
    try {
      // VULNERABLE: IDOR - no ownership check
      await api.delete(`/users/payment-methods/${id}`)
      fetchMethods()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete payment method')
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'card',
      cardNumber: '',
      expiry: '',
      cvv: '',
      nameOnCard: '',
      isDefault: false,
    })
    setShowForm(false)
  }

  const maskCardNumber = (number) => {
    if (!number) return ''
    return '**** **** **** ' + number.slice(-4)
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
        <h1 className="text-3xl font-bold">Saved Payment Methods</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Add Payment Method
        </button>
      </div>

      {/* Add Payment Method Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Add Payment Method</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Card Number</label>
              <input
                type="text"
                value={formData.cardNumber}
                onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="4242 4242 4242 4242"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Expiry</label>
                <input
                  type="text"
                  value={formData.expiry}
                  onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="MM/YY"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CVV</label>
                <input
                  type="text"
                  value={formData.cvv}
                  onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="123"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name on Card</label>
              <input
                type="text"
                value={formData.nameOnCard}
                onChange={(e) => setFormData({ ...formData, nameOnCard: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="mr-2"
                />
                Set as default
              </label>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment Methods List */}
      <div className="space-y-4">
        {methods.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No payment methods saved</p>
        ) : (
          methods.map((method) => (
            <div key={method.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">💳</span>
                    <span className="font-semibold">{method.nameOnCard}</span>
                    {method.isDefault && (
                      <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600">{maskCardNumber(method.cardNumber)}</p>
                  <p className="text-sm text-gray-400">Expires: {method.expiry}</p>
                </div>
                <button
                  onClick={() => handleDelete(method.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default PaymentMethods

