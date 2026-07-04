# Kraviona Backend API

Main API guide for current contact message and lead endpoints:

- [API_GUIDE.md](./API_GUIDE.md)
- Served browser docs: `/api-docs`

---

# Category API Guidelines

**Base URL:** `/api/v1/blog`  
**Auth:** Bearer Token required on protected routes (`verifyToken` middleware)

---

## Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/create-category` | ✅ Required | Create new category |
| GET | `/categories` | ❌ Public | Get all published categories |
| GET | `/categories/all` | ✅ Required | Get all categories (admin) |
| GET | `/category/:id` | ❌ Public | Get single category by ID or slug |
| PUT | `/category/:id` | ✅ Required | Update category |
| DELETE | `/category/:id` | ✅ Required | Delete category |

---

## 1. Create Category

**POST** `/api/v1/blog/create-category`  
**Auth:** Required

### Request Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body
```json
{
  "name": "technology",
  "description": "All about tech trends and news",
  "slug": "technology",
  "status": "published",
  "metaTitle": "Technology News",
  "metaDescription": "Latest tech news and updates",
  "metaKeywords": ["tech", "ai", "software"],
  "canonicalUrl": "https://example.com/blog/technology",
  "ogTitle": "Technology",
  "ogDescription": "Tech news",
  "ogImage": "https://example.com/og.jpg",
  "twitterTitle": "Technology",
  "twitterDescription": "Tech news",
  "twitterImage": "https://example.com/twitter.jpg"
}
```

### Required Fields
| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Category name (unique) |
| `description` | String | Category description |
| `slug` | String | URL slug (unique) |

### Optional Fields
| Field | Type | Default |
|-------|------|---------|
| `status` | `published` \| `draft` | `published` |
| `metaTitle` | String | `""` |
| `metaDescription` | String | `""` |
| `metaKeywords` | Array | `[]` |
| `canonicalUrl` | String | `""` |
| `ogTitle` | String | `""` |
| `ogDescription` | String | `""` |
| `ogImage` | String | `""` |
| `twitterTitle` | String | `""` |
| `twitterDescription` | String | `""` |
| `twitterImage` | String | `""` |

### Responses

**201 Created**
```json
{
  "message": "Category created successfully",
  "success": true,
  "data": { ...categoryObject }
}
```

**400 Bad Request** — missing required field  
**401 Unauthorized** — no/invalid token  
**404 Not Found** — user not found  
**409 Conflict** — name or slug already exists  
**500 Internal Server Error**

---

## 2. Get Published Categories

**GET** `/api/v1/blog/categories`  
**Auth:** Not required

### Response

**200 OK**
```json
{
  "message": "Categories found",
  "success": true,
  "data": [ ...categories ]
}
```

**200 OK** (empty)
```json
{
  "message": "No categories found",
  "success": true,
  "data": []
}
```

> Returns only `status: "published"` categories. `__v` field is excluded.

---

## 3. Get All Categories (Admin)

**GET** `/api/v1/blog/categories/all`  
**Auth:** Required

### Query Parameters
| Param | Type | Description |
|-------|------|-------------|
| `status` | `published` \| `draft` | Filter by status |
| `search` | String | Search by name or slug |
| `page` | Number | Page number (default: `1`) |
| `limit` | Number | Items per page (default: `10`) |

### Example Request
```
GET /api/v1/blog/categories/all?status=published&search=tech&page=1&limit=10
Authorization: Bearer <token>
```

### Response

**200 OK**
```json
{
  "message": "Categories fetched successfully",
  "success": true,
  "data": [ ...categories ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

**401 Unauthorized** — no/invalid token

---

## 4. Get Single Category

**GET** `/api/v1/blog/category/:id`  
**Auth:** Not required

### URL Parameter
| Param | Description |
|-------|-------------|
| `:id` | MongoDB ObjectId **or** slug string |

### Example Requests
```
GET /api/v1/blog/category/64f1a2b3c4d5e6f7a8b9c0d1
GET /api/v1/blog/category/technology
```

### Response

**200 OK**
```json
{
  "message": "Category found",
  "success": true,
  "data": { ...categoryObject }
}
```

**404 Not Found** — category doesn't exist

---

## 5. Update Category

**PUT** `/api/v1/blog/category/:id`  
**Auth:** Required

### Request Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body

All fields are optional — send only what needs to be updated.

```json
{
  "name": "tech-news",
  "description": "Updated description",
  "slug": "tech-news",
  "status": "draft",
  "metaTitle": "Updated Meta Title"
}
```

### Notes
- Partial updates supported — only passed fields will be updated
- `name` and `slug` uniqueness is validated against other documents (excluding current)

### Responses

**200 OK**
```json
{
  "message": "Category updated successfully",
  "success": true,
  "data": { ...updatedCategory }
}
```

**401 Unauthorized**  
**404 Not Found** — category doesn't exist  
**409 Conflict** — name or slug already in use by another category

---

## 6. Delete Category

**DELETE** `/api/v1/blog/category/:id`  
**Auth:** Required

### Example Request
```
DELETE /api/v1/blog/category/64f1a2b3c4d5e6f7a8b9c0d1
Authorization: Bearer <token>
```

### Responses

**200 OK**
```json
{
  "message": "Category deleted successfully",
  "success": true
}
```

**400 Bad Request** — category has posts attached
```json
{
  "message": "Cannot delete — category has 5 post(s) attached",
  "success": false
}
```

**401 Unauthorized**  
**404 Not Found**

---

## Error Format

All error responses follow this structure:

```json
{
  "message": "Error description",
  "success": false
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad Request — validation failed |
| 401 | Unauthorized — missing or invalid token |
| 404 | Not Found — resource doesn't exist |
| 409 | Conflict — duplicate name or slug |
| 500 | Internal Server Error |

---

## Category Object Structure

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "name": "technology",
  "description": "All about tech trends",
  "slug": "technology",
  "status": "published",
  "postCount": 0,
  "metaTitle": "",
  "metaDescription": "",
  "metaKeywords": [],
  "canonicalUrl": "",
  "ogTitle": "",
  "ogDescription": "",
  "ogImage": "",
  "twitterTitle": "",
  "twitterDescription": "",
  "twitterImage": "",
  "userID": "64f1a2b3c4d5e6f7a8b9c0d2",
  "authorDetails": {
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "username": "johndoe"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

# Media API Documentation

Base URL

```
http://localhost:5000/api/v1
```

Authentication

> All Media APIs require a valid JWT Access Token.

Header

```http
Authorization: Bearer <access_token>
```

---

# 1. Upload Media

**Endpoint**

```http
POST /media/upload
```

**Content-Type**

```http
multipart/form-data
```

### Request Body

| Key | Type | Required | Description |
|------|------|----------|-------------|
| file | File | Yes | Single or Multiple Media Files |

Example (Postman)

```text
Body
form-data

file : image1.jpg
file : image2.png
file : video.mp4
```

### Success Response

```json
{
  "success": true,
  "message": "Media uploaded successfully.",
  "count": 3,
  "data": [
    {
      "_id": "686f0d9d1c82c2a1ef98a213",
      "fileName": "file-175000000.jpg",
      "originalName": "photo.jpg",
      "fileUrl": "/uploads/images/file-175000000.jpg",
      "mimeType": "image/jpeg",
      "mediaType": "image",
      "fileSize": 154345
    }
  ]
}
```

---

# 2. Get All Media

Returns logged-in user's media.

**Endpoint**

```http
GET /media?page=1&limit=10
```

### Query Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| page | 1 | Current Page |
| limit | 10 | Records Per Page |

### Success Response

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "totalItems": 35,
    "currentPage": 1,
    "perPage": 10,
    "totalPages": 4,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

# 3. Get Single Media

**Endpoint**

```http
GET /media/:id
```

Example

```http
GET /media/686f0d9d1c82c2a1ef98a213
```

### Success Response

```json
{
  "success": true,
  "data": {
    "_id": "686f0d9d1c82c2a1ef98a213",
    "fileName": "file-175000000.jpg",
    "originalName": "photo.jpg",
    "fileUrl": "/uploads/images/file-175000000.jpg",
    "mimeType": "image/jpeg",
    "mediaType": "image",
    "fileSize": 154345
  }
}
```

---

# 4. Update Media

Update media metadata.

**Endpoint**

```http
PUT /media/:id
```

### Request Body

```json
{
  "altText": "Beautiful Dubai Skyline"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Media updated successfully."
}
```

---

# 5. Delete Media

Deletes media file and database record.

**Endpoint**

```http
DELETE /media/:id
```

Example

```http
DELETE /media/686f0d9d1c82c2a1ef98a213
```

### Success Response

```json
{
  "success": true,
  "message": "Media deleted successfully."
}
```

---

# Media Types

| MIME Type | Stored As |
|-----------|-----------|
| image/jpeg | image |
| image/png | image |
| image/webp | image |
| image/gif | image |
| video/mp4 | video |
| video/webm | video |
| video/x-matroska | video |
| audio/mpeg | audio |
| application/pdf | document |
| application/msword | document |
| application/vnd.openxmlformats-officedocument.wordprocessingml.document | document |
| application/vnd.ms-excel | document |
| application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | document |

---

# Error Response

```json
{
  "success": false,
  "message": "Choose at least one media file."
}
```

```json
{
  "success": false,
  "message": "Media not found."
}
```

```json
{
  "success": false,
  "message": "Unauthorized."
}
```

```json
{
  "success": false,
  "message": "Internal Server Error."
}
```

---

# Folder Structure

```
public/
└── uploads/
    ├── images/
    ├── videos/
    ├── audio/
    ├── documents/
    └── others/
```

---

# Supported Uploads

- Images
  - JPG
  - PNG
  - WEBP
  - GIF

- Videos
  - MP4
  - WEBM
  - MKV
  - MOV

- Audio
  - MP3
  - WAV

- Documents
  - PDF
  - DOC
  - DOCX
  - XLS
  - XLSX
  - PPT
  - PPTX
  - TXT

---

# Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Server Error |
