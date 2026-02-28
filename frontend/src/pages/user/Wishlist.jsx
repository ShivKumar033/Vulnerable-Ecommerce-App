import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWishlist()
  }, [])

  const fetchWishlist = async () => {
    try {
      const response = await api.get('/users/wishlist')
      // Handle different response formats - wishlist can be in various places
      const wishlistData = response.data?.data?.wishlist?.items || 
                          response.data?.data?.items || 
                          response.data?.items || 
                          response.data?.data?.wishlist ||
                          []
      setWishlist(Array.isArray(wishlistData) ? wishlistData : [])
    } catch (error) {
      console.error('Error fetching wishlist:', error)
      setWishlist([])
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (productId) => {
    try {
      await api.delete(`/users/wishlist/${productId}`)
      fetchWishlist()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to remove from wishlist')
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">My Wishlist</h1>

      {wishlist.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-4">Your wishlist is empty</p>
          <Link to="/products" className="text-primary-600 hover:text-primary-700">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlist.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <Link to={`/products/${item.productId}`}>
                <div className="h-48 bg-gray-200">
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
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{item.product?.name}</h3>
                  <p className="text-primary-600 font-bold">${item.product?.price}</p>
                </div>
              </Link>
              <div className="px-4 pb-4">
                <button
                  onClick={() => handleRemove(item.productId)}
                  className="w-full text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Wishlist

