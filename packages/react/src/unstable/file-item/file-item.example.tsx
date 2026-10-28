import type { JSX } from 'react';
import { FileItem } from './index';

/** Three states of one upload: under way, done, and failed with its reason. */
export function FileItemExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 12, maxInlineSize: 420 }}>
      <FileItem
        name="autumn-lookbook.pdf"
        status="uploading"
        progress={62}
        detail="2.4 of 3.9 MB · 62%"
      />
      <FileItem name="autumn-lookbook.pdf" status="done" detail="3.9 MB · Uploaded" />
      <FileItem
        name="autumn-lookbook.pdf"
        status="error"
        detail="Upload failed — file is over 20 MB"
      />
    </div>
  );
}
