import { useState, useEffect } from 'react'
import api from '../../services/api'
import { toast } from 'react-toastify'

const VendorDiscounts = () => {
  const [discounts, setDiscounts] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState(null)

  const [formData, setFormData] = useState({
    code: '',
    type: 'PERCENTAGE',
    value: '',
    productId: '',
    minPurchase: '',
    maxUses: '',
    expiresAt: '',
    active: true
  })

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
      // Try alternative endpoint
      try {
        const altResponse = await api.get('/vendor/discounts/all')
        setDiscounts(altResponse.data || [])
      } catch (e) {
        console.error('Error fetching all discounts:', e)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products')
      setProducts(response.data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...formData,
        value: parseFloat(formData.value),
        productId: formData.productId ? parseInt(formData.productId) : null,
        minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : 0,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
      }

      if (editingDiscount) {
        await api.put(`/vendor/discounts/${editingDiscount.id}`, payload)
        toast.success('Discount updated!')
      } else {
        await api.post('/vendor/discounts', payload)
        toast.success('Discount created!')
      }
      setShowModal(false)
      resetForm()
      fetchDiscounts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save discount')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (discount) => {
    setEditingDiscount(discount)
    setFormData({
      code: discount.code || '',
      type: discount.type || 'PERCENTAGE',
      value: discount.value?.toString() || '',
      productId: discount.productId?.toString() || '',
      minPurchase: discount.minPurchase?.toString() || '',
      maxUses: discount.maxUses?.toString() || '',
      expiresAt: discount.expiresAt ? discount.expiresAt.split('T')[0] : '',
      active: discount.active !== false
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this discount?')) return
    try {
      await api.delete(`/vendor/discounts/${id}`)
      toast.success('Discount deleted!')
      fetchDiscounts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete discount')
    }
  }

  const handleToggle = async (id, currentStatus) => {
    try {
      await api.put(`/vendor/discounts/${id}`, { active: !currentStatus })
      toast.success(`Discount ${!currentStatus ? 'enabled' : 'disabled'}!`)
      fetchDiscounts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update discount')
    }
  }

  const resetForm = () => {
    setEditingDiscount(null)
    setFormData({
      code: '',
      type: 'PERCENTAGE',
      value: '',
      productId: '',
      minPurchase: '',
      maxUses: '',
      expiresAt: '',
      active: true
    })
  }

  if (loading && discounts.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Product Discounts</h1>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Create Discount
        </button>
      </div>

      {/* Discounts Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {discounts.map((discount) => (
              <tr key={discount.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-mono font-bold">{discount.code}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {discount.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {discount.type === 'PERCENTAGE' ? `${discount.value}%` : `$${discount.value}`}
                </td>
                <td className="px-6 py-4">
                  {discount.product?.name || 'All Products'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {discount.usedCount || 0} / {discount.maxUses || '∞'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggle(discount.id, discount.active)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      discount.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {discount.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleEdit(discount)}
                    className="text-primary-600 hover:text-primary-700 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(discount.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {discounts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No discounts found. Create your first discount!
          </div>
        )}
      </div>

      {/* Discount Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingDiscount ? 'Edit Discount' : 'Create Discount'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Discount Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., SUMMER20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Apply to Product (Optional)</label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">All Products</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min Purchase ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minPurchase}
                    onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Uses</label>
                  <input
                    type="number"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Unlimited"
                  />
                </div>
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

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="active" className="text-sm font-medium">Active</label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Discount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default VendorDiscounts

