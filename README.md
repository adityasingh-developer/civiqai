# CiviqAI

CiviqAI is a secure, AI-powered platform designed to simplify complex government schemes, policies, and legal documents for citizens. By leveraging the Gemini 2.5 Flash model and a robust full-stack architecture, it transforms dense bureaucratic text into clear, actionable summaries.

## Core Features

* **Intelligent Policy Analysis:** Dense documents and PDFs are analyzed to provide instant answers regarding eligibility and application procedures.
* **Multimodal Input:** Support for both text documents and image-based notices is integrated, allowing users to upload photos of physical posters or announcements.
* **Secure Persistence:** User interactions are stored in MongoDB, providing persistent chat history and the ability to save specific messages.
* **Professional Export:** Saved information can be exported as formatted PDF documents for offline reference.
* **Privacy-First Architecture:** Sensitive data is protected using industry-standard encryption protocols.

## Technical Architecture

### AI Orchestration
The backend is powered by Gemini 2.5 Flash. A specialized system prompt is applied to ensure the model remains focused on public policy and provides simplified, accurate explanations. Context management is handled to include prior conversation history and uploaded attachments in every query.

### Data Security
Privacy is managed through an encryption layer utilizing AES-256-GCM. Every user prompt and AI response is encrypted with a unique 12-byte initialization vector (IV) and an authentication tag before being stored in the database. This ensures that raw chat data is never stored in plain text.

* **AI Assistance:** Developed with support from Google Gemini (AI orchestration) and ChatGPT (Code optimization).

### Persistence and Auth
* Framework: Next.js (App Router)
* Authentication: NextAuth.js with Google Provider
* Database: MongoDB with Mongoose schemas
* Styling: Tailwind CSS with support for dark and light modes

## Environment Variables

To run this project locally, the following environment variables are required:

```text
GOOGLE_API_KEY=
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ENCRYPTION_KEY=
