# E-Commerce API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

Admin routes require JWT Bearer token authentication:
```
Authorization: Bearer <token>
```

Cart operations use the `X-Cart-Id` header:
```
X-Cart-Id: <cart-uuid>
```

---

## Public Endpoints

### Products

#### List Products
```
GET /api/products
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |
| search | string | Search in name and description |
| category | string | Filter by category slug |
| minPrice | number | Minimum price filter |
| maxPrice | number | Maximum price filter |
| sort | string | Sort field (name, price, createdAt) |
| order | string | Sort order (asc, desc) |
| featured | boolean | Filter featured products |

Response:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

#### Get Product by Slug
```
GET /api/products/:slug
```

#### Get Featured Products
```
GET /api/products/featured
```

---

### Categories

#### List Categories
```
GET /api/categories
```

#### Get Category Tree
```
GET /api/categories/tree
```

#### Get Category by Slug
```
GET /api/categories/:slug
```

---

### Cart

#### Create Cart
```
POST /api/cart
```

Response includes `cartId` to use in subsequent requests via `X-Cart-Id` header.

#### Get Cart
```
GET /api/cart
```

Headers: `X-Cart-Id: <cart-uuid>`

#### Add Item to Cart
```
POST /api/cart/items
```

Headers: `X-Cart-Id: <cart-uuid>`

Body:
```json
{
  "productId": "product-id",
  "quantity": 1
}
```

#### Update Cart Item
```
PUT /api/cart/items/:productId
```

Headers: `X-Cart-Id: <cart-uuid>`

Body:
```json
{
  "quantity": 2
}
```

#### Remove Cart Item
```
DELETE /api/cart/items/:productId
```

Headers: `X-Cart-Id: <cart-uuid>`

#### Clear Cart
```
DELETE /api/cart
```

Headers: `X-Cart-Id: <cart-uuid>`

---

### Checkout

#### Create Order (Checkout)
```
POST /api/orders/checkout
```

Headers: `X-Cart-Id: <cart-uuid>`

Body:
```json
{
  "customerName": "John Doe",
  "customerPhone": "+237699123456",
  "customerEmail": "john@example.com",
  "deliveryAddress": "123 Main St, Douala",
  "paymentMethod": "MOMO",
  "deliveryNotes": "Call on arrival"
}
```

Payment Methods: `MOMO` (Mobile Money), `COD` (Cash on Delivery)

---

### Orders

#### Track Order
```
GET /api/orders/track/:orderNumber
```

#### Get Order by ID
```
GET /api/orders/:id
```

---

### Payments

#### Initiate Payment
```
POST /api/payments/initiate
```

Body:
```json
{
  "orderId": "order-id",
  "phoneNumber": "+237699123456"
}
```

#### Payment Webhook (MTN MoMo)
```
POST /api/payments/webhook/momo
```

This endpoint is called by MTN MoMo to notify payment status.

#### Check Payment Status
```
GET /api/payments/:paymentId/status
```

---

## Admin Endpoints

All admin endpoints require authentication.

### Authentication

#### Admin Login
```
POST /api/auth/login
```

Body:
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "admin": {
      "id": "...",
      "email": "admin@example.com",
      "name": "Admin",
      "role": "ADMIN"
    }
  }
}
```

#### Get Current Admin
```
GET /api/auth/me
```

#### Change Password
```
PUT /api/auth/password
```

Body:
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

---

### Admin Products

#### List Products (Admin)
```
GET /api/admin/products
```

Query Parameters: Same as public products endpoint, plus `active` filter.

#### Create Product
```
POST /api/admin/products
```

Body:
```json
{
  "name": "Product Name",
  "description": "Product description",
  "price": 15000,
  "currency": "XAF",
  "stock": 100,
  "categoryIds": ["category-id-1", "category-id-2"],
  "images": [
    { "url": "https://...", "publicId": "...", "isPrimary": true }
  ],
  "specifications": [
    { "key": "Color", "value": "Black", "group": "General" }
  ],
  "active": true,
  "featured": false
}
```

#### Update Product
```
PUT /api/admin/products/:id
```

#### Delete Product
```
DELETE /api/admin/products/:id
```

#### Update Stock
```
PATCH /api/admin/products/:id/stock
```

Body:
```json
{
  "quantity": 50,
  "operation": "set"
}
```

Operations: `set`, `increment`, `decrement`

---

### Admin Orders

#### List Orders
```
GET /api/admin/orders
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| paymentStatus | string | Filter by payment status |
| deliveryStatus | string | Filter by delivery status |
| startDate | string | Filter from date (ISO) |
| endDate | string | Filter to date (ISO) |

#### Get Order
```
GET /api/admin/orders/:id
```

#### Update Payment Status
```
PATCH /api/admin/orders/:id/payment-status
```

Body:
```json
{
  "status": "PAID"
}
```

Statuses: `PENDING`, `PAID`, `FAILED`, `REFUNDED`

#### Update Delivery Status
```
PATCH /api/admin/orders/:id/delivery-status
```

Body:
```json
{
  "status": "IN_TRANSIT",
  "courierId": "courier-id",
  "trackingNumber": "TRK123456"
}
```

Statuses: `PENDING`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`

---

### Admin Categories

#### Create Category
```
POST /api/admin/categories
```

Body:
```json
{
  "name": "Electronics",
  "description": "Electronic devices",
  "parentId": null,
  "imageUrl": "https://..."
}
```

#### Update Category
```
PUT /api/admin/categories/:id
```

#### Delete Category
```
DELETE /api/admin/categories/:id
```

---

### Admin Upload

#### Upload Single Image
```
POST /api/admin/upload/image
```

Content-Type: `multipart/form-data`

Body:
| Field | Type | Description |
|-------|------|-------------|
| image | file | Image file (max 5MB) |
| folder | string | Cloudinary folder (optional) |
| transformation | JSON | Image transformation options |

Response:
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "products/abc123",
    "width": 800,
    "height": 600,
    "format": "jpg",
    "bytes": 125000
  }
}
```

#### Upload Multiple Images
```
POST /api/admin/upload/images
```

Content-Type: `multipart/form-data`

Body:
| Field | Type | Description |
|-------|------|-------------|
| images | files | Up to 6 image files |
| folder | string | Cloudinary folder (optional) |

#### Delete Image
```
DELETE /api/admin/upload/image
```

Body:
```json
{
  "publicId": "products/abc123"
}
```

#### Delete Multiple Images
```
DELETE /api/admin/upload/images
```

Body:
```json
{
  "publicIds": ["products/abc123", "products/def456"]
}
```

---

### Admin Reports

#### Dashboard Stats
```
GET /api/admin/reports/dashboard
```

Response:
```json
{
  "success": true,
  "data": {
    "totalOrders": 150,
    "totalRevenue": 5000000,
    "pendingOrders": 12,
    "lowStockProducts": 5,
    "recentOrders": [...],
    "topProducts": [...],
    "ordersByStatus": {...},
    "revenueByDay": [...]
  }
}
```

#### Sales Report
```
GET /api/admin/reports/sales
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | Start date (ISO) |
| endDate | string | End date (ISO) |
| groupBy | string | day, week, month |

#### Inventory Report
```
GET /api/admin/reports/inventory
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| lowStock | boolean | Filter low stock items |
| outOfStock | boolean | Filter out of stock items |

#### Orders Report
```
GET /api/admin/reports/orders
```

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | Start date (ISO) |
| endDate | string | End date (ISO) |

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [...] // Validation errors if applicable
}
```

HTTP Status Codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| General API | 100 requests / 15 minutes |
| Auth endpoints | 5 requests / 15 minutes |
| Checkout | 10 requests / 15 minutes |
| Upload | 20 requests / 15 minutes |
| Webhook | 100 requests / minute |

---

## Webhooks

### Payment Webhook

MTN MoMo sends payment notifications to:
```
POST /api/payments/webhook/momo
```

The webhook updates order payment status and triggers notifications.
