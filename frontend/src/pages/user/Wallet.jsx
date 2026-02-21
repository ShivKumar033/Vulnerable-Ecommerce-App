import { useState, useEffect } from 'react'
import api from '../../services/api'

const Wallet = () => {
  const [wallet, setWallet] = useState({ balance: 0 })
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [walletRes, transactionsRes] = await Promise.all([
        api.get('/wallet'),
        api.get('/wallet/transactions'),
      ])
      setWallet(walletRes.data || { balance: 0 })
      setTransactions(transactionsRes.data || [])
    } catch (error) {
      console.error('Error fetching wallet data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCredit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // VULNERABLE: Race condition - no server-side validation
      await api.post('/wallet/credit', { amount: parseFloat(amount) })
      alert('Credit added!')
      setAmount('')
      setShowAddForm(false)
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add credit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTransfer = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // VULNERABLE: IDOR + race condition
      await api.post('/wallet/transfer', { 
        recipientId: 1, // Would be from form
        amount: parseFloat(amount) 
      })
      alert('Transfer successful!')
      setAmount('')
      setShowTransferForm(false)
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Transfer failed')
    } finally {
      setSubmitting(false)
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Store Credit Wallet</h1>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-lg shadow-lg p-8 mb-8 text-white">
        <h2 className="text-xl mb-2">Your Balance</h2>
        <p className="text-5xl font-bold">${(wallet.balance || 0).toFixed(2)}</p>
      </div>

      {/* Actions */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700"
        >
          Add Credit
        </button>
        <button
          onClick={() => setShowTransferForm(true)}
          className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
        >
          Transfer
        </button>
      </div>

      {/* Add Credit Form - VULNERABLE: Race condition */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Add Credit</h2>
          <form onSubmit={handleAddCredit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transfer Form - VULNERABLE: IDOR */}
      {showTransferForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Transfer Credit</h2>
          <form onSubmit={handleTransfer}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Recipient ID</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="User ID"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? 'Transferring...' : 'Transfer'}
              </button>
              <button
                type="button"
                onClick={() => setShowTransferForm(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500">No transactions yet</p>
        ) : (
          <div className="space-y-4">
            {transactions.map((txn, idx) => (
              <div key={idx} className="flex justify-between items-center border-b pb-4">
                <div>
                  <p className="font-medium">{txn.type || 'Transaction'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(txn.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`font-bold ${txn.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {txn.amount > 0 ? '+' : ''}${txn.amount?.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Wallet

