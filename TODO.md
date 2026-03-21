# Backend Fix: Missing Auth Middleware

## Completed Steps:
- [x] Create `backend/middleware/auth.js` with `authenticateToken` and `isAdmin` middleware functions
- [x] Middleware handles JWT verification from Authorization header and sets `req.user`
- [x] `isAdmin` chains `authenticateToken` and checks `req.user.isAdmin`

## Next Steps:
- [ ] Test backend startup: `cd backend && npm start` (should start without module error)
- [ ] Test auth endpoints:
  | Endpoint | Method | Body/Example | Expected |
  |----------|--------|-------------|----------|
  | `/api/auth/signup` | POST | `{"name":"Test","email":"test@example.com","password":"password123"}` | 201, user created |
  | `/api/auth/login` | POST | `{"email":"test@example.com","password":"password123"}` | 200, token + user |
  | `/api/auth/me` | GET | Header: `Authorization: Bearer <token>` | 200, user profile |
  | `/api/orders` | GET | Header: `Authorization: Bearer <admin_token>` | 403 if not admin |
- [ ] Verify `.env` has `JWT_SECRET=your_secret_key_here`
- [ ] Backend ready for frontend integration
