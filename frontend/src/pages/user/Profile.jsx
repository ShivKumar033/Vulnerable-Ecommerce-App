import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

const Profile = () => {
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
  })
  const [previewBio, setPreviewBio] = useState('')

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
    })
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await api.put('/users/profile', formData)
      updateUser(response.data)
      alert('Profile updated!')
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePreviewBio = async () => {
    try {
      const response = await api.get('/users/profile/render')
      setPreviewBio(response.data)
    } catch (error) {
      setPreviewBio(formData.bio)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* VULNERABLE: SSTI - bio rendered without sanitization */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio (Template-Rendered)
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              rows={4}
              placeholder="Enter bio with template syntax..."
            />
            <p className="text-xs text-gray-500 mt-1">
              This field is rendered server-side with template engine. Try: {'{{7*7}}'}
            </p>
            <button
              type="button"
              onClick={handlePreviewBio}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700"
            >
              Preview Rendered Bio
            </button>
            {previewBio && (
              <div className="mt-2 p-3 bg-gray-100 rounded">
                <p className="text-sm font-medium">Rendered:</p>
                <div dangerouslySetInnerHTML={{ __html: previewBio }} />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {/* Role Display */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold mb-2">Account Type</h3>
          <p className="text-gray-600">Your current role: <span className="font-bold">{user?.role}</span></p>
        </div>
      </div>
    </div>
  )
}

export default Profile

