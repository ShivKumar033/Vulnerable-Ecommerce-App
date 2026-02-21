import { useState, useEffect } from 'react'
import api from '../../services/api'
import { toast } from 'react-toastify'

const VendorReturns = () => {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReturn, setSelectedReturn] = useState(null)

  useEffect(() => {
    fetchReturns()
  }, [])

  const fetchReturns = async () => {
    try {
      const response = await api.get('/vendor/returns')
      setReturns(response.data || [])
    } catch (error) {
      console.error('Error fetching returns:', error)
      // Try alternative endpoint
      try {
        const altResponse = await api.get('/vendor/returns/all')
        setReturns(altResponse.data || [])
      } catch (e) {
        console.error('Error fetching vendor returns:', e)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      await api.put(`/returns/${id}/approve`)
      toast.success('Return approved!')
      fetchReturns()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve return')
    }
  }

  const handleReject = async (id) => {
    if (!confirm('Are you sure you want to reject this return request?')) return
    try {
      await api.put(`/returns/${id}/reject`)
      toast.success('Return rejected!')
      fetchReturns()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject return')
    }
  }

  const handleComplete = async (id) => {
    try {
      await api.put(`/returns/${id}/complete`)
      toast.success('Return completed!')
      fetchReturns()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete return')
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
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Return Requests</h1>

      {returns.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg">No return requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map((returnItem) => (
            <div key={returnItem.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Return #{returnItem.id}</h3>
                  <p className="text-gray-500 text-sm">
                    Order #{returnItem.orderId} - {new Date(returnItem.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(returnItem.status)}`}>
                  {returnItem.status}
                </span>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-gray-600 text-sm">Product:</span>
                    <p className="font-medium">{returnItem.product?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">Quantity:</span>
                    <p className="font-medium">{returnItem.quantity || 1}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">Reason:</span>
                    <p className="font-medium">{returnItem.reason || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 text-sm">Refund Amount:</span>
                    <p className="font-medium">${returnItem.refundAmount?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>

                {returnItem.description && (
                  <div className="mb-4">
                    <span className="text-gray-600 text-sm">Description:</span>
                    <p className="mt-1">{returnItem.description}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {returnItem.status === 'REQUESTED' && (
                    <>
                      <button
                        onClick={() => handleApprove(returnItem.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(returnItem.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {returnItem.status === 'APPROVED' && (
                    <button
                      onClick={() => handleComplete(returnItem.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Complete Refund
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default VendorReturns

