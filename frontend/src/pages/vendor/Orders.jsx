import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

const VendorOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/vendor/my-orders')
      setOrders(response.data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
      // Try alternative endpoint
      try {
        const altResponse = await api.get('/vendor/dashboard/all')
        setOrders(altResponse.data?.recentOrders || [])
      } catch (e) {
        console.error('Error fetching vendor orders:', e)
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !search || 
      order.id.toString().includes(search) ||
      order.trackingNumber?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !statusFilter || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus })
      alert('Order status updated!')
      fetchOrders()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status')
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
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by order ID or tracking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border rounded-md"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Order #{order.id}</h3>
                  <p className="text-gray-500 text-sm">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Customer: {order.user?.name || order.user?.email || 'N/A'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
              
              <div className="border-t pt-4">
                <div className="mb-2">
                  <span className="text-gray-600 font-medium">Items:</span>
                  <div className="mt-1 ml-2">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="text-sm">
                        {item.product?.name} x {item.quantity} - ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold">${order.total?.toFixed(2)}</span>
                </div>
                {order.trackingNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tracking:</span>
                    <span>{order.trackingNumber}</span>
                  </div>
                )}
              </div>

              {/* Status Update Actions */}
              <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                <span className="text-sm font-medium mr-2">Update Status:</span>
                {order.status === 'PAID' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                  >
                    Mark as Shipped
                  </button>
                )}
                {order.status === 'SHIPPED' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Mark as Delivered
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default VendorOrders

