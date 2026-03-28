import { useState, useEffect } from 'react'
import api from '../../services/api'

const Wallet = () => {
  const [wallet, setWallet] = useState({ balance: 0 })
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [walletRes, transactionsRes] = await Promise.all([
        api.get('/wallet')
      ])
      
setWallet(walletRes.data.data.wallet || { balance: 0 })
      const txnData = walletRes.data?.data?.wallet.transactions
      setTransactions(Array.isArray(txnData) ? txnData : [])
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
        recipientId: recipientId.trim(),
        amount: parseFloat(amount) 
      })
      alert('Transfer successful!')
      setAmount('')
      setRecipientId('')
      setShowTransferForm(false)
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Transfer failed')
    } finally {
      setSubmitting(false)
    }
  }

  const addCreditTransactions = transactions.filter(
    (txn) => txn?.type === 'credit' && txn?.metadata?.source === 'user_topup'
  )

  const transferTransactions = transactions.filter(
    (txn) => txn?.metadata?.transferType === 'outgoing' || txn?.metadata?.transferType === 'incoming'
  )

  const getTransactionLabel = (txn) => {
    if (txn?.metadata?.transferType === 'outgoing') return 'Transfer Sent'
    if (txn?.metadata?.transferType === 'incoming') return 'Transfer Received'
    if (txn?.metadata?.source === 'user_topup') return 'Add Credit'
    return txn?.type || 'Transaction'
  }

  const getAmountClass = (txn) => {
    const isDebit = txn?.metadata?.transferType === 'outgoing' || txn?.type === 'debit'
    return isDebit ? 'text-red-600' : 'text-green-600'
  }

  const getAmountText = (txn) => {
    const isDebit = txn?.metadata?.transferType === 'outgoing' || txn?.type === 'debit'
    return `${isDebit ? '-' : '+'}$${Number(txn?.amount ?? 0).toFixed(2)}`
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
        <p className="text-5xl font-bold">${Number(wallet.balance || 0).toFixed(2)}</p>
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
                type="text"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Add Credit History</h2>
          {addCreditTransactions.length === 0 ? (
            <p className="text-gray-500">No add-credit transactions yet</p>
          ) : (
            <div className="space-y-4">
              {addCreditTransactions.map((txn) => (
                <div key={txn?.id} className="flex justify-between items-center border-b pb-4">
                  <div>
                    <p className="font-medium">{getTransactionLabel(txn)}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(txn?.createdAt || Date.now()).toLocaleDateString()}
                    </p>
                    {txn?.description ? (
                      <p className="text-xs text-gray-500">{txn.description}</p>
                    ) : null}
                  </div>
                  <span className={`font-bold ${getAmountClass(txn)}`}>{getAmountText(txn)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Transfer History</h2>
          {transferTransactions.length === 0 ? (
            <p className="text-gray-500">No transfer transactions yet</p>
          ) : (
            <div className="space-y-4">
              {transferTransactions.map((txn) => (
                <div key={txn?.id} className="flex justify-between items-center border-b pb-4">
                  <div>
                    <p className="font-medium">{getTransactionLabel(txn)}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(txn?.createdAt || Date.now()).toLocaleDateString()}
                    </p>
                    {txn?.description ? (
                      <p className="text-xs text-gray-500">{txn.description}</p>
                    ) : null}
                  </div>
                  <span className={`font-bold ${getAmountClass(txn)}`}>{getAmountText(txn)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Wallet

