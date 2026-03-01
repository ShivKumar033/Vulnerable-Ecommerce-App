import { useState, useEffect } from 'react'
import api from '../../services/api'

const AdminInventory = () => {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [lowStockFilter, setLowStockFilter] = useState(false)

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    try {
      const response = await api.get('/admin/inventory')
      setInventory(response.data?.data?.inventory || response.data?.inventory || response.data || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStock = async (productId, newStock) => {
    try {
      await api.put(`/admin/products/${productId}`, { stock: parseInt(newStock) })
      alert('Stock updated!')
      fetchInventory()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update stock')
    }
  }

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase())
    const matchesLowStock = !lowStockFilter || (item.stock || 0) < 10
    return matchesSearch && matchesLowStock
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
      <h1 className="text-3xl font-bold mb-8">Inventory Control</h1>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border rounded-md"
          />
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={(e) => setLowStockFilter(e.target.checked)}
              className="rounded"
            />
            <span>Low Stock Only (&lt;10)</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInventory.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded">
                      {item.images?.[0] && (
                        <img src={item.images[0]} alt="" className="w-full h-full object-cover rounded" />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-gray-500 text-sm">{item.category?.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-sm">{item.sku || 'N/A'}</td>
                <td className="px-6 py-4">
                  <input
                    type="number"
                    defaultValue={item.stock || 0}
                    onBlur={(e) => handleUpdateStock(item.id, e.target.value)}
                    className="w-20 px-2 py-1 border rounded text-center"
                    min="0"
                  />
                </td>
                <td className="px-6 py-4">${typeof item.price === 'number' ? item.price.toFixed(2) : Number(item.price || 0).toFixed(2)}</td>
                <td className="px-6 py-4">
                  {(item.stock || 0) === 0 ? (
                    <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">Out of Stock</span>
                  ) : (item.stock || 0) < 10 ? (
                    <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">Low Stock</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">In Stock</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleUpdateStock(item.id, 0)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Set Out of Stock
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

export default AdminInventory
