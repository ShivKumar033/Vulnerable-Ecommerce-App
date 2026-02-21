import { useState, useEffect } from 'react'
import api from '../../services/api'

const GiftCards = () => {
  const [myCards, setMyCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [amount, setAmount] = useState(50)
  const [purchasedCode, setPurchasedCode] = useState(null)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemCode, setRedeemCode] = useState('')

  useEffect(() => {
    fetchMyCards()
  }, [])

  const fetchMyCards = async () => {
    try {
      const response = await api.get('/giftcards/my')
      setMyCards(response.data || [])
    } catch (error) {
      console.error('Error fetching gift cards:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (e) => {
    e.preventDefault()
    setPurchasing(true)
    try {
      const response = await api.post('/giftcards/purchase', { amount: parseFloat(amount) })
      setPurchasedCode(response.data.code)
      alert('Gift card purchased!')
      fetchMyCards()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to purchase gift card')
    } finally {
      setPurchasing(false)
    }
  }

  const handleRedeem = async (e) => {
    e.preventDefault()
    setRedeeming(true)
    try {
      await api.post('/giftcards/redeem', { code: redeemCode })
      alert('Gift card redeemed!')
      setRedeemCode('')
      fetchMyCards()
    } catch (error) {
      alert(error.response?.data?.message || 'Invalid gift card code')
    } finally {
      setRedeeming(false)
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
      <h1 className="text-3xl font-bold mb-8">Gift Cards</h1>

      {/* Purchased Code Display */}
      {purchasedCode && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          <p className="font-bold">Your Gift Card Code:</p>
          <p className="text-2xl font-mono">{purchasedCode}</p>
          <button
            onClick={() => setPurchasedCode(null)}
            className="text-sm underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Purchase Gift Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Purchase Gift Card</h2>
          <form onSubmit={handlePurchase}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Amount</label>
              <select
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="25">$25</option>
                <option value="50">$50</option>
                <option value="100">$100</option>
                <option value="200">$200</option>
                <option value="500">$500</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={purchasing}
              className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {purchasing ? 'Purchasing...' : 'Purchase'}
            </button>
          </form>
        </div>

        {/* Redeem Gift Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Redeem Gift Card</h2>
          <form onSubmit={handleRedeem}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Gift Card Code</label>
              <input
                type="text"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter code"
                required
              />
            </div>
            <button
              type="submit"
              disabled={redeeming}
              className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {redeeming ? 'Redeeming...' : 'Redeem'}
            </button>
          </form>
        </div>
      </div>

      {/* My Gift Cards */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">My Gift Cards</h2>
        {myCards.length === 0 ? (
          <p className="text-gray-500">No gift cards yet</p>
        ) : (
          <div className="space-y-4">
            {myCards.map((card, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-mono text-lg">{card.code}</p>
                    <p className="text-gray-500">
                      Balance: ${(card.balance || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400">
                      Expires: {card.expiresAt ? new Date(card.expiresAt).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    card.balance > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {card.balance > 0 ? 'Active' : 'Used'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default GiftCards

