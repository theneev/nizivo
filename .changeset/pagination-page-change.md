---
'@nizivo/react': minor
---

Add `onPageChange` to `Pagination`, for client state with no URL: each page, previous and next is then a `<button type="button">`, and choosing another page calls `onPageChange(page, details)` with no navigation; the ends are disabled buttons. `getHref` becomes optional (give one of the two). Pagination stays server-safe: a Server Component still uses links and ships no client JavaScript.
