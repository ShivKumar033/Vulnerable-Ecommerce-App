import { useState, useEffect } from 'react'
import api from '../../services/api'

const VendorDiscounts = () => {
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minPurchase: '',
    maxUses: '',
    expiresAt: '',
    productIds: []
  })
  const [products, setProducts] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDiscounts()
    fetchProducts()
  }, [])

  const fetchDiscounts = async () => {
    try {
      const response = await api.get('/vendor/discounts')
      setDiscounts(response.data || [])
    } catch (error) {
      console.error('Error fetching discounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await api.get('/vendor/products')
      setProducts(response.data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const data = {
        code: formData.code,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        minPurchase: parseFloat(formData.minPurchase) || 0,
        maxUses: parseInt(formData.maxUses) || null,
        expiresAt: formData.expiresAt || null,
        productIds: formData.productIds
      }
      
      if (editingId) {
        await api.put(`/vendor/discounts/${editingId}`, data)
      } else {
        await api.post('/vendor/discounts', data)
      }
      fetchDiscounts()
      resetForm()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save discount')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (discount) => {
    setFormData({
      code: discount.code,
      discountType: discount.discountType,
      discountValue: discount.discountValue.toString(),
      minPurchase: discount.minPurchase?.toString() || '',
      maxUses: discount.maxUses?.toString() || '',
      expiresAt: discount.expiresAt?.split('T')[0] || '',
      productIds: discount.productIds || []
    })
    setEditingId(discount.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this discount?')) return
    try {
      await api.delete(`/vendor/discounts/${id}`)
      fetchDiscounts()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete discount')
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      minPurchase: '',
      maxUses: '',
      expiresAt: '',
      productIds: []
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleProductSelect = (productId) => {
    setFormData(prev => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId]
    }))
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
        <h1 className="text-3xl font-bold">Manage Discounts</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Create Discount
        </button>
      </div>

      {/* Discount Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? 'Edit Discount' : 'Create Discount'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Discount Type</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Discount Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min Purchase</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.minPurchase}
                  onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Uses</label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expires At</label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            {/* Product Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Apply to Products (leave empty for all)</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {products.map((product) => (
                  <label key={product.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.productIds.includes(product.id)}
                      onChange={() => handleProductSelect(product.id)}
                      className="rounded"
                    />
                    <span className="text-sm truncate">{product.name}</span>
                  </label>
                ))}
              </div>
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

      {/* Discounts Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Purchase</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uses</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {discounts.map((discount) => (
              <tr key={discount.id}>
                <td className="px-6 py-4 font-mono font-bold">{discount.code}</td>
                <td className="px-6 py-4">
                  {discount.discountType === 'PERCENTAGE' 
                    ? `${discount.discountValue}%` 
                    : `$${discount.discountValue}`}
                </td>
                <td className="px-6 py-4">${discount.minPurchase || 0}</td>
                <td className="px-6 py-4">
                  {discount.uses || 0} / {discount.maxUses || '∞'}
                </td>
                <td className="px-6 py-4">
                  {discount.expiresAt ? new Date(discount.expiresAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(discount)}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(discount.id)}
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

export default VendorDiscounts

