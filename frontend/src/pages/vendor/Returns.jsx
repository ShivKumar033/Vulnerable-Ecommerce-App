import { useState, useEffect } from 'react'
import api from '../../services/api'

const VendorReturns = () => {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReturns()
  }, [])

  const fetchReturns = async () => {
    try {
      const response = await api.get('/vendor/returns')
      setReturns(response.data || [])
    } catch (error) {
      console.error('Error fetching returns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    if (!confirm('Are you sure you want to approve this return?')) return
    try {
      await api.put(`/vendor/returns/${id}/approve`)
      alert('Return approved!')
      fetchReturns()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve return')
    }
  }

  const handleReject = async (id) => {
    if (!confirm('Are you sure you want to reject this return?')) return
    try {
      await api.put(`/vendor/returns/${id}/reject`)
      alert('Return rejected!')
      fetchReturns()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject return')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
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
      <h1 className="text-3xl font-bold mb-8">Return Requests</h1>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {returns.length > 0 ? (
              returns.map((returnItem) => (
                <tr key={returnItem.id}>
                  <td className="px-6 py-4 whitespace-nowrap">#{returnItem.id}</td>
                  <td className="px-6 py-4">#{returnItem.orderId}</td>
                  <td className="px-6 py-4">{returnItem.product?.name || 'N/A'}</td>
                  <td className="px-6 py-4">{returnItem.reason || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(returnItem.status)}`}>
                      {returnItem.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(returnItem.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {returnItem.status === 'PENDING' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove(returnItem.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(returnItem.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No return requests
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default VendorReturns

