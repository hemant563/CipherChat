# CipherChat Technical Documentation

This document provides a comprehensive technical overview of the CipherChat application, covering the system architecture, directory structure, core workflows, and development setup instructions.

---

## 1. System Architecture

CipherChat is structured as a decoupled application with a distinct frontend and backend, communicating via REST APIs for standard CRUD operations and WebSockets for real-time interactivity.

### Tech Stack
*   **Frontend**: Angular 17/18+ (using Signals for state management), Tailwind CSS, TypeScript.
*   **Backend**: Node.js, Express.js.
*   **Real-time Engine**: Socket.io.
*   **Database**: MongoDB (Mongoose ORM).
*   **Authentication**: Passwordless Email OTP via Brevo API, JWT for session management.
*   **Media Storage**: Cloudinary via Multer.
*   **Payment Gateway**: Razorpay (for Premium subscriptions).
*   **AI Integration**: Google Gemini 2.5 Flash API (`@google/genai`).

---

## 2. Directory Structure

### `Frontend/` (Angular Client)
*   **`src/app/`**
    *   **`components/`**: Reusable UI elements (TopAppBar, Toast, CallModal, ParticleBg).
    *   **`pages/`**: Routable views (LandingPage, ChatDashboard, ProfileSettings, PremiumPlans, CallsDashboard, ExploreCommunities).
    *   **`services/`**: Injectable Angular services handling API calls and state (AuthService, ChatService, SocketService, WebRTCService, UserService, ToastService).
    *   **`interfaces/`**: TypeScript type definitions.
    *   **`interceptors/`**: HTTP interceptors (e.g., attaching JWT tokens to requests).
    *   **`guards/`**: Route guards (`auth.guard.ts`) to protect private routes.

### `server/` (Node.js API)
*   **`src/`**
    *   **`controllers/`**: Core business logic mapping to routes.
    *   **`models/`**: Mongoose schemas (User, Message, Group, Call, Media).
    *   **`routes/`**: Express route definitions.
    *   **`middlewares/`**: Express middlewares (Auth validation, rate limiters, Multer uploads).
    *   **`services/`**: Dedicated utility services (`ai.service.js` for Gemini, `email.service.js` for Brevo).
    *   **`sockets/`**: Socket.io event listeners and emitters.
    *   **`config/`**: Environment variable bindings and database connection logic.

---

## 3. Core Workflows

### 3.1 Authentication Flow (Passwordless)
1.  **Request**: User enters email on the frontend.
2.  **Generate**: Backend (`auth.controller.js`) generates a random 6-digit OTP, stores it hashed in MongoDB, and sends it via Brevo SMTP.
3.  **Verify**: User enters OTP. Backend verifies the hash, generates short-lived `accessToken` and long-lived `refreshToken`, and returns them to the client.
4.  **Session**: Frontend `AuthService` stores the tokens in `localStorage` and uses an interceptor to attach the `accessToken` to subsequent requests.

### 3.2 Real-Time Messaging Flow
1.  **Connection**: Upon login, the client establishes a Socket.io connection.
2.  **Rooms**: The server assigns the user to private socket rooms corresponding to their `userId` and active `conversationId`s.
3.  **Sending**: A user sends a message. The frontend emits `send_message`.
4.  **Broadcast**: The backend saves the message to MongoDB and broadcasts `receive_message` strictly to the specific `conversationId` room.
5.  **Reactivity**: The receiving client's `SocketService` captures the event, updates the Angular Signal state, and the UI reacts instantly.

### 3.3 Audio/Video Calling (WebRTC)
1.  **Signaling**: A user clicks the call button. The client emits a `call_initiate` socket event.
2.  **Offer/Answer**: The backend relays WebRTC signaling data (SDP offers/answers and ICE candidates) between the Caller and Callee via `call_signal`.
3.  **P2P Connection**: Once signaling is complete, a direct Peer-to-Peer connection is established between the browsers. Audio/video streams bypass the server entirely, ensuring privacy and low latency.

### 3.4 AI Smart Replies
1.  **Trigger**: When the frontend detects recent incoming messages, it optionally hits the `/ai/smart-replies` endpoint.
2.  **Prompt**: The backend `AiService` sends the last few messages to the Gemini 2.5 Flash API with strict instructions to return a JSON array of exactly 3 short responses.
3.  **Fallback**: If the Gemini API fails or times out, a local keyword-matching algorithm (Regex) acts as a fallback to ensure the UI still populates suggestions.

---

## 4. Development & Setup

### Prerequisites
*   Node.js (v18+)
*   Angular CLI (`npm i -g @angular/cli`)
*   MongoDB Instance (Local or Atlas)

### Backend Setup
1.  Navigate to the `server/` directory.
2.  Run `npm install`.
3.  Create a `.env` file based on `.env.example` and populate:
    *   `MONGODB_URI`
    *   `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
    *   `GEMINI_API_KEY` (from Google AI Studio)
    *   `CLOUDINARY_*` keys (for media uploads)
    *   `RAZORPAY_*` keys (for premium checkout)
    *   `SMTP_*` keys (for Brevo email OTP)
4.  Run `npm run dev` to start the server on `http://localhost:5001`.

### Frontend Setup
1.  Navigate to the `Frontend/` directory.
2.  Run `npm install`.
3.  Verify `environment.ts` points to `http://localhost:5001/api/v1`.
4.  Run `npm start` (or `ng serve`) to spin up the Angular development server on `http://localhost:4200`.

---

## 5. Deployment Strategy
*   **Frontend**: Hosted on Vercel. Static build via `ng build`.
*   **Backend**: Hosted on Render/Heroku. Ensure `CORS_ORIGIN` environment variable is set to the Vercel production domain to prevent unauthorized access.
