---
'@nizivo/react': minor
---

QuantityStepper (`@nizivo/react/quantity-stepper`): a whole-number quantity in Input's box between a
minus and a plus button. The input is a native number input, so Tab reaches only it and the arrow
keys step it; the buttons, out of the tab order, step it for the pointer, fire the native `input`
and `change` events and are disabled at the ends of the range. Field wiring as Input, and
`labels.decrement` / `labels.increment` ("Decrease" / "Increase") in the `quantityStepper` catalogue
key.
