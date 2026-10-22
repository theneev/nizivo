---
'@nizivo/react': minor
---

Banner (`./banner`): a page-wide message under the header, `tone` `brand` (Figma's Promo) or `warning`, with a `title`, a line of text, a 72 px `media` picture or an `icon`, one `action` and an optional `BannerDismiss`. Server-rendered and static; only the dismiss button hydrates, and it calls `onDismiss` for your code to stop rendering the banner. No live role by default.
