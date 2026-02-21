import { useState, useEffect } from 'react'
import api from '../../services/api'

const AdminRefunds = () => {
  const [refunds, setRefunds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRefunds()
  }, [])

  const fetchRefunds = async () => {
    try {
      const response = await api.get('/admin/refunds')
      setRefunds(response.data || [])
    } catch (error) {
      console.error('Error fetching refunds:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    if (!confirm('Approve this refund?')) return
    try {
      await api.put(`/admin/refunds/${id}/approve`)
      alert('Refund approved!')
      fetchRefunds()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve refund')
    }
  }

  const handleReject = async (id) => {
    if (!confirm('Reject this refund?')) return
    try {
      await api.put(`/admin/refunds/${id}/reject`)
      alert('Refund rejected!')
      fetchRefunds()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject refund')
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
      <h1 className="text-3xl font-bold mb-8">Refund Management</h1>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {refunds.length > 0 ? (
              refunds.map((refund) => (
                <tr key={refund.id}>
                  <td className="px-6 py-4 whitespace-nowrap">#{refund.id}</td>
                  <td className="px-6 py-4">#{refund.orderId}</td>
                  <td className="px-6 py-4">${refund.amount?.toFixed(2)}</td>
                  <td className="px-6 py-4">{refund.reason || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(refund.status)}`}>
                      {refund.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(refund.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {refund.status === 'PENDING' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove(refund.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(refund.id)}
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
                  No refund requests
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminRefunds

