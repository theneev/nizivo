---
'@nizivo/react': minor
---

The dashboard parts (M41), each on its own subpath with its own stylesheet: NumberValue and `formatNumber` (`./number-value`), Metric (`./metric`), KpiTile (`./kpi-tile`), TrendCard (`./trend-card`) and RankedList (`./ranked-list`), server components that ship no client JavaScript under React Server Components and keep their box in the loading, empty and error states; CountUp and `useCountUp` (`./motion`), the one client part, which renders the final value on the server and counts on the client (0 ms under reduced motion); and Avatar with AvatarGroup (`./avatar`), Breadcrumb (`./breadcrumb`) and Pagination (`./pagination`), server components. Card gains `tone="brand"` and `tone="accent"`, the tinted surfaces of the dashboard widgets; its other tones are unchanged.
