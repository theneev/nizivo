// Fixture: public, engine-free types plus the engine interface (ARCHITECTURE.md §10.3).
export type SelectValueReason = 'item-press' | 'keyboard' | 'typeahead' | 'form-reset';
export type OpenReason = 'trigger' | 'escape' | 'outside-press' | 'item-press';

export interface SelectRootProps {
  value?: string | null;
  onOpenChange?(open: boolean, reason: OpenReason): void;
}

export interface SelectPartProps {
  className?: string;
}

type Part = (props: SelectPartProps) => unknown;

export interface SelectEngine {
  Root(props: SelectRootProps): unknown;
  Trigger: Part;
  Value: Part;
  Popup: Part;
  Item: Part;
  Group: Part;
  GroupLabel: Part;
  Separator: Part;
}
