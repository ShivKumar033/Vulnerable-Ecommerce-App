import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const Cart = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [couponCode, setCouponCode] = useState('')
  const [applyingCoupon, setApplyingCoupon] = useState(false)
  const [giftCardCode, setGiftCardCode] = useState('')
  const [applyingGiftCard, setApplyingGiftCard] = useState(false)
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [applyingLoyalty, setApplyingLoyalty] = useState(false)

  useEffect(() => {
    fetchCart()
  }, [])

  const fetchCart = async () => {
    try {
      const response = await api.get('/cart')
      setCart(response.data)
    } catch (error) {
      console.error('Error fetching cart:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateQuantity = async (itemId, quantity) => {
    if (quantity < 1) return
    try {
      await api.put(`/cart/${itemId}`, { quantity })
      fetchCart()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update quantity')
    }
  }

  const handleRemoveItem = async (itemId) => {
    try {
      await api.delete(`/cart/${itemId}`)
      fetchCart()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to remove item')
    }
  }

  const handleApplyCoupon = async (e) => {
    e.preventDefault()
    setApplyingCoupon(true)
    try {
      // Coupon application would be part of checkout
      alert('Coupon applied!')
    } catch (error) {
      alert(error.response?.data?.message || 'Invalid coupon')
    } finally {
      setApplyingCoupon(false)
    }
  }

  const handleApplyGiftCard = async (e) => {
    e.preventDefault()
    setApplyingGiftCard(true)
    try {
      // Gift card application would be part of checkout
      alert('Gift card applied!')
    } catch (error) {
      alert(error.response?.data?.message || 'Invalid gift card')
    } finally {
      setApplyingGiftCard(false)
    }
  }

  const handleApplyLoyaltyPoints = async (e) => {
    e.preventDefault()
    setApplyingLoyalty(true)
    try {
      // Loyalty points application would be part of checkout
      alert('Loyalty points applied!')
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to apply points')
    } finally {
      setApplyingLoyalty(false)
    }
  }

  const handleCheckout = () => {
    if (!user) {
      alert('Please login to checkout')
      navigate('/login')
      return
    }
    navigate('/checkout')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const items = cart?.items || []
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tax = subtotal * 0.1 // 10% tax
  const shipping = subtotal > 100 ? 0 : 10 // Free shipping over $100
  const total = subtotal + tax + shipping

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">Your cart is empty</p>
          <Link to="/products" className="text-primary-600 hover:text-primary-700">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="divide-y">
                {items.map((item) => (
                  <div key={item.id} className="p-4 flex items-center">
                    <div className="w-20 h-20 bg-gray-200 flex-shrink-0">
                      {item.product?.images?.[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <Link to={`/products/${item.productId}`} className="font-semibold hover:text-primary-600">
                        {item.product?.name || 'Product'}
                      </Link>
                      {item.variant && (
                        <p className="text-sm text-gray-500">{item.variant}</p>
                      )}
                      <p className="text-primary-600 font-bold">${item.price}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-1 border rounded"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 border rounded"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="ml-4 text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (10%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="border-t pt-4 flex justify-between font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Apply Coupon */}
              <form onSubmit={handleApplyCoupon} className="mb-4">
                <label className="block text-sm font-medium mb-1">Coupon Code</label>
                <div className="flex">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-l-md"
                    placeholder="Enter coupon"
                  />
                  <button
                    type="submit"
                    disabled={applyingCoupon || !couponCode}
                    className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              </form>

              {/* Apply Gift Card */}
              <form onSubmit={handleApplyGiftCard} className="mb-4">
                <label className="block text-sm font-medium mb-1">Gift Card</label>
                <div className="flex">
                  <input
                    type="text"
                    value={giftCardCode}
                    onChange={(e) => setGiftCardCode(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-l-md"
                    placeholder="Enter gift card code"
                  />
                  <button
                    type="submit"
                    disabled={applyingGiftCard || !giftCardCode}
                    className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              </form>

              {/* Apply Loyalty Points */}
              {user && (
                <form onSubmit={handleApplyLoyaltyPoints} className="mb-4">
                  <label className="block text-sm font-medium mb-1">Loyalty Points</label>
                  <div className="flex">
                    <input
                      type="number"
                      value={loyaltyPoints}
                      onChange={(e) => setLoyaltyPoints(parseInt(e.target.value) || 0)}
                      className="flex-1 px-3 py-2 border rounded-l-md"
                      placeholder="Points to redeem"
                    />
                    <button
                      type="submit"
                      disabled={applyingLoyalty || loyaltyPoints <= 0}
                      className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                </form>
              )}

              <button
                onClick={handleCheckout}
                className="w-full bg-primary-600 text-white py-3 rounded-md hover:bg-primary-700"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Cart

