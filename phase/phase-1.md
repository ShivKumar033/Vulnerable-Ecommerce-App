# Phase 1: Project Setup & Backend Skeleton

**Objective:** Initialize the project repository, set up the backend framework, and establish the directory structure.

## 1.1 Project Initialization
- Initialize a git repository (if not already done).
- Create the root directory structure:
  ```
  /
  ├── backend/
  ├── frontend/
  ├── docs/
  └── README.md
  ```

## 1.2 Backend Configuration
**Reference:** `MASTER_PROMPT.md` -> Tech Stack & Project Structure

1.  **Initialize Node.js Project:**
    -   Run `npm init -y` inside `backend/`.
    -   Install dependencies: `express`, `cors`, `helmet`, `morgan`, `dotenv`, `cookie-parser`, `multer`.
    -   Install dev dependencies: `nodemon`.

2.  **Directory Structure:**
    Create the following structure inside `backend/src/`:
    ```
    src/
    ├── config/       # Database and app config
    ├── models/       # Database models
    ├── routes/       # API routes
    ├── controllers/  # Request handlers
    ├── services/     # Business logic
    ├── middlewares/  # Auth, logging, error handling
    ├── utils/        # Helper functions
    ├── app.js        # Express app setup
    └── server.js     # Server entry point
    ```

3.  **Basic Server Setup:**
    -   **`src/app.js`**: Setup Express, middleware (CORS, JSON body parser), and a health check route (`/api/health`).
    -   **`src/server.js`**: Import `app` and start listening on port 5000 (or env variable).

4.  **Environment Variables:**
    -   Create `.env.example` in `backend/` with keys for:
        -   `PORT`
        -   `DATABASE_URL`
        -   `JWT_SECRET` (Use a weak secret for now or prepare for later)
        -   `NODE_ENV`

## 1.3 Validation
-   Run `npm run dev` in `backend/`.
-   Verify `http://localhost:5000/api/health` returns `200 OK`.
