import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const Checkout = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [cart, setCart] = useState(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  
  // Address form
  const [addressForm, setAddressForm] = useState({
    label: '',
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
    isDefault: false,
  })
  
  // Payment form (mock)
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    nameOnCard: '',
  })
  
  // Order processing
  const [processing, setProcessing] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [orderId, setOrderId] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      const [cartRes, addressRes] = await Promise.all([
        api.get('/cart'),
        api.get('/users/addresses'),
      ])
      setCart(cartRes.data.data?.cart || cartRes.data.data || null)
      const addressList = addressRes.data?.data?.addresses || addressRes.data?.addresses || []
      const normalizedAddresses = Array.isArray(addressList) ? addressList : []
      setAddresses(normalizedAddresses)

      if (normalizedAddresses.length > 0) {
        const defaultAddress = normalizedAddresses.find((address) => address.isDefault)
        setSelectedAddress(defaultAddress || normalizedAddresses[0])
        setShowAddressForm(false)
      } else {
        setSelectedAddress(null)
        setShowAddressForm(true)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handleCreateAddress = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await api.post('/users/addresses', addressForm)
      const createdAddress = response.data?.data?.address || response.data?.address || response.data
      const updatedAddresses = [createdAddress, ...addresses]
      setAddresses(updatedAddresses)
      setSelectedAddress(createdAddress)
      setShowAddressForm(false)
      setStep(2)
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create address')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAddress = (address) => {
    setSelectedAddress(address)
    setStep(2)
  }

  const handlePlaceOrder = async () => {
    setProcessing(true)
    try {
      if (!selectedAddress) {
        alert('Please select a shipping address')
        setProcessing(false)
        return
      }

      // Step 1: Create order FIRST (required to get orderId)
      const orderRes = await api.post('/orders/checkout', {
        addressId: selectedAddress.id,
      })

      if (!orderRes.data?.data?.order?.id) {
        throw new Error('Failed to create order')
      }

      const orderId = orderRes.data.data.order.id
      const totalAmount = orderRes.data.data.order.totalAmount

      // Step 2: Create payment intent with orderId
      const intentRes = await api.post('/payments/create-intent', {
        orderId,
        amount: totalAmount,
      })

      if (!intentRes.data?.data?.paymentIntent) {
        throw new Error('Failed to create payment intent')
      }

      const paymentIntent = intentRes.data.data.paymentIntent

      // Step 3: Confirm payment with card details
      const confirmRes = await api.post('/payments/confirm', {
        paymentIntent,
        cardNumber: paymentForm.cardNumber,
        cardExpiry: paymentForm.expiry,
        cardCvc: paymentForm.cvv,
        cardName: paymentForm.nameOnCard,
        saveCard: false,
      })

      if (confirmRes.data?.data?.status === 'COMPLETED') {
        setOrderId(orderId)
        setOrderComplete(true)
      } else {
        alert('Payment failed. Please try again.')
      }
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to place order')
    } finally {
      setProcessing(false)
    }
  }

  const calculateSubtotal = () => {
    const items = cart?.items || []
    return items.reduce((sum, item) => sum + (Number(item.price || 0) * item.quantity), 0)
  }

  const calculateTax = () => calculateSubtotal() * 0.1
  const calculateShipping = () => calculateSubtotal() > 100 ? 0 : 10
  const calculateTotal = () => calculateSubtotal() + calculateTax() + calculateShipping()

  if (orderComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h2 className="text-3xl font-bold mb-4">Order Placed Successfully!</h2>
          <p className="text-gray-600 mb-4">Your order ID is: <strong>{orderId}</strong></p>
          <p className="text-gray-600 mb-6">You will receive a confirmation email shortly.</p>
          <button
            onClick={() => navigate('/orders')}
            className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700"
          >
            View Orders
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      
      {/* Progress Steps */}
      <div className="flex justify-between mb-8">
        {['Address', 'Payment', 'Confirm'].map((label, idx) => (
          <div key={idx} className={`flex items-center ${idx + 1 <= step ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
              idx + 1 <= step ? 'bg-primary-600 text-white' : 'bg-gray-200'
            }`}>
              {idx + 1}
            </div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Address */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
          
          {/* Existing Addresses */}
          {addresses.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Saved Addresses</h3>
                {!showAddressForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(true)}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    + Add New Address
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => handleSelectAddress(addr)}
                    className={`p-4 border rounded-lg cursor-pointer ${
                      selectedAddress?.id === addr.id ? 'border-primary-600 bg-primary-50' : 'hover:border-gray-400'
                    }`}
                  >
                    <p className="font-semibold">{addr.fullName}</p>
                    <p>{addr.addressLine1}</p>
                    {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                    <p className="text-gray-500">{addr.city}, {addr.state} {addr.postalCode}</p>
                    {addr.isDefault && (
                      <span className="inline-block mt-2 px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded">
                        Default
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {addresses.length === 0 && (
            <p className="text-gray-600 mb-4">No saved address found. Please create a shipping address to continue.</p>
          )}
          
          {/* Add New Address Form - VULNERABLE: CSRF - no token */}
          {showAddressForm && (
          <form onSubmit={handleCreateAddress}>
            <h3 className="font-semibold mb-2">Add New Address</h3>
            {/* VULNERABLE: Reflected XSS - fields rendered without sanitization in preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  value={addressForm.fullName}
                  onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Address Label (e.g., Home, Work)</label>
                <input
                  type="text"
                  value={addressForm.label}
                  onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Optional"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Street Address *</label>
                <input
                  type="text"
                  value={addressForm.addressLine1}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="123 Main St"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Street Address 2</label>
                <input
                  type="text"
                  value={addressForm.addressLine2}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Apt, suite, etc. (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City *</label>
                <input
                  type="text"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State *</label>
                <input
                  type="text"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Postal Code *</label>
                <input
                  type="text"
                  value={addressForm.postalCode}
                  onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <input
                  type="text"
                  value={addressForm.country}
                  onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Optional"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="ml-2 text-sm font-medium">Set as default address</span>
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-4 bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
            {addresses.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAddressForm(false)}
                className="mt-4 ml-2 px-6 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </form>
          )}

          {addresses.length > 0 && selectedAddress && !showAddressForm && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="mt-4 bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700"
            >
              Continue to Payment
            </button>
          )}
        </div>
      )}

      {/* Step 2: Payment */}
      {step === 2 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Payment Method</h2>
          <p className="text-gray-600 mb-4">Shipping to: {selectedAddress?.fullName}, {selectedAddress?.addressLine1}, {selectedAddress?.city}</p>
          
          {/* Mock Stripe Payment Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Card Number</label>
              <input
                type="text"
                value={paymentForm.cardNumber}
                onChange={(e) => setPaymentForm({ ...paymentForm, cardNumber: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="4242 4242 4242 4242"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Expiry</label>
                <input
                  type="text"
                  value={paymentForm.expiry}
                  onChange={(e) => setPaymentForm({ ...paymentForm, expiry: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="MM/YY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CVV</label>
                <input
                  type="text"
                  value={paymentForm.cvv}
                  onChange={(e) => setPaymentForm({ ...paymentForm, cvv: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="123"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name on Card</label>
              <input
                type="text"
                value={paymentForm.nameOnCard}
                onChange={(e) => setPaymentForm({ ...paymentForm, nameOnCard: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 border rounded-md hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700"
            >
              Review Order
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Confirm Order</h2>
          
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Order Items</h3>
            {cart?.items?.map((item) => (
              <div key={item.id} className="flex justify-between py-2 border-b">
                <span>{item.product?.name} x {item.quantity}</span>
                <span>${(Number(item.price || 0) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Shipping Address</h3>
            <p className="font-semibold">{selectedAddress?.fullName}</p>
            <p>{selectedAddress?.addressLine1}</p>
            {selectedAddress?.addressLine2 && <p>{selectedAddress?.addressLine2}</p>}
            <p>{selectedAddress?.city}, {selectedAddress?.state} {selectedAddress?.postalCode}</p>
            {selectedAddress?.phone && <p className="text-gray-600">{selectedAddress?.phone}</p>}
          </div>
          
          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between mb-2">
              <span>Subtotal</span>
              <span>${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Tax</span>
              <span>${calculateTax().toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Shipping</span>
              <span>${calculateShipping().toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 border rounded-md hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={processing}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Checkout

