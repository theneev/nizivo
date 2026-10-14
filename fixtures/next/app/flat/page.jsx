// (c) The same parts through flat imports from the 'use client' leaves (spike S2b /flat-a).
import {
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogPopup,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '@nizivo/react/dialog';
import { SelectItem, SelectPopup, SelectRoot, SelectTrigger } from '@nizivo/react/select';
import { TooltipPopup, TooltipRoot, TooltipTrigger } from '@nizivo/react/tooltip';

export default function Page() {
  return (
    <main>
      <h1>Flat imports</h1>
      <SelectRoot defaultValue="30d" name="period" aria-label="Period">
        <SelectTrigger />
        <SelectPopup>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
        </SelectPopup>
      </SelectRoot>
      <DialogRoot>
        <DialogTrigger>Edit product</DialogTrigger>
        <DialogPopup>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>Change the name and price.</DialogDescription>
          <DialogBody>Form fields go here.</DialogBody>
          <DialogFooter>
            <DialogClose>Done</DialogClose>
          </DialogFooter>
        </DialogPopup>
      </DialogRoot>
      <TooltipRoot>
        <TooltipTrigger>Export</TooltipTrigger>
        <TooltipPopup>Download the report as CSV</TooltipPopup>
      </TooltipRoot>
    </main>
  );
}
