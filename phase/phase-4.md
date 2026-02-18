# Phase 4: Frontend Development

**Objective:** Build the user interface using React and integrate with the backend API.

## 4.1 Frontend Setup
**Reference:** `MASTER_PROMPT.md` -> Tech Stack

1.  **Initialize Vite Project:**
    -   Run `npm create vite@latest frontend -- --template react`.
    -   Install dependencies: `axios`, `react-router-dom`, `react-hook-form`, `styled-components` (or Tailwind CSS as per prompt requirement).

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
    -   **Home**: Featured products, categories, search, filter, pagination and other features.
    -   **Login/Register**: Forms for auth and other features.
    -   **Product List**: Search, filter, pagination and other features.
    -   **Product Detail**: Info, images, add to cart, reviews and other features.

2.  **Private Pages (User):**
    -   **Cart**: View items, proceed to checkout and other features.
    -   **Checkout**: Address form, payment mock and other features.
    -   **Profile**: Update info, view order history and other features.

## 4.3 Dashboard Pages (Role-Based)
**Reference:** `MASTER_PROMPT.md` -> Admin & Vendor Dashboards

1.  **Vendor Dashboard:**
    -   Manage Products (Table with CRUD actions and other features).
    -   View Sales/Orders and other features.
2.  **Admin Dashboard:**
    -   User Management and other features.
    -   System-wide Order Management and other features. 

## 4.4 Integration
-   Configure Axios with base URL (`http://localhost:5000/api`) and other features.
-   Implement `AuthContext` to manage JWT storage and user state and other features.
-   Connect all forms and actions to backend endpoints and other features.
