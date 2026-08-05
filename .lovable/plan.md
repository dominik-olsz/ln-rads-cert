# Catch every unsaved-change exit in the Course Builder

Today the "Save changes before leaving?" dialog only fires from the Course Builder's own Back button, because that's the single navigation path that was wired to the guard. Everything else — navbar links, logo, sign out, browser back/forward — bypasses it.

## What changes

1. Make the guard global for the Course Builder page: any in-app navigation away from `/admin/courses/:id` while there are unsaved changes opens the same dialog with **Cancel / Discard changes / Save & leave**, and only proceeds after the choice.
   - Covers all navbar links (Home, Courses, Dashboard, Admin, Sign out), the Back button, and the browser's back/forward buttons.
2. Keep the existing browser-level warning for refresh, closing the tab, or typing a new URL (the browser shows its own native prompt there — that text can't be customized).
3. The dialog remembers where you were heading, so "Save & leave" saves first and then continues to that destination; "Discard changes" leaves without saving; "Cancel" keeps you on the page.

## Note on the in-page tabs

Switching between Basic Info / Course Content / Certification Test / Preview inside the Course Builder does not lose anything — all edits stay in memory until you save, so no prompt appears there. If you'd rather be nagged on tab switches too, say so and I'll add it, but as-is it would be a false alarm.

## Technical detail

- Router upgrade: `src/App.tsx` currently uses `<BrowserRouter>` + `<Routes>`. React Router 6.30's `useBlocker` only works with a data router, so the routes move to `createBrowserRouter([...])` + `<RouterProvider>`, keeping the exact same paths, admin wrappers, and catch-all. `AuthProvider`, toasters and layout stay as they are.
- `src/pages/admin/CourseBuilder.tsx`: replace the single `requestNavigation` call on the Back button with `useBlocker(() => isDirty)`. The existing dirty-snapshot comparison, `beforeunload` handler, and the AlertDialog stay; the dialog's actions now call `blocker.proceed()` / `blocker.reset()`, and `Save & leave` awaits `saveCourse()` before proceeding.
- No database or edge-function changes.
