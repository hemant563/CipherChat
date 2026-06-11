# CipherChat REST API Documentation

Base URL: `https://cipher-chat-nine.vercel.app`

---

## 1. Authentication (`/auth`)

### POST `/auth/send-otp`
- **Description**: Initiates the login/registration process by sending an OTP to the user's email.
- **Body**: `{ "email": "user@example.com" }`
- **Response**: `200 OK` (Message indicating OTP sent).

### POST `/auth/verify-otp`
- **Description**: Verifies the OTP and logs the user in, returning JWT tokens.
- **Body**: `{ "email": "user@example.com", "otp": "123456" }`
- **Response**: `200 OK`
  ```json
  {
    "data": {
      "user": { "id": "...", "email": "..." },
      "accessToken": "...",
      "refreshToken": "..."
    }
  }
  ```

### POST `/auth/logout`
- **Description**: Logs the user out and revokes the refresh token.
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: `200 OK`

---

## 2. User Profiles (`/users`)
*All routes require `Authorization: Bearer <accessToken>`*

### GET `/users/me`
- **Description**: Fetches the authenticated user's profile and settings.
- **Response**: `200 OK` with user object.

### PATCH `/users/me`
- **Description**: Updates the user's profile details.
- **Body**: `{ "displayName": "New Name", "bio": "Hello World", "avatar": "cloudinary_url" }`

### PATCH `/users/me/settings`
- **Description**: Updates user preferences (privacy, notifications).
- **Body**: 
  ```json
  {
    "privacy": { "readReceipts": true },
    "notifications": { "desktopAlerts": false }
  }
  ```

### GET `/users/search?q=query`
- **Description**: Searches for other users by username or display name.

### POST `/users/block/:userId`
- **Description**: Blocks the specified user.

---

## 3. Chats & Direct Messages (`/chats`)
*All routes require `Authorization: Bearer <accessToken>`*

### GET `/chats`
- **Description**: Retrieves a list of all active conversations (DMs and Groups) for the user.

### GET `/chats/:conversationId/messages`
- **Description**: Retrieves paginated messages for a specific conversation.
- **Query Params**: `?page=1&limit=50`

### POST `/chats/:conversationId/messages`
- **Description**: Sends a new message to the conversation.
- **Body**: 
  ```json
  {
    "text": "Hello!",
    "mediaId": "optional_media_id",
    "isEphemeral": false
  }
  ```

### POST `/chats/:conversationId/toggle-lock`
- **Description**: Locks or unlocks a specific conversation (requires PIN validation).

---

## 4. Communities & Groups (`/groups`)
*All routes require `Authorization: Bearer <accessToken>`*

### GET `/groups/explore`
- **Description**: Discovers public communities available to join.

### POST `/groups`
- **Description**: Creates a new community.
- **Body**: `{ "name": "Tech Chat", "description": "Talk about tech", "isPublic": true }`

### POST `/groups/:groupId/join`
- **Description**: Sends a request to join a community.

### POST `/groups/:groupId/requests/:userId/accept`
- **Description**: Admins accept a pending join request.

---

## 5. Premium & Payments (`/premium`)
*All routes require `Authorization: Bearer <accessToken>`*

### GET `/premium/status`
- **Description**: Returns the current premium subscription status.

### POST `/payment/create-order`
- **Description**: Initiates a payment via Razorpay.
- **Body**: `{ "plan": "monthly" }`
- **Response**: Razorpay Order ID.

---

## 6. AI Features (`/ai`)
*All routes require `Authorization: Bearer <accessToken>`*

### POST `/ai/smart-replies`
- **Description**: Generates 3 contextual smart replies based on recent conversation history.
- **Body**: `{ "messages": [ { "role": "other", "content": "How are you?" } ] }`
- **Response**: `200 OK`
  ```json
  { "replies": ["I'm good!", "Not bad.", "Doing great!"] }
  ```
