import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { toast } from 'react-toastify'

const Profile = () => {
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileData, setProfileData] = useState(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    phone: '',
    avatar: '',
    bio: '',
  })
  const [previewBio, setPreviewBio] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    setLoadingProfile(true)
    try {
      const response = await api.get('/users/profile')
      const profileUser = response.data.data?.user

      if (profileUser) {
        setProfileData(profileUser)
        setFormData({
          firstName: profileUser.firstName || '',
          lastName: profileUser.lastName || '',
          displayName: profileUser.displayName || '',
          phone: profileUser.phone || '',
          avatar: profileUser.avatar || '',
          bio: profileUser.bio || '',
        })
      }
    } catch (error) {
      const fallbackUser = user || null
      if (fallbackUser) {
        setProfileData(fallbackUser)
        setFormData({
          firstName: fallbackUser.firstName || '',
          lastName: fallbackUser.lastName || '',
          displayName: fallbackUser.displayName || '',
          phone: fallbackUser.phone || '',
          avatar: fallbackUser.avatar || '',
          bio: fallbackUser.bio || '',
        })
      }
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await api.put('/users/profile', formData)
      if (response.data.data?.user) {
        updateUser(response.data.data.user)
      }
      await fetchProfile()
      toast.success('Profile updated successfully!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePreviewBio = async () => {
    try {
      const response = await api.get('/users/profile/render')   
      setPreviewBio(response.data.data?.bioRendered || '')
    } catch (error) {
      setPreviewBio(formData.bio)
    }
  }

  const profile = profileData || user
  const avatarSrc = (formData.avatar || profile?.avatar || '').trim()
  const avatarInitial = (formData.displayName || profile?.displayName || formData.firstName || profile?.firstName || 'U')
    .trim()
    .charAt(0)
    .toUpperCase()

  if (loadingProfile) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="Profile avatar"
              className="w-20 h-20 rounded-full object-cover border"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold text-gray-600 border">
              {avatarInitial}
            </div>
          )}
          <div>
            <p className="font-semibold text-lg">{formData.displayName || profile?.displayName || 'User'}</p>
            <p className="text-sm text-gray-600">{profile?.email || 'N/A'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  readOnly
                  className="w-full px-3 py-2 border rounded-md bg-gray-100 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed from this form.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
                <input
                  type="text"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="https://example.com/avatar.png"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
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
                  This field is rendered server-side with template engine.
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
          </div>

          <div className="lg:col-span-1">
            <div className="border rounded-lg p-4 h-full">
              <h3 className="font-semibold mb-3">Personal Details</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700"><span className="font-medium">ID:</span> {profile?.id || 'N/A'}</p>
                <p className="text-gray-700"><span className="font-medium">Role:</span> {profile?.role || 'N/A'}</p>
                <p className="text-gray-700"><span className="font-medium">Active:</span> {String(profile?.isActive)}</p>
                <p className="text-gray-700"><span className="font-medium">Email Verified:</span> {String(profile?.isEmailVerified)}</p>
                <p className="text-gray-700"><span className="font-medium">Order Count:</span> {profile?.orderCount ?? 0}</p>
                <p className="text-gray-700"><span className="font-medium">Review Count:</span> {profile?.reviewCount ?? 0}</p>
                <p className="text-gray-700"><span className="font-medium">OAuth Accounts:</span> {profile?.oauthAccounts?.length ?? 0}</p>
                <p className="text-gray-700"><span className="font-medium">Saved Payments:</span> {profile?.savedPayments?.length ?? 0}</p>
                <p className="text-gray-700"><span className="font-medium">Created At:</span> {profile?.createdAt ? new Date(profile.createdAt).toLocaleString() : 'N/A'}</p>
                <p className="text-gray-700"><span className="font-medium">Updated At:</span> {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString() : 'N/A'}</p>
                <p className="text-gray-700 break-all"><span className="font-medium">Avatar:</span> {profile?.avatar || 'null'}</p>
                <p className="text-gray-700 break-words"><span className="font-medium">Bio:</span> {profile?.bio || 'null'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile

