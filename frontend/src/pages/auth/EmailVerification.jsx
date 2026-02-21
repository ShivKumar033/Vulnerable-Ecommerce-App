import { useState } from 'react'
import { Link } from 'react-router-dom'

const EmailVerification = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // Mock verification email send
    setTimeout(() => {
      setSent(true)
      setLoading(false)
    }, 1000)
  }

  const handleResend = async () => {
    setLoading(true)
    setTimeout(() => {
      alert('Verification email resent!')
      setLoading(false)
    }, 1000)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold mb-4">Verification Email Sent!</h2>
          <p className="text-gray-600 mb-6">
            We've sent a verification email to your inbox. Please click the link to verify your email address.
          </p>
          <button
            onClick={handleResend}
            disabled={loading}
            className="text-primary-600 hover:text-primary-700"
          >
            {loading ? 'Sending...' : 'Resend Email'}
          </button>
          <div className="mt-6 pt-6 border-t">
            <Link to="/login" className="text-primary-600 hover:text-primary-700">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-3xl font-bold text-center mb-8">Verify Your Email</h2>
        
        <p className="text-gray-600 mb-6 text-center">
          Enter your email address and we'll send you a verification link.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Verification Email'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default EmailVerification

