---
'@nizivo/react': minor
---

NumberField (`@nizivo/react/number-field`): a number in the reader's locale, a price, a percent or
a unit, in Input's box, on React Aria's NumberField. `formatOptions` takes `Intl.NumberFormat`
options; what is typed is parsed in the locale on blur or Enter, clamped to `min` and `max`,
snapped to `step` and formatted, and the server HTML already shows the formatted value. A hidden
input carries the plain number into forms. `NumberField.Decrement` and `NumberField.Increment` add
optional step buttons, out of the tab order and named by React Aria ("Increase Price"); `labels`
replaces the names. Field wiring as Input.
