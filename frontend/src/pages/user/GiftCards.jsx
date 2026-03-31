import { useState, useEffect } from 'react'
import api from '../../services/api'

const GiftCards = () => {
  const [myCards, setMyCards] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('')
  const [useNewCard, setUseNewCard] = useState(false)
  const [newCardForm, setNewCardForm] = useState({
    cardNumber: '',
    expiry: '',
    brand: 'visa',
    isDefault: false,
  })
  const [loading, setLoading] = useState(true)
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [amount, setAmount] = useState(50)
  const [purchasedCode, setPurchasedCode] = useState(null)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemAmount, setRedeemAmount] = useState('')
  const [checkingBalance, setCheckingBalance] = useState(false)
  const [checkedGiftCard, setCheckedGiftCard] = useState(null)

  const formatDateTime = (dateValue, fallback = 'N/A') => {
    if (!dateValue) return fallback
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return fallback

    const parts = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).formatToParts(date)

    const getPart = (type) => parts.find((part) => part.type === type)?.value || ''
    const day = getPart('day')
    const month = getPart('month')
    const year = getPart('year')
    const hour = getPart('hour')
    const minute = getPart('minute')
    const dayPeriod = getPart('dayPeriod').toUpperCase()

    return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod}`
  }

  useEffect(() => {
    fetchMyCards()
    fetchPaymentMethods()
  }, [])

  const fetchMyCards = async () => {
    try {
      const response = await api.get('/giftcards')
      
      setMyCards(response?.data?.data?.giftCards || [])
    } catch (error) {
      console.error('Error fetching gift cards:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      const response = await api.get('/users/payment-methods')
      const methods = response?.data?.data?.paymentMethods || response?.data?.paymentMethods || response?.data || []
      const normalizedMethods = Array.isArray(methods) ? methods : []

      setPaymentMethods(normalizedMethods)

      const defaultMethod = normalizedMethods.find((method) => method.isDefault)
      setSelectedPaymentMethodId(defaultMethod?.id || normalizedMethods[0]?.id || '')
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      setPaymentMethods([])
      setSelectedPaymentMethodId('')
    } finally {
      setLoadingPaymentMethods(false)
    }
  }

  const formatPaymentMethodLabel = (method) => {
    const brand = method?.brand ? String(method.brand).toUpperCase() : 'CARD'
    const last4 = method?.last4 || '****'
    const expiry = method?.expMonth && method?.expYear ? ` (Exp ${method.expMonth}/${method.expYear})` : ''
    return `${brand} •••• ${last4}${expiry}`
  }

  const parseExpiry = (expiry) => {
    const trimmed = String(expiry || '').trim()
    const match = trimmed.match(/^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/)
    if (!match) return null

    const month = Number(match[1])
    const yearPart = match[2]
    const year = yearPart.length === 2 ? 2000 + Number(yearPart) : Number(yearPart)

    return { month, year }
  }
  

  const handlePurchase = async (e) => {
    e.preventDefault()

    let paymentMethodIdToUse = selectedPaymentMethodId

    if (useNewCard) {
      const sanitizedCardNumber = String(newCardForm.cardNumber || '').replace(/\s+/g, '')
      if (!/^\d{12,19}$/.test(sanitizedCardNumber)) {
        alert('Please enter a valid card number')
        return
      }

      const parsedExpiry = parseExpiry(newCardForm.expiry)
      if (!parsedExpiry) {
        alert('Please enter expiry in MM/YY format')
        return
      }

      setPurchasing(true)
      try {
        const saveCardResponse = await api.post('/users/payment-methods', {
          type: 'card',
          last4: sanitizedCardNumber.slice(-4),
          brand: newCardForm.brand,
          expMonth: parsedExpiry.month,
          expYear: parsedExpiry.year,
          isDefault: newCardForm.isDefault || paymentMethods.length === 0,
        })

        paymentMethodIdToUse = saveCardResponse?.data?.data?.paymentMethod?.id
        if (!paymentMethodIdToUse) {
          throw new Error('Failed to create payment method')
        }

        setSelectedPaymentMethodId(paymentMethodIdToUse)
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to save card for purchase')
        setPurchasing(false)
        return
      }
    }

    if (!paymentMethodIdToUse) {
      alert('Please select a saved card to purchase gift card')
      return
    }

    setPurchasing(true)
    try {
      const response = await api.post('/giftcards/purchase', {
        amount: parseFloat(amount),
        paymentMethodId: paymentMethodIdToUse,
      })
      setPurchasedCode(response?.data?.data?.giftCard?.code || null)
      alert('Gift card purchased!')
      fetchMyCards()
      fetchPaymentMethods()
      if (useNewCard) {
        setNewCardForm({ cardNumber: '', expiry: '', brand: 'visa', isDefault: false })
      }
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
      await api.post('/giftcards/redeem', {
        code: redeemCode,
        amount: parseFloat(redeemAmount)
      })
      alert('Gift card redeemed!')
      setRedeemCode('')
      setRedeemAmount('')
      fetchMyCards()
    } catch (error) {
      alert(error.response?.data?.message || 'Invalid gift card code')
    } finally {
      setRedeeming(false)
    }
  }

  const handleCheckBalance = async () => {
    if (!redeemCode.trim()) {
      alert('Please enter a gift card code')
      return
    }

    setCheckingBalance(true)
    try {
      const response = await api.get('/giftcards/check', {
        params: { code: redeemCode }
      })
      setCheckedGiftCard(response?.data?.data?.giftCard || null)
    } catch (error) {
      setCheckedGiftCard(null)
      alert(error.response?.data?.message || 'Failed to check gift card balance')
    } finally {
      setCheckingBalance(false)
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
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Pay With Saved Card</label>
              <select
                value={selectedPaymentMethodId}
                onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                disabled={useNewCard || loadingPaymentMethods || paymentMethods.length === 0}
              >
                {loadingPaymentMethods ? (
                  <option value="">Loading cards...</option>
                ) : paymentMethods.length === 0 ? (
                  <option value="">No saved cards found</option>
                ) : (
                  paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {formatPaymentMethodLabel(method)}
                    </option>
                  ))
                )}
              </select>
              {paymentMethods.length === 0 && !loadingPaymentMethods && (
                <p className="text-sm text-gray-500 mt-2">
                  Add a card in Payment Methods before purchasing a gift card.
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="flex items-center text-sm font-medium">
                <input
                  type="checkbox"
                  checked={useNewCard}
                  onChange={(e) => setUseNewCard(e.target.checked)}
                  className="mr-2"
                />
                Use a new card for this purchase
              </label>
            </div>

            {useNewCard && (
              <div className="mb-4 p-3 border rounded-md bg-gray-50 space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Card Number</label>
                  <input
                    type="text"
                    value={newCardForm.cardNumber}
                    onChange={(e) => setNewCardForm({ ...newCardForm, cardNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="4242 4242 4242 4242"
                    required={useNewCard}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      value={newCardForm.expiry}
                      onChange={(e) => setNewCardForm({ ...newCardForm, expiry: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="12/29"
                      required={useNewCard}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Brand</label>
                    <select
                      value={newCardForm.brand}
                      onChange={(e) => setNewCardForm({ ...newCardForm, brand: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="visa">VISA</option>
                      <option value="mastercard">MASTERCARD</option>
                      <option value="amex">AMEX</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={newCardForm.isDefault}
                    onChange={(e) => setNewCardForm({ ...newCardForm, isDefault: e.target.checked })}
                    className="mr-2"
                  />
                  Save as default payment method
                </label>
              </div>
            )}
            <button
              type="submit"
              disabled={purchasing || (!useNewCard && (loadingPaymentMethods || paymentMethods.length === 0 || !selectedPaymentMethodId))}
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
                onChange={(e) => {
                  setRedeemCode(e.target.value)
                  setCheckedGiftCard(null)
                }}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter code"
                required
              />
            </div>
            <button
              type="button"
              onClick={handleCheckBalance}
              disabled={checkingBalance}
              className="w-full border border-primary-600 text-primary-600 py-2 rounded-md hover:bg-primary-50 disabled:opacity-50 mb-4"
            >
              {checkingBalance ? 'Checking...' : 'Check Balance'}
            </button>

            {checkedGiftCard && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm">
                <p className="font-medium">Balance: ${Number(checkedGiftCard.currentBalance || 0).toFixed(2)}</p>
                <p className="text-gray-600">Status: {checkedGiftCard.status}</p>
                <p className="text-gray-600">
                  Expires At: {formatDateTime(checkedGiftCard.expiresAt, 'Never')}
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input
                type="number"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter amount"
                min="0.01"
                step="0.01"
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
                    <p className="currentBalanceno text-lg">{card.code}</p>
                    <p className="text-gray-500">
                      Balance: ${Number(card.currentBalance || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400">
                      Created At: {formatDateTime(card.createdAt, 'N/A')}
                    </p>
                    <p className="text-sm text-gray-400">
                      Expires At: {formatDateTime(card.expiresAt, 'Never')}
                    </p>
                    <div className="mt-2 text-sm text-gray-500">
                      <p className="font-medium text-gray-600">Redeemed By</p>
                      {card.redeemedBy ? (
                        <>
                          <p>Email: {card.redeemedBy.email || 'N/A'}</p>
                        </>
                      ) : (
                        <p>Not redeemed yet</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    card.currentBalance > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {card.currentBalance > 0 ? 'Active' : 'Used'}
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

