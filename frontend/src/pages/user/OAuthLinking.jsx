import { useState } from 'react'
import api from '../../services/api'

const OAuthLinking = () => {
  const [linking, setLinking] = useState(false)
  const [linkedAccounts, setLinkedAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch linked OAuth accounts
  const fetchLinkedAccounts = async () => {
    setLoading(true)
    try {
      // This would typically fetch from user profile or a dedicated endpoint
      const response = await api.get('/users/profile')
      setLinkedAccounts(response.data.oauthAccounts || [])
    } catch (error) {
      console.error('Error fetching linked accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  // VULNERABLE: OAuth redirect_uri validation bypass
  const handleLinkGoogle = () => {
    // VULNERABLE: No state parameter, vulnerable to CSRF
    // VULNERABLE: redirect_uri can be manipulated
    const redirectUri = window.location.origin + '/auth/google/link/callback'
    window.location.href = `/api/v1/auth/google/link?redirect_uri=${encodeURIComponent(redirectUri)}`
  }

  const handleUnlink = async (accountId) => {
    if (!confirm('Are you sure you want to unlink this account?')) return
    try {
      // VULNERABLE: IDOR - no ownership check
      await api.delete(`/api/v1/auth/oauth/unlink/${accountId}`)
      alert('Account unlinked!')
      fetchLinkedAccounts()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to unlink account')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Link OAuth Accounts</h1>

      {/* VULNERABLE: OAuth account linking without re-authentication */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Link Google Account</h2>
        <p className="text-gray-600 mb-4">
          Link your Google account for easier login and account recovery.
        </p>
        
        {/* VULNERABLE: Missing re-authentication requirement */}
        <button
          onClick={handleLinkGoogle}
          disabled={linking}
          className="flex items-center justify-center w-full bg-white border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Link Google Account
        </button>
        
        <p className="text-xs text-gray-500 mt-4">
          Note: Linking your account will allow login via Google. Make sure you trust this feature.
        </p>
      </div>

      {/* Linked Accounts */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Linked Accounts</h2>
        
        {loading ? (
          <p>Loading...</p>
        ) : linkedAccounts.length === 0 ? (
          <p className="text-gray-500">No accounts linked yet</p>
        ) : (
          <div className="space-y-4">
            {linkedAccounts.map((account, idx) => (
              <div key={idx} className="flex justify-between items-center border-b pb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">Google</span>
                  <span className="text-gray-600">{account.email}</span>
                </div>
                <button
                  onClick={() => handleUnlink(account.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Unlink
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default OAuthLinking

