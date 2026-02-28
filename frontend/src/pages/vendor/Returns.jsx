import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import api from '../../services/api'

const VendorReturns = () => {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalCount: 0, totalPages: 0 })
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedReturn, setSelectedReturn] = useState(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchReturns()
  }, [pagination.page, statusFilter])

  const fetchReturns = async () => {
    try {
      const params = new URLSearchParams()
      params.append('page', pagination.page)
      params.append('limit', pagination.limit)
      if (statusFilter) params.append('status', statusFilter)
      
      const response = await api.get(`/vendor/returns?${params.toString()}`)
      setReturns(response.data.data.returns || [])
      setPagination(prev => ({ ...prev, ...response.data.data.pagination }))
    } catch (error) {
      toast.error('Failed to load returns')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      await api.put(`/vendor/returns/${id}/approve`, { adminNotes: notes })
      toast.success('Return approved')
      setSelectedReturn(null)
      setNotes('')
      fetchReturns()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve return')
    }
  }

  const handleReject = async (id) => {
    try {
      await api.put(`/vendor/returns/${id}/reject`, { adminNotes: notes })
      toast.success('Return rejected')
      setSelectedReturn(null)
      setNotes('')
      fetchReturns()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject return')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'REFUNDED': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Return Requests</h1>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPagination(prev => ({ ...prev, page: 1 }))
          }}
          className="border border-gray-300 rounded-lg px-4 py-2"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {returns.map((ret) => (
              <tr key={ret.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {ret.id.slice(0, 8)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {ret.order?.orderNumber}
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-900">{ret.user?.firstName} {ret.user?.lastName}</p>
                  <p className="text-sm text-gray-500">{ret.user?.email}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-600 max-w-xs truncate">{ret.reason}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ret.status)}`}>
                    {ret.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(ret.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {ret.status === 'PENDING' && (
                    <button
                      onClick={() => setSelectedReturn(ret)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Review
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {returns.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  No return requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Review Return Request</h2>
            
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Return ID</label>
                <p className="text-gray-900">{selectedReturn.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Order</label>
                <p className="text-gray-900">{selectedReturn.order?.orderNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <p className="text-gray-900">{selectedReturn.reason}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Items</label>
                {selectedReturn.order?.items?.map((item, idx) => (
                  <p key={idx} className="text-gray-600">
                    {item.product?.title} x{item.quantity}
                  </p>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 border p-2"
                  placeholder="Add notes about this return..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedReturn(null)
                  setNotes('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedReturn.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() => handleApprove(selectedReturn.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default VendorReturns

