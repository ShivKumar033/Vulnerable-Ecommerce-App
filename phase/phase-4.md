# Phase 4: Frontend Development

**Objective:** Build the user interface using React and integrate with the backend API.

## 4.1 Frontend Setup
**Reference:** `MASTER_PROMPT.md` -> Tech Stack

1.  **Initialize Vite Project:**
    -   Run `npm create vite@latest frontend -- --template react`.
    -   Install dependencies: `axios`, `react-router-dom`, `react-hook-form`, `styled-components` (or CSS modules as per preference/prompt).

2.  **Structure:**
    ```
    src/
    ├── components/   # Reusable UI components (Navbar, Button, Card)
    ├── pages/        # Route pages (Home, Login, ProductDetails)
    ├── context/      # AuthContext, CartContext
    ├── hooks/        # Custom hooks
    ├── api/          # Axios instance and API calls
    └── App.jsx       # Routing setup
    ```

## 4.2 Core Pages
**Reference:** `MASTER_PROMPT.md` -> Core Functionality

1.  **Public Pages:**
    -   **Home**: Featured products, categories.
    -   **Login/Register**: Forms for auth.
    -   **Product List**: Search, filter, pagination.
    -   **Product Detail**: Info, images, add to cart, reviews.

2.  **Private Pages (User):**
    -   **Cart**: View items, proceed to checkout.
    -   **Checkout**: Address form, payment mock.
    -   **Profile**: Update info, view order history.

## 4.3 Dashboard Pages (Role-Based)
**Reference:** `MASTER_PROMPT.md` -> Admin & Vendor Dashboards

1.  **Vendor Dashboard:**
    -   Manage Products (Table with CRUD actions).
    -   View Sales/Orders.
2.  **Admin Dashboard:**
    -   User Management.
    -   System-wide Order Management.

## 4.4 Integration
-   Configure Axios with base URL (`http://localhost:5000/api`).
-   Implement `AuthContext` to manage JWT storage and user state.
-   Connect all forms and actions to backend endpoints.
