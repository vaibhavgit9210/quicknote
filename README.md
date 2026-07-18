# QuickNote

A real-time shared clipboard for passing text and images between devices. Open the same room URL on two devices and whatever you type or paste on one shows up on the other, live. No accounts, no setup — rooms are throwaway and expire after 24 hours.

Live: https://vaibhavkumar.is-a.dev/quicknote/

## How it works

- Opening the app signs you in anonymously (Firebase Auth) and drops you into a room identified by a 6-character code in the URL hash (e.g. `#x7k2mq`, generated from an ambiguity-free alphabet). Share the link to share the room.
- **Text sync** uses Firebase **Realtime Database**: keystrokes are debounced (300 ms) and written to `rooms/<code>`, while an `onValue` listener pushes remote changes into the textarea (skipping the echo of your own writes).
- **Images** can be dropped, pasted, or picked from a file dialog. They're compressed client-side on a canvas (resized to max 1920 px wide, JPEG q0.8, 5 MB cap), uploaded to Firebase **Storage**, and referenced from the room's RTDB entry so all devices render them.
- Rooms track `lastActive`; anything idle for 24 hours is treated as expired and wiped on next visit. There are also explicit "New room" and "Clear" actions.

## Stack

- Vanilla JS + [Vite](https://vitejs.dev/) (no framework)
- Firebase: Realtime Database, Storage, anonymous Auth
- `src/main.js` (UI/room logic), `src/clipboard.js` (text sync), `src/storage.js` (image upload), `src/utils.js` (room codes, expiry), `src/firebase-config.js` (Firebase init)

## Run locally

```sh
npm install
npm run dev     # dev server
npm run build   # production build to dist/
```

You need a Firebase project of your own to run this: create one, enable Realtime Database, Storage, and Anonymous Authentication, then put your web app's config into `src/firebase-config.js`. (The committed config points at my project; web Firebase configs are public identifiers, access is governed by the security rules.)

The Vite `base` is set to `/quicknote/` for GitHub Pages — change it if you host elsewhere.

## Deployment

A GitHub Actions workflow (`.github/workflows/`) builds the site with `npm ci && npm run build` on every push to `main` and deploys `dist/` to GitHub Pages.
