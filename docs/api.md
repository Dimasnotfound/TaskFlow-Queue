# API Notes

All protected endpoints use:

```txt
Authorization: Bearer <accessToken>
```

Create job supports duplicate prevention:

```txt
Idempotency-Key: invoice-INV-001
```

Standard success response:

```json
{ "success": true, "message": "...", "data": {} }
```

Standard error response:

```json
{ "success": false, "message": "...", "error": { "code": "..." } }
```
