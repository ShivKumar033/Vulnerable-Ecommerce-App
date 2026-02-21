import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const AccountDeletion = () => {
  const navigate = useNavigate()
  const [reason, setReason] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (confirmText !== 'DELETE') {
      alert('Please type DELETE to confirm')
      return
    }

    setLoading(true)
    try {
      await api.post('/account-deletion/request', { reason })
      setSubmitted(true)
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit deletion request')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-yellow-500 text-6xl mb-4">!</div>
          <h2 className="text-2xl font-bold mb-4">Deletion Request Submitted</h2>
          <p className="text-gray-600 mb-6">
            Your account deletion request has been submitted. You will receive an email confirmation shortly.
            Your account will be permanently deleted within 30 days unless you cancel the request.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6">Delete Account</h1>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-yellow-800">
            <strong>Warning:</strong> This action is permanent. Once your account is deleted, 
            all your data including orders, wishlist, and saved information will be 
            permanently removed and cannot be recovered.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Why are you deleting your account? (Optional)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select a reason</option>
              <option value="privacy">Privacy concerns</option>
              <option value="unused">Account unused</option>
              <option value="experience">Poor experience</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <strong>DELETE</strong> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="DELETE"
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading || confirmText !== 'DELETE'}
              className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Request Account Deletion'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AccountDeletion

