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
  
  // Address form
  const [addressForm, setAddressForm] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
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
      setCart(cartRes.data)
      setAddresses(addressRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handleCreateAddress = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await api.post('/users/addresses', addressForm)
      setAddresses([...addresses, response.data])
      setSelectedAddress(response.data)
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
      // Create payment intent
      const intentRes = await api.post('/payments/create-intent', {
        amount: calculateTotal(),
      })
      
      // Confirm payment (mock)
      await api.post('/payments/confirm', {
        paymentIntentId: intentRes.data.id,
      })
      
      // Place order
      const orderRes = await api.post('/orders/checkout', {
        addressId: selectedAddress?.id,
        paymentIntentId: intentRes.data.id,
      })
      
      setOrderId(orderRes.data.id)
      setOrderComplete(true)
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to place order')
    } finally {
      setProcessing(false)
    }
  }

  const calculateSubtotal = () => {
    const items = cart?.items || []
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
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
              <h3 className="font-semibold mb-2">Saved Addresses</h3>
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => handleSelectAddress(addr)}
                    className={`p-4 border rounded-lg cursor-pointer ${
                      selectedAddress?.id === addr.id ? 'border-primary-600 bg-primary-50' : 'hover:border-gray-400'
                    }`}
                  >
                    <p>{addr.street}</p>
                    <p className="text-gray-500">{addr.city}, {addr.state} {addr.zipCode}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Add New Address Form - VULNERABLE: CSRF - no token */}
          <form onSubmit={handleCreateAddress}>
            <h3 className="font-semibold mb-2">Add New Address</h3>
            {/* VULNERABLE: Reflected XSS - fields rendered without sanitization in preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Street</label>
                <input
                  type="text"
                  value={addressForm.street}
                  onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input
                  type="text"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <input
                  type="text"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Zip Code</label>
                <input
                  type="text"
                  value={addressForm.zipCode}
                  onChange={(e) => setAddressForm({ ...addressForm, zipCode: e.target.value })}
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
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-4 bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Payment */}
      {step === 2 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Payment Method</h2>
          <p className="text-gray-600 mb-4">Shipping to: {selectedAddress?.street}, {selectedAddress?.city}</p>
          
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
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Shipping Address</h3>
            <p>{selectedAddress?.street}</p>
            <p>{selectedAddress?.city}, {selectedAddress?.state} {selectedAddress?.zipCode}</p>
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

