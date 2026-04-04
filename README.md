# NWSDB AquaConnect

Modern web app for managing NWSDB water connections with GPS capture, categorization, map viewing, reporting, and role-based access.

## Overview

NWSDB AquaConnect is designed for field and office teams to:

- capture water connection GPS coordinates
- organize connections using admin-defined categories
- search and filter quickly
- open navigation in Google Maps app/website using captured coordinates
- work smoothly on both mobile and desktop

The app uses Firebase for authentication and Firestore for real-time data updates.

## Core Features

### GPS Connection Workflow

- Capture connection location coordinates per account.
- Save and update location details (account number, note, address, categories).
- Auto-reverse-geocode address from coordinates.
- Open navigation externally (Google Maps app/site) without embedding Google Maps API.

### Map View

- Displays all visible connections with valid GPS markers.
- Marker color uses category color (primary category).
- Popup includes account details, categories, and quick actions.
- Auto-focuses map to captured points:
  - single point -> center + zoom
  - multiple points -> fit bounds

### Categories

- Admin-side category management.
- Each connection can have one or more categories.
- Category filter support in dashboard and map.

### Dashboard

- Search and advanced filters (office, category, date range).
- Export options (PDF/Excel).
- Mobile-optimized cards and form interactions.
- Role-aware data visibility.

### Reports

- GPS-aware reporting and filtering.
- Export-friendly report outputs for operations.

## Roles & Access

- Regional Engineer: full operational/admin access.
- Acting Officer: office-scoped operational access.
- Developer: technical/admin access for development and monitoring.

Access is enforced in UI and Firestore rules.

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- React Router
- React Hook Form
- Firebase Auth + Firestore
- React Leaflet + Leaflet
- jsPDF + xlsx
- Lucide icons

## Routes (main)

- `/login`
- `/dashboard`
- `/map` (and `/maps`)
- `/application/:id`
- `/categories`
- `/reports`
- `/users`
- `/system-log`

## Setup

### Prerequisites

- Node.js 18+
- npm
- Firebase project

### Install

```bash
npm install
```

### Run (development)

```bash
npm run dev
```

### Environment Variables

Set this variable for connection image uploads:

```bash
VITE_IMGBB_API_KEY=your_imgbb_api_key
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Firebase Notes

- Configure Firebase in `src/firebase.ts`.
- Deploy `firestore.rules` and required indexes (`firestore.indexes.json`).
- Ensure role/user records exist in Firestore to match allowed access paths.

## Mobile Optimization Status

This project includes targeted mobile improvements for:

- dashboard action controls and cards
- capture location modal/form
- map page controls and filter panel
- details and reporting surfaces

## Security & Permissions

- Firestore security rules are required for production behavior.
- Restricted pages (e.g., system logs, user management) are role-gated.
- Permission-denied cases are handled gracefully in UI.

## Project Structure (high level)

```text
src/
  components/
  contexts/
  lib/
  pages/
  App.tsx
  firebase.ts
```

## Version

Current package version: `2.5.6`

