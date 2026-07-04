# Kraviona Backend API Guide

Current backend base path:

```txt
Local: http://localhost:5000/api/v1
Production: https://api.kraviona.com/api/v1
```

General rules:

- JSON endpoints use `Content-Type: application/json`.
- Authenticated endpoints use the `accessToken` httpOnly cookie.
- Frontend requests to protected routes should use `credentials: "include"`.
- Public create endpoints for messages/leads do not return saved private data.
- Admin-only data must not be shown unless the logged-in user role is allowed.

Frontend fetch pattern:

```js
await fetch("http://localhost:5000/api/v1/me", {
  method: "GET",
  credentials: "include"
});
```

## Role Summary

User roles in the auth model:

```txt
super_admin, admin, editor, viewer, user
```

Common access rules in this backend:

```txt
Public: no login required
Authenticated: any valid logged-in user
Content manager: editor, admin, super_admin
Admin manager: admin, super_admin
```

## Endpoint Overview

| Module | Method | Path | Auth |
|---|---:|---|---|
| Auth | POST | `/create-account` | Public |
| Auth | POST | `/login` | Public |
| Auth | GET | `/me` | Authenticated |
| Auth | POST | `/auth/logout` | Authenticated |
| Categories | POST | `/create-category` | Authenticated, not `user` |
| Categories | GET | `/categories` | Public |
| Categories | GET | `/categories/all` | admin, super_admin, editor |
| Categories | GET | `/category/:id` | Public |
| Categories | PUT | `/category/:id` | Authenticated |
| Categories | DELETE | `/category/:id` | Authenticated |
| Posts | POST | `/create-post` | editor, admin, super_admin |
| Posts | GET | `/public/posts` | Public |
| Posts | GET | `/post/:slug` | Public |
| Posts | GET | `/private/posts` | editor, admin, super_admin |
| Posts | GET | `/private/post/:id` | Authenticated owner/admin |
| Posts | PATCH | `/post/:id` | Authenticated owner/admin |
| Posts | DELETE | `/post/:id` | Authenticated owner/admin |
| Media | POST | `/media/upload` | Authenticated, not `user` |
| Media | GET | `/media/me` | Authenticated |
| Newsletter | POST | `/newslatter` | Public |
| Newsletter | GET | `/newslatter` | admin, super_admin |
| Newsletter | DELETE | `/newslatter/:id` | admin, super_admin |
| Messages | POST | `/messages` | Public |
| Messages | GET | `/messages` | admin, super_admin |
| Messages | GET | `/messages/:id` | admin, super_admin |
| Messages | PATCH | `/messages/:id` | admin, super_admin |
| Messages | DELETE | `/messages/:id` | admin, super_admin |
| Leads | POST | `/leads` | Public |
| Leads | GET | `/leads` | admin, super_admin |
| Leads | GET | `/leads/:id` | admin, super_admin |
| Leads | PATCH | `/leads/:id` | admin, super_admin |
| Leads | DELETE | `/leads/:id` | admin, super_admin |

## Auth APIs

### Create Account

```txt
POST /api/v1/create-account
Auth: Public
```

Request:

```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "username": "adminuser",
  "phone": "9876543210",
  "password": "Password@123",
  "role": "admin"
}
```

Required fields:

```txt
name, email, username, phone, password
```

Password rule:

```txt
Minimum 8 characters, one uppercase, one lowercase, one number, one special character.
```

Response:

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "id": "userId",
    "name": "Admin User",
    "email": "admin@example.com",
    "username": "adminuser",
    "phone": "9876543210",
    "role": "admin",
    "isVerified": false,
    "isActive": true
  }
}
```

Important:

- New users are created with `isVerified: false`.
- Current login controller blocks unverified users.
- OTP is currently logged to server console during account creation.

### Login

```txt
POST /api/v1/login
Auth: Public
```

Request:

```json
{
  "identifier": "admin@example.com",
  "password": "Password@123"
}
```

`identifier` can be email, username, or phone.

Response sets the `accessToken` cookie and returns user data.

### Get Me

```txt
GET /api/v1/me
Auth: Authenticated
```

Frontend:

```js
fetch("/api/v1/me", { credentials: "include" });
```

### Logout

```txt
POST /api/v1/auth/logout
Auth: Authenticated
```

Clears the auth cookie.

## Category APIs

### Create Category

```txt
POST /api/v1/create-category
Auth: Authenticated, role cannot be user
```

Request:

```json
{
  "name": "Technology",
  "description": "Latest technology articles",
  "slug": "technology",
  "status": "published",
  "metaTitle": "Technology",
  "metaDescription": "Technology articles",
  "metaKeywords": ["technology", "mern"],
  "canonicalUrl": "https://kraviona.com/blog/category/technology",
  "ogTitle": "Technology",
  "ogDescription": "Technology articles",
  "ogImage": "https://example.com/og.jpg",
  "twitterTitle": "Technology",
  "twitterDescription": "Technology articles",
  "twitterImage": "https://example.com/twitter.jpg"
}
```

Required fields:

```txt
name, description, slug
```

Allowed status:

```txt
published, draft, archived
```

### Get Public Categories

```txt
GET /api/v1/categories
Auth: Public
```

Returns only categories with `status: "published"`.

### Get All Categories

```txt
GET /api/v1/categories/all
Auth: admin, super_admin, editor
```

Query parameters:

```txt
status=published
search=tech
page=1
limit=10
```

Note: this controller currently filters by `userID: req.user.id`, so users only see categories attached to their user id.

### Get Category By ID Or Slug

```txt
GET /api/v1/category/:id
Auth: Public
```

`:id` can be a Mongo id or category slug.

### Update Category

```txt
PUT /api/v1/category/:id
Auth: Authenticated
```

Body can include the same fields as create. The controller does not currently restrict by role beyond valid auth.

### Delete Category

```txt
DELETE /api/v1/category/:id
Auth: Authenticated
```

Delete is blocked if `postCount > 0`.

## Blog Post APIs

### Create Post

```txt
POST /api/v1/create-post
Auth: editor, admin, super_admin
```

Minimum request:

```json
{
  "title": "How MERN Stack Development Helps Businesses Scale",
  "content": "Full article content goes here...",
  "excerpt": "Short article summary.",
  "primaryTopicCluster": "MERN Stack Development",
  "category": "technology",
  "featuredImage": {
    "url": "https://example.com/featured.jpg",
    "altText": "MERN stack development"
  }
}
```

Required fields:

```txt
title, content, excerpt, primaryTopicCluster, category, featuredImage.url
```

Optional important fields:

```txt
slug, quickAnswer, keyTakeaways, tableOfContents, supportingTopicClusters,
tags, gallery, videoEmbedded, metaTitle, metaDescription, keywords,
focusKeywords, semanticKeywords, canonicalUrl, isNoIndex, isNoFollow,
schemaType, structuredDataOverride, language, alternateLanguageVersions,
ogTitle, ogDescription, ogImage, twitterTitle, twitterDescription,
twitterCard, faqSchema, sources, statistics, relatedPosts,
isAccessibleForFree, status, contentSourceType, isCommentEnabled
```

Allowed `status`:

```txt
published, draft, archived, scheduled
```

Allowed `schemaType`:

```txt
BlogPosting, Article, NewsArticle, HowTo, Review, FAQPage
```

Allowed `contentSourceType`:

```txt
Human, AI-Assisted, AI-Generated
```

Notes:

- If `slug` is not sent, it is generated from `title`.
- Category lookup matches a published category by name or slug.
- `publishedAt` is auto-set when a post becomes `published`.
- `wordCount` and `readingTimeMinutes` are calculated from content.

### Public Post List

```txt
GET /api/v1/public/posts
Auth: Public
```

Query parameters:

```txt
page=1
limit=10
```

Returns only `published` posts and a compact card projection.

### Public Single Post

```txt
GET /api/v1/post/:slug
Auth: Public
```

Returns only a `published` post and increments `views`.

### Private Post List

```txt
GET /api/v1/private/posts
Auth: editor, admin, super_admin
```

Query parameters:

```txt
page=1
limit=20
```

Admin and super admin see all posts. Editors see their own posts.

### Private Single Post

```txt
GET /api/v1/private/post/:id
Auth: Authenticated owner, admin, super_admin
```

Returns full post document for editor UI.

### Update Post

```txt
PATCH /api/v1/post/:id
Auth: Authenticated owner, admin, super_admin
```

Body can be partial:

```json
{
  "title": "Updated blog title",
  "status": "published",
  "metaDescription": "Updated SEO description"
}
```

Notes:

- Admin and super admin can update any post.
- Other authenticated users can update only their own post.
- Slug uniqueness is checked if title or slug changes.
- Category is re-validated only if `category` is sent.

### Delete Post

```txt
DELETE /api/v1/post/:id
Auth: Authenticated owner, admin, super_admin
```

Admin and super admin can delete any post. Other authenticated users can delete only their own post.

## Media APIs

### Upload Media

```txt
POST /api/v1/media/upload
Auth: Authenticated, role cannot be user
Content-Type: multipart/form-data
```

Form field:

```txt
file
```

Supports up to 10 files because the route uses:

```js
upload.array("file", 10)
```

Example:

```bash
curl -X POST http://localhost:5000/api/v1/media/upload \
  -b "accessToken=<token>" \
  -F "file=@/path/to/image.jpg"
```

Response:

```json
{
  "success": true,
  "message": "Media uploaded successfully.",
  "count": 1,
  "data": [
    {
      "fileName": "generated-name.jpg",
      "originalName": "image.jpg",
      "fileUrl": "https://res.cloudinary.com/...",
      "publicId": "kravionatech/...",
      "mimeType": "image/jpeg",
      "mediaType": "image"
    }
  ]
}
```

### Get My Media

```txt
GET /api/v1/media/me
Auth: Authenticated
```

Query parameters:

```txt
page=1
limit=25
```

Returns media uploaded by the current user where `isDeleted: false`.

## Newsletter APIs

The route spelling is currently `newslatter`.

### Create Subscriber

```txt
POST /api/v1/newslatter
Auth: Public
```

Request:

```json
{
  "email": "subscriber@example.com"
}
```

Response:

```json
{
  "message": "Subscriber created successfully",
  "success": true,
  "data": {
    "email": "subscriber@example.com",
    "status": "subscriber"
  }
}
```

Duplicate email returns:

```json
{
  "message": "Subscriber already exits"
}
```

### List Subscribers

```txt
GET /api/v1/newslatter
Auth: admin, super_admin
```

### Delete Subscriber

```txt
DELETE /api/v1/newslatter/:id
Auth: admin, super_admin
```

## Contact Message APIs

Use this for the normal website contact form.

### Create Message

```txt
POST /api/v1/messages
Auth: Public
```

Contact form body:

```json
{
  "firstName": "User",
  "lastName": "Name",
  "email": "user@example.com",
  "phone": "+919608553167",
  "subject": "Project inquiry",
  "message": "I want to discuss a MERN stack project."
}
```

Alternative accepted body:

```json
{
  "name": "User Name",
  "email": "user@example.com",
  "phone": "+919608553167",
  "subject": "Project inquiry",
  "message": "I want to discuss a MERN stack project."
}
```

Response:

```json
{
  "message": "Message created successfully",
  "success": true
}
```

### List Messages

```txt
GET /api/v1/messages
Auth: admin, super_admin
```

Query parameters:

```txt
status=unread
search=user@example.com
page=1
limit=10
```

Allowed status:

```txt
unread, read, replied, archived
```

### Get Message

```txt
GET /api/v1/messages/:id
Auth: admin, super_admin
```

### Update Message

```txt
PATCH /api/v1/messages/:id
Auth: admin, super_admin
```

Example:

```json
{
  "status": "read"
}
```

### Delete Message

```txt
DELETE /api/v1/messages/:id
Auth: admin, super_admin
```

## Lead APIs

Use this for service popup leads, service page lead capture, and sales pipeline entries.

### Create Lead

```txt
POST /api/v1/leads
Auth: Public
```

Request:

```json
{
  "name": "User full name",
  "email": "user@example.com",
  "phone": "+919608553167",
  "subject": "Lead Inquiry: MERN Stack Development",
  "message": "Service: MERN Stack Development\nBudget: Need guidance\nCompany: Company Name\n\nUser requirement\n\nLead source: current page URL",
  "leadType": "service-popup",
  "page": "/services/mern-stack-development",
  "service": "MERN Stack Development",
  "budget": "Need guidance",
  "company": "Company Name"
}
```

Required fields:

```txt
name, email, phone, subject, message
```

Optional fields:

```txt
leadType, page, service, budget, company
```

Response:

```json
{
  "message": "Lead created successfully",
  "success": true
}
```

### List Leads

```txt
GET /api/v1/leads
Auth: admin, super_admin
```

Query parameters:

```txt
status=New
source=Website
leadType=service-popup
service=MERN Stack Development
search=user@example.com
page=1
limit=10
```

Allowed lead status:

```txt
New, Contacted, Qualified, Proposal, Won, Lost
```

Allowed source:

```txt
Website, LinkedIn, Referral, Cold Email, Inbound, Social Media, Other
```

### Get Lead

```txt
GET /api/v1/leads/:id
Auth: admin, super_admin
```

### Update Lead

```txt
PATCH /api/v1/leads/:id
Auth: admin, super_admin
```

Body can be partial:

```json
{
  "status": "Contacted",
  "score": 70,
  "notes": "Called once. Asked for proposal.",
  "dealValue": 50000,
  "currency": "INR"
}
```

Editable fields:

```txt
name, email, phone, company, designation, subject, message, leadType,
page, service, budget, status, source, score, dealValue, currency,
expectedCloseDate, assignedTo, notes, tags, isArchived, lostReason
```

### Delete Lead

```txt
DELETE /api/v1/leads/:id
Auth: admin, super_admin
```

## Response And Error Shape

Most successful responses follow:

```json
{
  "success": true,
  "message": "Action completed",
  "data": {}
}
```

Common errors:

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

HTTP status usage:

```txt
200 OK
201 Created
400 Validation or missing required field
401 Unauthorized or invalid token
403 Forbidden role
404 Not found
409 Duplicate resource
500 Server error
```

## Frontend Agent Checklist

1. Use `/api/v1/messages` only for normal contact forms.
2. Use `/api/v1/leads` for service popup and service page leads.
3. Use `/api/v1/newslatter` for newsletter subscription.
4. Do not send auth for public create endpoints.
5. Always use `credentials: "include"` for protected dashboard/editor requests.
6. Do not display messages, leads, or subscribers unless user role is `admin` or `super_admin`.
7. For blog create/edit, upload media first if an image URL is needed, then use the returned `fileUrl` as `featuredImage.url`.
8. For public blog pages, use `/public/posts` for lists and `/post/:slug` for details.
9. For editor/admin blog screens, use `/private/posts` and `/private/post/:id`.
10. Show `response.message` directly for validation failures.

## Quick Curl Examples

Create a lead:

```bash
curl -X POST http://localhost:5000/api/v1/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name":"User full name",
    "email":"user@example.com",
    "phone":"+919608553167",
    "subject":"Lead Inquiry: MERN Stack Development",
    "message":"Service: MERN Stack Development\nBudget: Need guidance\nCompany: Company Name\n\nUser requirement\n\nLead source: current page URL",
    "leadType":"service-popup",
    "page":"/services/mern-stack-development",
    "service":"MERN Stack Development",
    "budget":"Need guidance",
    "company":"Company Name"
  }'
```

Create a message:

```bash
curl -X POST http://localhost:5000/api/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"User",
    "lastName":"Name",
    "email":"user@example.com",
    "phone":"+919608553167",
    "subject":"Project inquiry",
    "message":"I want to discuss a MERN stack project."
  }'
```

Subscribe newsletter:

```bash
curl -X POST http://localhost:5000/api/v1/newslatter \
  -H "Content-Type: application/json" \
  -d '{"email":"subscriber@example.com"}'
```
