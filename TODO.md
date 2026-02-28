# Fix Plan for "TypeError: X.map is not a function" Errors

## Issues Identified:

1. **Returns.jsx** - Not extracting returnRequests properly from API response
2. **Frontend defensive checks** - Need to ensure all pages properly handle empty/null data
3. **Add Product functionality** - Missing in admin Products page

## Tasks:

### Task 1: Fix Returns.jsx data extraction
- [x] Fix fetchReturns function to properly extract returnRequests from response.data.data

### Task 2: Add "Add Product" functionality to Admin Products page
- [x] Add product creation form/modal
- [x] Add handleCreateProduct function
- [x] Include proper form fields (title, price, description, stock, sku, etc.)

### Task 3: Verify fixes work correctly
- [x] Test all endpoints return proper empty arrays

