import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import VendorLayout from './components/VendorLayout'
import SupportLayout from './components/SupportLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import EmailVerification from './pages/auth/EmailVerification'
import PasswordResetRequest from './pages/auth/PasswordResetRequest'
import PasswordResetForm from './pages/auth/PasswordResetForm'
import Home from './pages/Home'
import Products from './pages/products/Products'
import ProductDetail from './pages/products/ProductDetail'
import Categories from './pages/products/Categories'
import Cart from './pages/cart/Cart'
import Checkout from './pages/checkout/Checkout'
import OrderHistory from './pages/orders/OrderHistory'
import OrderDetail from './pages/orders/OrderDetail'
import InvoiceDetail from './pages/orders/InvoiceDetail'
import Profile from './pages/user/Profile'
import Addresses from './pages/user/Addresses'
import Wishlist from './pages/user/Wishlist'
import LoyaltyPoints from './pages/user/LoyaltyPoints'
import Wallet from './pages/user/Wallet'
import GiftCards from './pages/user/GiftCards'
import Returns from './pages/user/Returns'
import LinkOAuth from './pages/user/OAuthLinking'
import AccountDeletion from './pages/user/AccountDeletion'
import PaymentMethods from './pages/user/PaymentMethods'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminProducts from './pages/admin/Products'
import AdminOrders from './pages/admin/AdminOrders'
import AdminCoupons from './pages/admin/AdminCoupons'
import AdminRefunds from './pages/admin/Refunds'
import AdminVendors from './pages/admin/Vendors'
import AdminAnalytics from './pages/admin/Analytics'
import AdminLogs from './pages/admin/Logs'
import AdminBackups from './pages/admin/Backups'
import AdminFeatureFlags from './pages/admin/FeatureFlags'
import AdminWebhooks from './pages/admin/Webhooks'
import AdminInventory from './pages/admin/Inventory'
import AdminReports from './pages/admin/AdminReports'
import AdminSystemHealth from './pages/admin/AdminSystemHealth'

// Vendor Pages
import VendorDashboard from './pages/vendor/Dashboard'
import VendorProducts from './pages/vendor/Products'
import VendorOrders from './pages/vendor/Orders'
import VendorReturns from './pages/vendor/Returns'
import VendorProfile from './pages/vendor/Profile'
import VendorDiscounts from './pages/vendor/Discounts'

// Support Pages
import SupportDashboard from './pages/support/SupportDashboard'

function App() {
  const { user } = useAuth()

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* Public Routes */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:id" element={<Categories />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/forgot-password" element={<PasswordResetRequest />} />
          <Route path="/reset-password" element={<PasswordResetForm />} />
        </Route>

        {/* Protected User Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/orders/:id/invoice" element={<InvoiceDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/addresses" element={<Addresses />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/loyalty" element={<LoyaltyPoints />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/giftcards" element={<GiftCards />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/link-oauth" element={<LinkOAuth />} />
            <Route path="/payment-methods" element={<PaymentMethods />} />
            <Route path="/account-deletion" element={<AccountDeletion />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/coupons" element={<AdminCoupons />} />
            <Route path="/admin/refunds" element={<AdminRefunds />} />
            <Route path="/admin/vendors" element={<AdminVendors />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
            <Route path="/admin/backups" element={<AdminBackups />} />
            <Route path="/admin/feature-flags" element={<AdminFeatureFlags />} />
            <Route path="/admin/webhooks" element={<AdminWebhooks />} />
            <Route path="/admin/inventory" element={<AdminInventory />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/system-health" element={<AdminSystemHealth />} />
          </Route>
        </Route>

        {/* Vendor Routes */}
        <Route element={<ProtectedRoute allowedRoles={['VENDOR']} />}>
          <Route element={<VendorLayout />}>
            <Route path="/vendor/dashboard" element={<VendorDashboard />} />
            <Route path="/vendor/products" element={<VendorProducts />} />
            <Route path="/vendor/orders" element={<VendorOrders />} />
            <Route path="/vendor/returns" element={<VendorReturns />} />
            <Route path="/vendor/profile" element={<VendorProfile />} />
            <Route path="/vendor/discounts" element={<VendorDiscounts />} />
          </Route>
        </Route>

        {/* Support Routes */}
        <Route element={<ProtectedRoute allowedRoles={['SUPPORT']} />}>
          <Route element={<SupportLayout />}>
            <Route path="/support/dashboard" element={<SupportDashboard />} />
          </Route>
        </Route>

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App

