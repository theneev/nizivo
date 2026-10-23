---
'@nizivo/react': minor
---

`NizivoConfig` takes `labels`, shaped like the `enUS` catalogue (`NizivoLabels` from `@nizivo/react/config`: keyed by component, every key and string optional, so a whole catalogue of another locale fits). The client parts read it: BannerDismiss, ChipGroup, Dialog.Close, Drawer.Close, FileUpload, Form, MobileTabBarMore, PasswordInput, Popover.Close, SearchField and Toaster. A part's own `labels` prop still wins key by key, and without a provider every part shows its English default, as before. Server parts (Pagination, Button, Breadcrumb and the others) cannot read a context and keep per-instance `labels`; the Strings and locales guide shows the one-file wrapper that passes them the same catalogue. AlertDismiss and SubmitButton do not read the provider yet.
