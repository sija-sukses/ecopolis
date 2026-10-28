# Product Requirements Document: Ecopolis

## Product Overview

**Product Vision:** Ecopolis is a lightweight, zero-cost, interactive web-based climate governance simulator designed for the INVOFEST 2026 National Web Design Competition. It empowers users to step into the role of a regional leader making critical 5-round tradeoffs between economic growth, environmental preservation, citizen satisfaction, and energy supply—culminating in a dynamic, high-impact AI narrative review of their city's state in the year 2050.

**Target Users:** 
- **Primary:** INVOFEST 2026 Competition Jurors (evaluating UI/UX, creativity, responsiveness, and theme alignment).
- **Secondary:** High school and university students across Indonesia participating in climate literacy and digital innovation activities.

**Business Objectives:** 
- Secure top honors in the INVOFEST 2026 Web Design Competition (SMA/SMK & University Categories).
- Demonstrate cutting-edge Next.js 14+ client/server capabilities alongside zero-cost, rate-limit-aware AI integration (Google Gemini 1.5 Flash API).
- Provide an inspiring educational tool for SDGs 3, 8, 9, 11, 12, and 13.

**Success Metrics:**
- **Performance:** 100% Google Lighthouse Performance, Accessibility, and Best Practices scores.
- **Engagement:** 100% completion rate for 5-round simulation sessions without API rate-limit failure.
- **Responsiveness:** Flawless layout adaptivity across mobile (375px+), tablet, and desktop (1920px) viewports.

---

## User Personas

### Persona 1: Juri INVOFEST 2026 (Competition Evaluator)
- **Demographics:** Age 28–45, Informatics/Design Lecturer or Industry Tech Lead, High technical proficiency.
- **Goals:** Quickly assess visual aesthetics (30%), innovation/AI execution (25%), responsiveness (20%), and theme fit (10%) within a 3–5 minute evaluation window.
- **Pain Points:** Frustrated by slow loading times, broken layouts, confusing UI/UX, or API rate-limit errors during live judging.
- **User Journey:** Lands on landing page $\rightarrow$ Quickly starts game $\rightarrow$ Observes interactive drone-view map animations $\rightarrow$ Finishes 5 rounds $\rightarrow$ Reads AI narrative review $\rightarrow$ Downloads PDF report.

### Persona 2: Siswa / Mahasiswa (General Player)
- **Demographics:** Age 15–22, Tech-savvy Gen Z, Moderate to high digital awareness.
- **Goals:** Enjoy a fun, gamified experience ("Reigns" style), experiment with policy choices, and share their "2050 City Status" on social media or with peers.
- **Pain Points:** Boring wall-of-text games, lack of visual feedback when making choices, non-responsive mobile views.
- **User Journey:** Enters name/gender $\rightarrow$ Plays through rounds while watching building assets pop up on the 3D isometric map $\rightarrow$ Shares final score/certificate.

---

## Feature Requirements

| Feature | Description | User Stories | Priority | Acceptance Criteria | Dependencies |
|---------|-------------|-------------|----------|---------------------|--------------|
| **Onboarding & Avatar Setup** | Form for leader name and gender/avatar selection. | As a user, I want to personalize my leader profile so that the system addresses me by name throughout the simulation. | **Must-Have** | Name validation (1–20 chars); selection of male/female avatar toggle; stores state in React Context. | None |
| **Isometric / Top-Down Grid Map** | 5-plot visual map rendering city assets progressively per round. | As a user, I want to see visual changes on the map when I make a choice so that I feel immediate impact. | **Must-Have** | 5 distinct plot zones; smooth Framer Motion `fade-in`/`drop-down` animations; transparent WebP/SVG building assets. | Onboarding State |
| **HUD Dashboard Indicators** | Real-time parameter bar for Economy ($\$$), Environment ($\leavevmode\hbox{\set@color$\odot$}$), Satisfaction ($\heartsuit$), and Energy ($\Omega$). | As a user, I want to track my city's statistics so that I can balance my decisions strategically. | **Must-Have** | Numbers update smoothly with color indicators (green/red deltas); ranges bounded between 0 and 100. | Decision Engine |
| **5-Round Scenario Engine** | Local JSON-driven binary choice cards ("A vs B") per round. | As a user, I want to be presented with realistic climate vs economy dilemmas so that I can make policy decisions. | **Must-Have** | 5 structured rounds; 0 API calls during round choices; immediate state mutation in local memory. | Local `scenarios.json` |
| **AI 2050 Narrative Generator** | Next.js Server Action calling Gemini 1.5 Flash API at Round 5 completion. | As a user, I want an AI-generated summary at the end so that I get a personalized narrative of my city's future in 2050. | **Must-Have** | Single API call at end of game; 2-paragraphed dramatic narrative + SDG reflection; fallback to local template on API timeout/error. | Gemini API Key, Server Actions |
| **Web Audio SFX System** | Subtle sound effects for button clicks, building drops, and game completion. | As a user, I want audio feedback so that the game feels immersive and polished. | **Should-Have**| Mute/Unmute toggle in header; uses HTML5 Web Audio API; zero external audio library dependencies. | Web Audio API |
| **PDF Report Card Generator** | Generates an official "Leader Certificate & 2050 City Report" for download. | As a user, I want to download my simulation results as a PDF so that I can keep a record or share my achievements. | **Should-Have**| Client-side PDF generation using `jspdf` + `html2canvas`; includes user name, final map image, stats, and AI review text. | AI Review State |

---

## User Flows

### Flow 1: Complete Game & AI Generation Cycle
1. User arrives at `/` (Landing Page) $\rightarrow$ Clicks **"Mulai Simulasi"**.
2. Modal/Page overlay opens for **Onboarding**:
   - User types Name: e.g., *"Budi"*.
   - User selects Avatar: Male / Female.
   - Clicks **"Terapkan Kebijakan Pertama"**.
3. Redirects to `/play` (Game Interface):
   - **HUD Header** initializes stats at 50/100 each.
   - **Interactive Map** displays 5 empty plots with drone grid effect.
   - **Scenario Card (Round 1)** appears: *"Pembangunan Sumber Energi Pertama"* (PLTU Batu Bara vs PLTS Surya).
4. User selects **Option B (PLTS Surya)**:
   - Economy: -15, Environment: +20, Satisfaction: +10, Energy: +15.
   - Asset `plts.webp` drops onto Plot 1 with sound effect and drop animation.
5. Rounds 2 through 5 repeat with local JSON data updates.
6. Upon completing Round 5:
   - Card transitions into **"Menganalisis Dampak Masa Depan oleh AI..."** loading state.
   - Next.js Server Action sends payload JSON to Google Gemini 1.5 Flash API.
7. User is redirected to `/results`:
   - Displays final isometric city map with all 5 assets.
   - Renders AI 2050 Narrative Report and SDG alignment cards.
   - Provides **"Unduh Laporan PDF"** and **"Main Lagi"** buttons.

### Flow 2: API Fallback Flow (Zero-Failure Edge Case)
1. User completes Round 5 $\rightarrow$ Gemini API call is triggered via Server Action.
2. If API fails (Rate limit reached, quota exhausted, or offline):
   - Server Action catches error after a 4-second timeout.
   - System automatically selects a pre-written fallback narrative template based on the highest/lowest user parameter (e.g., *High Economy + Low Environment* = "Kota Metropol Polutan").
3. Results page loads seamlessly with notice badge: *"Laporan Hasil Evaluasi Standar"*. Game process never crashes.

---

## Non-Functional Requirements

### Performance
- **First Contentful Paint (FCP):** $< 1.0$ second.
- **Time to Interactive (TTI):** $< 1.8$ seconds.
- **Bundle Size:** Under 200 KB initial JS payload (achieved via Next.js Server Components and dynamic imports).

### Security & Reliability
- **API Key Protection:** `GEMINI_API_KEY` stored strictly in server-side `.env.local` / Vercel Environment Variables. Never exposed to the browser bundle.
- **Rate Limit Resilience:** Max 1 Gemini API call per complete session. All scenario transitions run client-side.

### Compatibility & Responsive Design
- **Supported Browsers:** Google Chrome, Safari, Firefox, Microsoft Edge (latest 2 versions).
- **Responsive Viewports:** Mobile Portrait (375px+), Mobile Landscape, Tablet (768px+), Desktop (1024px, 1440px, 1920px).
- **Touch & Mouse Inputs:** Large, tap-friendly action buttons (min height 48px) for mobile usability.

---

## Technical Specifications

### Frontend
- **Framework:** Next.js 14+ (App Router, React 18/19, TypeScript).
- **Styling:** Tailwind CSS + `clsx` + `tailwind-merge`.
- **Icons:** `lucide-react`.
- **Animations:** `framer-motion` (for card flips, modal popups, and building plot drops).

### Backend & API
- **Route Handling:** Next.js Server Actions (`/app/actions/generateReview.ts`).
- **AI SDK:** `@google/genai` (Google Gen AI SDK) using `gemini-1.5-flash` model.
- **Response Format:** Strict JSON prompt instruction forcing structured output:
  ```json
  {
    "title": "Metropolis Hijau 2050",
    "narrative": "Paragraf 1...",
    "sdgReflection": "Paragraf 2..."
  }
  ```

### Infrastructure & Deployment
- **Hosting Platform:** Vercel (Free Hobby Tier).
- **Build Output:** Next.js Serverless Functions + Static Asset Edge Delivery.
- **Continuous Integration:** Automated deployment on git push via GitHub $\rightarrow$ Vercel integration.

---

## Analytics & Success Verification

- **Internal Session Counter:** Local tracking of completed games stored in `localStorage`.
- **Evaluation Testing Plan:**
  1. Test 20 full game runs on mobile and desktop to verify zero memory leaks.
  2. Disconnect internet at Round 5 to verify offline fallback narrative execution.
  3. Run Lighthouse Audit on Vercel preview deployment URL.

---

## Release Planning (INVOFEST 2026 Timeline)

```
October 2026                 November 2026
┌───────────────────────────┬───────────────────────────┐
│ 26 - 29 Oct: Core Dev     │ 01 - 04 Nov: Testing      │
│ - Next.js Setup           │ - Mobile Responsiveness   │
│ - Scenario Engine JSON    │ - Offline Fallback        │
│ - Framer Motion Map       │ - Lighthouse Optimizations│
├───────────────────────────┼───────────────────────────┤
│ 30 - 31 Oct: AI & PDF     │ 05 - 07 Nov: Submission   │
│ - Gemini Server Action    │ - Video Recording & Demo  │
│ - PDF Generator           │ - Final GitHub Upload     │
└───────────────────────────┴───────────────────────────┘
```

### MVP Scope (v1.0 - Submission Version)
- Fully functional 5-round interactive simulation.
- Responsive isometric drone map with dynamic asset rendering.
- Gemini API Server Action + local fallback fallback mechanism.
- PDF Report generation.
- Complete documentation & guidebook compliance (HTML/CSS/JS base via Next.js).

---

## Open Questions & Assumptions

- **Assumption 1:** Google Gemini 1.5 Flash API free tier remain active with 15 RPM limits, which is more than sufficient for judging demos.
- **Assumption 2:** Judges will test the web application on both mobile devices and desktop screens.
- **Open Question 1:** Should we add an optional background music track (lo-fi ambient) alongside SFX? *(Decision: Include simple toggle button in top navigation bar).*

---

## Appendix: AI Prompt Architecture for Gemini

### System Prompt (`generateReview.ts`)
```text
You are the Chief AI Climate Evaluator for Ecopolis in the year 2050.
User Leader Name: {leaderName}
Gender: {gender}
Final Stats: Economy={economy}, Environment={environment}, Satisfaction={satisfaction}, Energy={energy}.
Choices Made: {choicesArray}

Generate a JSON response with:
1. "title": A dramatic 3-5 word title describing the city in 2050.
2. "narrative": A 2-paragraph dramatic storytelling review of how the city evolved by 2050 based on the choices made.
3. "sdgReflection": A concise 2-sentence educational takeaway linking their performance to UN SDGs 11 & 13.

Return ONLY valid JSON.
```