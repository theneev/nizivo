---
'@nizivo/react': minor
---

Combobox (`@nizivo/react/combobox`): a text input that suggests items from a list as the reader
types, on React Aria's ComboBox. `Combobox.Root` draws Input's box around `Combobox.Input` and an
optional `Combobox.Trigger`; `Combobox.Popup` holds `Combobox.Item`s with Groups, GroupLabels and
Separators, in Select's popup and rows. The list filters with a "contains" match in the locale; the
input keeps focus while the arrow keys move the active item; Enter chooses and Escape reverts.
`value` and `inputValue` are controllable, `allowsCustomValue` accepts any text, `menuTrigger` sets
when the list opens, and a hidden input carries the chosen value into forms. It joins the
react-aria overlay family and passes its conformance suite. Field wiring as Input.
