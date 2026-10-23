import type { JSX } from 'react';
import { Field } from '../field/index';
import { FileUpload } from './index';

/** Stands in for an `@nizivo/icons` glyph (Lucide's `upload`). */
function UploadMark(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.92}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="m17 8-5-5-5 5" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </svg>
  );
}

/**
 * Inside a Field, in a form that submits the files itself: a click or a drop on the zone chooses
 * them, before hydration too, and the chosen files submit under `name`.
 */
export function FileUploadExample(): JSX.Element {
  return (
    <div style={{ maxInlineSize: 400 }}>
      <Field
        label="Product images"
        required
        messages={{ valueMissing: 'Add at least one product image.' }}
      >
        <FileUpload
          name="images"
          accept="image/png,image/jpeg,image/webp"
          multiple
          maxSize={20_000_000}
          icon={<UploadMark />}
          hint="PNG, JPG or WebP, up to 20 MB"
          labels={{ prompt: 'Drop product images or {browse}' }}
        />
      </Field>
    </div>
  );
}

/**
 * The upload state your code passes back as `items`, one per file: uploading with its progress,
 * complete, and failed with a retry. These items match no chosen file, as files uploaded earlier.
 */
export function FileUploadStatesExample(): JSX.Element {
  return (
    <div style={{ maxInlineSize: 400 }}>
      <FileUpload
        aria-label="Order attachments"
        multiple
        icon={<UploadMark />}
        hint="PDF or images, up to 10 MB"
        items={[
          { id: 'a', name: 'packing-slip.pdf', size: 248_000, status: 'uploading', progress: 60 },
          { id: 'b', name: 'invoice-1042.pdf', size: 1_200_000, status: 'complete' },
          {
            id: 'c',
            name: 'damaged-box.jpg',
            size: 3_400_000,
            status: 'error',
            error: 'The connection dropped',
          },
        ]}
      />
    </div>
  );
}

/** Disabled: the zone takes no pick and no drop. */
export function FileUploadDisabledExample(): JSX.Element {
  return (
    <div style={{ maxInlineSize: 400 }}>
      <Field label="Invoice" disabled description="Unlocks once the order is paid.">
        <FileUpload name="invoice" accept=".pdf" icon={<UploadMark />} hint="PDF, up to 5 MB" />
      </Field>
    </div>
  );
}
