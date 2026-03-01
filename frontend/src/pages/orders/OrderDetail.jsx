import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const OrderDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${id}`)
      setOrder(response.data)
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    
    setCanceling(true)
    try {
      // VULNERABLE: CSRF - no token validation
      await api.put(`/orders/${id}/cancel`)
      alert('Order cancelled!')
      fetchOrder()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to cancel order')
    } finally {
      setCanceling(false)
    }
  }

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

  const getStatusStep = (status) => {
    const steps = {
      PENDING: 0,
      PAID: 1,
      SHIPPED: 2,
      DELIVERED: 3,
    }
    return steps[status] || 0
  }

  const statusSteps = ['Pending', 'Paid', 'Shipped', 'Delivered']

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold">Order not found</h2>
        <Link to="/orders" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          Back to Orders
        </Link>
      </div>
    )
  }

  const currentStep = getStatusStep(order.status)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/orders" className="text-primary-600 hover:text-primary-700">
          ← Back to Orders
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold">Order #{order.id}</h1>
            <p className="text-gray-500">
              Placed on {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-full text-lg font-medium ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
        </div>

        {/* Order Timeline */}
        <div className="mb-8">
          <h2 className="font-semibold text-lg mb-4">Order Status</h2>
          <div className="flex items-center justify-between">
            {statusSteps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  idx <= currentStep ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {idx < currentStep ? '✓' : idx + 1}
                </div>
                <span className={`mt-2 text-sm ${idx <= currentStep ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Items */}
        <div className="border-t pt-6">
          <h2 className="font-semibold text-lg mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex items-center">
                <div className="w-16 h-16 bg-gray-200 rounded">
                  {item.product?.images?.[0] && (
                    <img 
                      src={item.product.images[0]} 
                      alt={item.product.name}
                      className="w-full h-full object-cover rounded"
                    />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="font-medium">{item.product?.name || 'Product'}</h3>
                  <p className="text-gray-500">Qty: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${(Number(item.price) * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="border-t pt-6 mt-6">
          <div className="flex justify-between mb-2">
            <span>Subtotal</span>
            <span>${order.subtotal?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Tax</span>
            <span>${order.tax?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Shipping</span>
            <span>${order.shipping?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-xl mt-4">
            <span>Total</span>
            <span>${order.total?.toFixed(2)}</span>
          </div>
        </div>

        {/* Shipping Address */}
        {order.shippingAddress && (
          <div className="border-t pt-6 mt-6">
            <h2 className="font-semibold text-lg mb-2">Shipping Address</h2>
            <p>{order.shippingAddress.street}</p>
            <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
            <p>{order.shippingAddress.country}</p>
          </div>
        )}

        {/* Tracking */}
        {order.trackingNumber && (
          <div className="border-t pt-6 mt-6">
            <h2 className="font-semibold text-lg mb-2">Tracking Information</h2>
            <p>Tracking Number: {order.trackingNumber}</p>
          </div>
        )}

        {/* Actions */}
        {order.status === 'PENDING' && (
          <div className="border-t pt-6 mt-6 flex justify-end">
            <button
              onClick={handleCancelOrder}
              disabled={canceling}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {canceling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          </div>
        )}

        {/* Invoice Link */}
        <div className="border-t pt-6 mt-6 flex justify-end">
          <Link
            to={`/orders/${order.id}/invoice`}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            View Invoice →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default OrderDetail

