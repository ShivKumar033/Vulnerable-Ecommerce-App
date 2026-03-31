import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../services/api'

const Products = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [rating, setRating] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [searchParams, page, sort])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories')
      setCategories(response.data.data?.categories || response.data.data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      // Map sort values to sortBy and order
      let sortBy = 'createdAt'
      let order = 'desc'
      if (sort === 'price_asc') {
        sortBy = 'price'
        order = 'asc'
      } else if (sort === 'price_desc') {
        sortBy = 'price'
        order = 'desc'
      } else if (sort === 'rating') {
        sortBy = 'rating'
        order = 'desc'
      }

      const params = new URLSearchParams()
      params.append('page', page)
      params.append('limit', 12)
      if (search) params.append('keyword', search)
      if (category) params.append('category', category)
      if (minPrice) params.append('minPrice', minPrice)
      if (maxPrice) params.append('maxPrice', maxPrice)
      if (rating) params.append('rating', rating)
      if (sortBy) params.append('sortBy', sortBy)
      if (order) params.append('order', order)

      const response = await api.get(`/products?${params.toString()}`)
      const productsData = response.data.data?.products || response.data.data || response.data.products || response.data
      setProducts(productsData)
      
      // Try to get total pages if available
      if (response.data.data?.pagination?.totalPages) {
        setTotalPages(response.data.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (search) params.set('search', search)
    else params.delete('search')
    if (category) params.set('category', category)
    else params.delete('category')
    setSearchParams(params)
    setPage(1)
  }

  const handleClearFilters = () => {
    setSearch('')
    setCategory('')
    setMinPrice('')
    setMaxPrice('')
    setRating('')
    setSort('newest')
    setSearchParams({})
    setPage(1)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Products</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold mb-4">Filters</h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="9999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Rating</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                  <option value="1">1+ Stars</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Rating</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Apply
                </button>
              </div>
            </form>
          </div>
        </aside>

        {/* Products Content */}
        <section className="lg:col-span-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-500 text-lg">No products found</p>
              <button
                onClick={handleClearFilters}
                className="mt-4 text-primary-600 hover:text-primary-700"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden"
                  >
                    <div className="h-48 bg-gray-200">
                      {product.images && product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 truncate">{product.name}</h3>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description?.substring(0, 60)}...</p>
                      <div className="flex justify-between items-center">
                        <span className="text-primary-600 font-bold">${typeof product.price === 'number' ? product.price.toFixed(2) : Number(product.price || 0).toFixed(2)}</span>
                        <span className="text-yellow-500">★ {product.rating || '0.0'}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8 space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border rounded-md disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border rounded-md disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default Products

