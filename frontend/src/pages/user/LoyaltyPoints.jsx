import { useState, useEffect } from 'react'
import api from '../../services/api'

const LoyaltyPoints = () => {
  const [balance, setBalance] = useState(0)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [balanceRes, historyRes] = await Promise.all([
        api.get('/loyalty/balance'),
        api.get('/loyalty/history'),
      ])
      setBalance(balanceRes.data?.balance || 0)
      setHistory(historyRes.data || [])
    } catch (error) {
      console.error('Error fetching loyalty data:', error)
    } finally {
      setLoading(false)
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
      <h1 className="text-3xl font-bold mb-8">Loyalty Points</h1>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg shadow-lg p-8 mb-8 text-white">
        <h2 className="text-xl mb-2">Your Balance</h2>
        <p className="text-5xl font-bold">{balance.toLocaleString()}</p>
        <p className="mt-2">points</p>
      </div>

      {/* History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Points History</h2>
        {history.length === 0 ? (
          <p className="text-gray-500">No history yet</p>
        ) : (
          <div className="space-y-4">
            {history.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center border-b pb-4">
                <div>
                  <p className="font-medium">{item.description || 'Points Transaction'}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`font-bold ${item.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.amount > 0 ? '+' : ''}{item.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default LoyaltyPoints

