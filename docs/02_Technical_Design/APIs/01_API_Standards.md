# 01. API Standards

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | VisaLiv Employer Outreach Automation CRM |
| Document | API Standards |
| Version | 1.0 |
| Status | Frozen |
| Prepared By | VisaLiv Engineering |
| Last Updated | August 2026 |

---

# 1. Purpose

This document defines the common standards that every REST API in the project must follow.

All module APIs must comply with these standards.

---

# 2. Base URL

```
/api/v1
```

Example

```
/api/v1/students

/api/v1/employers

/api/v1/dashboard
```

---

# 3. API Style

- REST API
- JSON Request / Response
- HTTPS
- UTF-8 Encoding

---

# 4. Endpoint Naming Rules

- Use plural resource names.
- Use lowercase URLs.
- Do not use verbs in endpoints.
- Use HTTP methods to perform actions.

Examples

| Method | Endpoint |
|---------|----------|
| GET | /students |
| GET | /students/{id} |
| POST | /students |
| PUT | /students/{id} |
| PATCH | /students/{id} |
| DELETE | /students/{id} |

---

# 5. HTTP Methods

| Method | Usage |
|---------|------|
| GET | Read |
| POST | Create |
| PUT | Update |
| PATCH | Partial Update |
| DELETE | Delete |

---

# 6. Authentication

- JWT Authentication
- Access Token + Refresh Token
- Protected APIs require:

```
Authorization: Bearer <access_token>
```

---

# 7. Standard Response

## Success

```json
{
    "success": true,
    "message": "Success",
    "data": {}
}
```

---

## Error

```json
{
    "success": false,
    "message": "Validation Failed",
    "errors": []
}
```

---

# 8. Query Parameters

## Search

```
?search=rahul
```

## Filter

```
?status=active
```

## Sort

```
?sort=name

?sort=-created_at
```

## Pagination

```
?page=1&page_size=20
```

---

# 9. File Upload

Content-Type

```
multipart/form-data
```

Supported Files

- PDF
- XLSX

---

# 10. Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 500 | Internal Server Error |

---

# 11. Validation Rules

- Validate every request.
- Return meaningful error messages.
- Never trust client-side validation.

---

# 12. Security Rules

- All APIs use HTTPS.
- Protected APIs require JWT.
- Passwords must never be returned.
- Sensitive data must never be exposed.

---

# 13. Notes

- All module APIs must follow this document.
- Module-specific APIs should not redefine these standards.
- Swagger/OpenAPI documentation will be generated automatically by FastAPI.

---

# 14. Version History

| Version | Description |
|----------|-------------|
| 1.0 | Initial API Standards |