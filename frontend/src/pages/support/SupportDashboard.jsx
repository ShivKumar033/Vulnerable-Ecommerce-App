import { useState, useEffect } from 'react'
import api from '../../services/api'

const SupportDashboard = () => {
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('orders')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [ordersRes, usersRes] = await Promise.all([
        api.get('/support/orders'),
        api.get('/support/users'),
      ])
      const ordersData = ordersRes.data?.data?.orders || ordersRes.data?.orders || ordersRes.data || []
      const usersData = usersRes.data?.data?.users || usersRes.data?.users || usersRes.data || []
      setOrders(Array.isArray(ordersData) ? ordersData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async (orderId, note) => {
    try {
      await api.post(`/support/orders/${orderId}/notes`, { note })
      alert('Note added!')
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add note')
    }
  }

  const handleEscalate = async (orderId) => {
    if (!confirm('Are you sure you want to escalate this order?')) return
    try {
      await api.post(`/support/orders/${orderId}/escalate`)
      alert('Order escalated to admin!')
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to escalate order')
    }
  }

  const filteredOrders = (Array.isArray(orders) ? orders : []).filter(order => 
    !searchQuery || 
    order.id.toString().includes(searchQuery) ||
    order.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredUsers = (Array.isArray(users) ? users : []).filter(user =>
    !searchQuery ||
    user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Support Dashboard</h1>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <input
          type="text"
          placeholder="Search orders or users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-md ${activeTab === 'orders' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
        >
          Orders
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-md ${activeTab === 'users' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-md ${activeTab === 'audit' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
        >
          Audit Logs
        </button>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Orders</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4">#{order.id}</td>
                    <td className="px-6 py-4">{order.user?.firstName ? `${order.user.firstName} ${order.user.lastName || ''}` : order.user?.email || 'N/A'}</td>
                    <td className="px-6 py-4">${Number(order.totalAmount || order.total || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">{order.status}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleEscalate(order.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Escalate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Users</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4">{user.id}</td>
                    <td className="px-6 py-4">{user.name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">{user.role}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={async () => {
                          try {
                            const response = await api.get(`/support/users/${user.id}/loyalty`)
                            alert(`Loyalty Points: ${response.data?.balance || 0}`)
                          } catch (error) {
                            alert('Failed to fetch loyalty data')
                          }
                        }}
                        className="text-primary-600 hover:text-primary-700 text-sm mr-2"
                      >
                        View Loyalty
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const response = await api.get(`/support/users/${user.id}/wallet`)
                            alert(`Wallet Balance: $${response.data?.balance?.toFixed(2) || '0.00'}`)
                          } catch (error) {
                            alert('Failed to fetch wallet data')
                          }
                        }}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        View Wallet
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Audit Logs</h2>
          <p className="text-gray-500">View system audit logs here. Logs show user actions and system events.</p>
          <button
            onClick={async () => {
              try {
                const response = await api.get('/support/audit-logs')
                console.log('Audit logs:', response.data)
                alert('Check console for audit logs')
              } catch (error) {
                alert('Failed to fetch audit logs')
              }
            }}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Load Audit Logs
          </button>
        </div>
      )}
    </div>
  )
}

export default SupportDashboard

