import { useState, useEffect } from 'react'
import api from '../../services/api'

const VendorProfile = () => {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: '',
    displayName: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [renderedBio, setRenderedBio] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/vendor/profile')
      setProfile({
        name: response.data.name || '',
        email: response.data.email || '',
        bio: response.data.bio || '',
        displayName: response.data.displayName || ''
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/vendor/profile', profile)
      alert('Profile updated!')
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  // VULNERABLE: Renders bio without sanitization (SSTI)
  const handleRenderBio = async () => {
    try {
      const response = await api.get('/vendor/profile/render')
      setRenderedBio(response.data.rendered || '')
    } catch (error) {
      alert('Failed to render bio')
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
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">Vendor Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Display Name</label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-3 py-2 border rounded-md bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Bio (SSTI Vulnerable - Use template syntax)
              </label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                rows={4}
                placeholder="Use template syntax like {{7*7}} or {% for %}"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supports template syntax - try {"{{7*7}}"} or {"{% raw %}{% endraw %}"}
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Bio Preview */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Bio Preview</h2>
            <button
              onClick={handleRenderBio}
              className="text-primary-600 hover:text-primary-700 text-sm"
            >
              Render (Vulnerable)
            </button>
          </div>
          
          <div className="border rounded-md p-4 min-h-[200px] bg-gray-50">
            {renderedBio ? (
              <div dangerouslySetInnerHTML={{ __html: renderedBio }} />
            ) : (
              <p className="text-gray-500">
                Click "Render" to see how your bio will be displayed (vulnerable to XSS/SSTI)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VendorProfile

