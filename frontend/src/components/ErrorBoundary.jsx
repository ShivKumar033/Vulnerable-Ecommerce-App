import { Component } from 'react'
import { Link } from 'react-router-dom'

class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
                        <div className="text-6xl mb-4">⚠️</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
                        <p className="text-gray-600 mb-6">
                            The page encountered an error. This might be due to a temporary issue.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    this.setState({ hasError: false, error: null })
                                    window.location.reload()
                                }}
                                className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition"
                            >
                                Reload Page
                            </button>
                            <Link
                                to="/"
                                onClick={() => this.setState({ hasError: false, error: null })}
                                className="block w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition"
                            >
                                Go to Home
                            </Link>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-4 text-left">
                                <summary className="text-sm text-gray-500 cursor-pointer">Error Details</summary>
                                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-red-600 overflow-auto">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
