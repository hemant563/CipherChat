# Product Requirements Document (PRD)
## Project Name: CipherChat

### 1. Product Overview
CipherChat is a highly secure, real-time web-based messaging platform designed with privacy at its core. It provides end-to-end encrypted messaging, self-destructing ephemeral messages, and secure media sharing. Built for modern web browsers, CipherChat delivers a seamless, native-app-like experience using cutting-edge web technologies.

### 2. Target Audience
- Privacy-conscious individuals who want to ensure their conversations remain confidential.
- Professionals and teams needing a secure channel for sensitive information.
- Everyday users looking for a modern, ad-free, and fast communication tool.

### 3. Technology Stack
- **Frontend:** Angular (v17/18+ using Signals), Tailwind CSS, TypeScript.
- **Backend:** Node.js, Express.js.
- **Real-Time Engine:** Socket.io.
- **Database:** MongoDB (Mongoose ORM).
- **Authentication & Security:** JSON Web Tokens (JWT), Brevo API (for Email OTP), bcryptjs, AES-GCM for payload encryption.
- **Hosting & Deployment:** Vercel (Frontend), Render (Backend).

### 4. Core Features & Requirements

#### 4.1. Authentication & User Onboarding
- **Email-Based OTP Registration:** Users sign up using their email, verified via a one-time password (OTP) sent through the Brevo API.
- **Username System:** Users choose a unique `@username` and display name.
- **Two-Step Verification (2FA):** Optional enhanced security layer requiring an OTP upon login from unrecognized devices.
- **Device Management:** Users can view, track, and revoke access for logged-in devices.

#### 4.2. Secure Messaging System
- **Real-Time Chat:** Instant message delivery using WebSocket architecture.
- **Rich Media Support:** Users can send text, emojis, and images/files.
- **Typing Indicators & Read Receipts:** Live "User is typing..." indicators and double-tick read receipts.
- **Auto-Delete (Ephemeral) Messages:** 
  - **After View:** Messages delete instantly after the recipient views them.
  - **Midnight Clear:** Messages automatically clear at midnight IST.
  - **Never:** Permanent storage (default).

#### 4.3. Chat Organization & Privacy Controls
- **Direct Messaging (1-on-1):** Private, encrypted chats between two users.
- **Group Chats:** Multi-user communities with Admin privileges, member management, and role-based permissions (e.g., "Only Admins can send messages").
- **Chat Locks:** Users can lock specific sensitive conversations behind a custom 4-digit PIN.
- **Contact Requests:** Users must send and approve contact requests before initiating a chat.
- **Block System:** Users can block and unblock problematic contacts.

#### 4.4. Audio & Video Calling
- **WebRTC Integration:** Peer-to-peer secure audio and video calling functionality directly within the browser without third-party plugins.

#### 4.5. Premium Features (Monetization)
- **AI Smart Replies:** Context-aware, AI-generated suggested replies to speed up conversations.
- **Verified Badges:** Blue or Gold checkmarks for premium/admin users.
- **Advanced Auto-Delete Control:** Free users are restricted from setting messages to "Never delete" (forces ephemeral usage), while Premium users unlock unlimited retention.

### 5. UI/UX Design Principles
- **Modern Aesthetics:** Glassmorphism, smooth CSS transitions, and gradient backgrounds.
- **Responsive Layout:** A collapsible sidebar and dynamic routing that works perfectly on desktop, tablet, and mobile screens.
- **Dark/Light Mode:** Intelligent themes based on user preference.
- **Micro-interactions:** Haptic feedback on mobile browsers, distinct sound effects for incoming/outgoing messages, and subtle animations (e.g., typing bubbles, unread count pulsing).

### 6. Security & Infrastructure
- **Zero-Knowledge Architecture Goal:** "Your data is yours. CipherChat does not store plain text logs."
- **CORS Protection:** Backend API tightly restricts access only to the deployed Vercel frontend domain.
- **Rate Limiting:** Protection against brute-force attacks on OTP endpoints.

### 7. Future Enhancements (Roadmap)
- Mobile App wrappers (React Native / Capacitor).
- End-to-End Encryption (E2EE) cryptographic key exchange implementation (Signal Protocol).
- Voice note recording and sharing.
- Message reactions (Emoji tapbacks).
