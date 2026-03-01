import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const InvoiceDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${id}`)
      setOrder(response.data)
    } catch (error) {
      console.error('Error fetching order:', error)
      alert('Order not found')
      navigate('/orders')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    setDownloading(true)
    try {
      const response = await api.get(`/export/invoices/${id}/pdf`, {
        responseType: 'blob'
      })
      
      // Create a blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `invoice-${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading invoice:', error)
      alert('Failed to download invoice')
    } finally {
      setDownloading(false)
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Link to="/orders" className="text-primary-600 hover:text-primary-700">
          ← Back to Orders
        </Link>
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {downloading ? 'Downloading...' : 'Download PDF'}
        </button>
      </div>

      {/* Invoice Header */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold">INVOICE</h1>
            <p className="text-gray-500 mt-1">Invoice #{order.id}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">VulnShop Inc.</p>
            <p className="text-gray-500 text-sm">123 E-Commerce St</p>
            <p className="text-gray-500 text-sm">Shopping City, SC 12345</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-2">Bill To:</h3>
            <p>{order.user?.name || 'Customer'}</p>
            <p className="text-gray-500">{order.user?.email}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Invoice Details:</h3>
            <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
            <p>Status: <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>{order.status}</span></p>
            {order.trackingNumber && <p>Tracking: {order.trackingNumber}</p>}
          </div>
        </div>

        {/* Shipping Address */}
        {order.shippingAddress && (
          <div className="mb-8">
            <h3 className="font-semibold mb-2">Shipping Address:</h3>
            <p>{order.shippingAddress.street}</p>
            <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
            <p>{order.shippingAddress.country}</p>
          </div>
        )}

        {/* Order Items Table */}
        <div className="mb-8">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Item</th>
                <th className="text-center py-2">Quantity</th>
                <th className="text-right py-2">Unit Price</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-3">
                    <p className="font-medium">{item.product?.name || 'Product'}</p>
                    {item.variant && <p className="text-sm text-gray-500">{item.variant}</p>}
                  </td>
                  <td className="text-center py-3">{item.quantity}</td>
                  <td className="text-right py-3">${Number(item.price || 0).toFixed(2)}</td>
                  <td className="text-right py-3">${(Number(item.price || 0) * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Order Summary */}
        <div className="flex justify-end">
          <div className="w-64">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Subtotal:</span>
              <span>${order.subtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Tax:</span>
              <span>${order.tax?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Shipping:</span>
              <span>${order.shipping?.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between mb-2 text-green-600">
                <span>Discount:</span>
                <span>-${order.discount?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-bold text-lg">
              <span>Total:</span>
              <span>${order.total?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        {order.paymentInfo && (
          <div className="mt-8 pt-8 border-t">
            <h3 className="font-semibold mb-2">Payment Information:</h3>
            <p>Method: {order.paymentInfo.method || 'Card'}</p>
            <p>Transaction ID: {order.paymentInfo.transactionId || 'N/A'}</p>
          </div>
        )}

        {/* Refund Status */}
        {order.refund && (
          <div className="mt-8 pt-8 border-t">
            <h3 className="font-semibold mb-2">Refund Status:</h3>
            <p>Status: <span className={`px-2 py-1 rounded-full text-xs ${
              order.refund.status === 'REFUNDED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>{order.refund.status}</span></p>
            {order.refund.amount && <p>Amount: ${order.refund.amount.toFixed(2)}</p>}
            {order.refund.date && <p>Date: {new Date(order.refund.date).toLocaleDateString()}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default InvoiceDetail

