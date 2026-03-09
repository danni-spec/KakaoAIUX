# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Type-check with `tsc -b` then build with Vite
- `npm run lint` — ESLint (flat config, TS/TSX only)
- `npm run preview` — Preview production build

## Tech Stack

- React 19 + TypeScript 5.9, Vite 7, Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`)
- No router, no state management library — single-page static UI prototype

## What This Project Is

A pixel-accurate KakaoTalk friends list UI prototype rendered inside an iPhone 16 frame (393x852pt viewport). The app is Korean-language (lang="ko"). All friend data is hardcoded in component files — there is no backend or API.

## Architecture

**Entry flow:** `main.tsx` → `App.tsx` → `FriendList` (the entire app is one screen)

**`src/components/FriendList/`** — All UI lives here, composed as a vertical stack:
- `StatusBar` — Fake iOS status bar (time, signal, battery)
- `Header` — User profile + action icons (search, add, gift, settings)
- `TabNavigation` — "친구" / "소식" pill tabs (local state only)
- `UpdatedFriendsSection` — Horizontal scroll of recently updated friends
- `BirthdayFriendsSection` — Birthday friends with gift buttons
- `FavoriteFriendsSection` — Favorited friends list
- `AllFriendsSection` — Full friends list
- `BottomNavBar` — Floating glass-morphism bottom navigation (absolute positioned)
- `AILayerPopup` — Bottom sheet triggered by double-tap on empty area; uses `flushSync` + immediate `focus()` for iOS keyboard activation

**`src/components/IPhone16Mockup.tsx`** — Detailed SVG device frame overlay (currently imported but frame is done via CSS border in App.tsx)

**`SquircleAvatar`** — Shared avatar component using `/squircle.svg` as CSS `mask-image` for KakaoTalk's signature squircle shape. Has both `<img>` and `<div>` variants.

## Key Patterns

- **Styling:** Tailwind utility classes inline. Custom CSS is minimal (`index.css` — only `scrollbar-hide` utility). No CSS modules or styled-components.
- **Static assets:** Profile images and icons are in `/public/` and referenced as absolute paths (e.g., `/profile-dannion.png`).
- **Friend data:** Each section component defines its own hardcoded array (e.g., `ALL_FRIENDS`, `BIRTHDAY_FRIENDS`). No shared data layer.
- **Double-tap gesture:** The `FriendList` index handles double-tap (both touch and mouse) to open `AILayerPopup`. Child interactive elements stop propagation to avoid false triggers.
- **iOS mobile considerations:** `visualViewport` API for keyboard offset, `flushSync` for focus timing, `viewport-fit=cover` and `interactive-widget=resizes-content` meta tags.
