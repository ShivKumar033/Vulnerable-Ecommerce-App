import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../services/api'

const Categories = () => {
  const { id } = useParams()
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchCategoryAndProducts(id)
    } else {
      fetchCategories()
    }
  }, [id])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories')
      setCategories(response.data.data?.categories || response.data.data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategoryAndProducts = async (categoryId) => {
    try {
      const [categoryRes, productsRes] = await Promise.all([
        api.get(`/categories/${categoryId}`),
        api.get(`/products?categoryId=${categoryId}`)
      ])
      setSelectedCategory(categoryRes.data.data?.category || categoryRes.data.data)
      const productsData = productsRes.data.data?.products || productsRes.data.data || productsRes.data.products || productsRes.data
      setProducts(productsData)
    } catch (error) {
      console.error('Error fetching category:', error)
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

  // If viewing a specific category
  if (selectedCategory) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link to="/categories" className="text-primary-600 hover:text-primary-700">
            ← Back to Categories
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-2">{selectedCategory.name}</h1>
        {selectedCategory.description && (
          <p className="text-gray-600 mb-8">{selectedCategory.description}</p>
        )}

        {/* Subcategories */}
        {selectedCategory.subcategories?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Subcategories</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedCategory.subcategories.map((sub) => (
                <Link
                  key={sub.id}
                  to={`/categories/${sub.id}`}
                  className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition"
                >
                  <h3 className="font-medium">{sub.name}</h3>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Products in this category */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Products</h2>
          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
                >
                  <div className="h-48 bg-gray-200">
                    {product.images?.[0] ? (
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
                    <h3 className="font-semibold mb-1 truncate">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-primary-600 font-bold">${product.price?.toFixed(2)}</span>
                      <span className="text-sm text-gray-500">{product.stock} in stock</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No products in this category</p>
          )}
        </div>
      </div>
    )
  }

  // Main categories list
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Shop by Category</h1>

      {categories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No categories available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/categories/${category.id}`}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold mb-2">{category.name}</h2>
              {category.description && (
                <p className="text-gray-600 text-sm mb-4">{category.description}</p>
              )}
              {category.subcategories?.length > 0 && (
                <p className="text-sm text-primary-600">
                  {category.subcategories.length} subcategories
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Categories

