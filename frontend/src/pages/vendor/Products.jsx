import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'

const VendorProducts = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    categoryId: '',
    images: [],
    isActive: true
  })
  const [submitting, setSubmitting] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)
  const xmlInputRef = useRef(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await api.get('/vendor/products')
      setProducts(response.data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const data = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        categoryId: parseInt(formData.categoryId),
        images: formData.images,
        isActive: formData.isActive
      }
      
      if (editingId) {
        await api.put(`/vendor/products/${editingId}`, data)
      } else {
        await api.post('/vendor/products', data)
      }
      fetchProducts()
      resetForm()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save product')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      stock: product.stock?.toString() || '',
      categoryId: product.categoryId?.toString() || '',
      images: product.images || [],
      isActive: product.isActive
    })
    setEditingId(product.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      await api.delete(`/vendor/products/${id}`)
      fetchProducts()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete product')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      stock: '',
      categoryId: '',
      images: [],
      isActive: true
    })
    setEditingId(null)
    setShowForm(false)
  }

  // CSV Import - VULNERABLE: No file validation
  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      await api.post('/import/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert('Products imported successfully!')
      fetchProducts()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to import products')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // XML Import - VULNERABLE: XXE
  const handleXmlImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      await api.post('/import/products/xml', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert('Products imported successfully!')
      fetchProducts()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to import products')
    } finally {
      setImporting(false)
      if (xmlInputRef.current) xmlInputRef.current.value = ''
    }
  }

  // Add image URL - VULNERABLE: No validation
  const handleAddImageUrl = () => {
    const url = prompt('Enter image URL:')
    if (url) {
      setFormData({
        ...formData,
        images: [...formData.images, url]
      })
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
        <h1 className="text-3xl font-bold">Manage Products</h1>
        <div className="flex space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleCsvImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {importing ? 'Importing...' : 'CSV Import'}
          </button>
          <input
            type="file"
            ref={xmlInputRef}
            accept=".xml"
            onChange={handleXmlImport}
            className="hidden"
          />
          <button
            onClick={() => xmlInputRef.current?.click()}
            disabled={importing}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {importing ? 'Importing...' : 'XML Import'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Add Product
          </button>
        </div>
      </div>

      {/* Product Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? 'Edit Product' : 'Add Product'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stock</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category ID</label>
                <input
                  type="number"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                rows={4}
              />
            </div>
            
            {/* Images */}
            <div>
              <label className="block text-sm font-medium mb-1">Images</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.images.map((url, idx) => (
                  <div key={idx} className="relative">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        images: formData.images.filter((_, i) => i !== idx)
                      })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="text-primary-600 hover:text-primary-700 text-sm"
              >
                + Add Image URL
              </button>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm">Product is active</label>
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

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0">
                      {product.images?.[0] && (
                        <img src={product.images[0]} alt="" className="w-full h-full object-cover rounded" />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-gray-500 text-sm">{product.description?.substring(0, 50)}...</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">${product.price}</td>
                <td className="px-6 py-4">{product.stock}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
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

export default VendorProducts

