---
'@nizivo/react': minor
---

Add the app shell. `Sidebar` (`@nizivo/react/sidebar`): the main navigation from 640 px, 264 px wide from 1280 px and a 72 px icon rail below that, through CSS only; `collapsed` keeps either width; `SidebarItem` is a NavItem whose Tooltip shows its label in the rail. `TopBar` and `MobileTopBar`: the bars above the page, with slots for the title, the search and the actions. `MobileTabBar` (`@nizivo/react/mobile-tab-bar`): five destinations at the bottom below 640 px, with `MobileTabBarMore` opening the rest in a bottom sheet, and an island that writes the bar's height to `--nz-layout-bottom-inset`. `AppShell`: places them, shows each at its widths, and renders the page's `<main>` and a skip link. NavItem now folds to the rail inside a rail-narrow Sidebar (a size container query) instead of under any `data-collapsed` ancestor. StickyBar and the toast region no longer add the safe area twice above a tab bar.
