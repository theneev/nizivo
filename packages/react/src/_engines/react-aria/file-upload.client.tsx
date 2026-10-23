'use client';
// FileUpload's adapter in the react-aria family (ARCHITECTURE.md §9.5: T2, our own code behind an
// engine contract, D-cg). It is written on the DOM's drag events, not React Aria's useDrop: useDrop
// brings React Aria's drag-and-drop strings for every locale, about 21 KB gzip on ./file-upload and
// on the root barrel, for a drop target that needs none of them. The native <input type="file"> is
// Nizivo's and is the accessible path; this adds only the drop target.
//
// A drag counts as files when its types include 'Files' (text dragged from the page shows no
// drag-over state). dragenter and dragleave fire for every child the pointer crosses, and WebKit
// gives dragleave no relatedTarget, so a depth counter says when the drag has left the target. The
// dropped files are `dataTransfer.files`: the platform's own list, in order, at once.
import { useRef, useState, type DragEvent, type RefObject } from 'react';
import type { FileUploadEngine } from '../../file-upload/file-upload.contract';
import type { FileUploadDropOptions, FileUploadDropTarget } from '../../file-upload/seam';

const carriesFiles = (event: DragEvent<HTMLElement>): boolean =>
  event.dataTransfer?.types.includes('Files') ?? false;

export function useDropTarget(
  options: FileUploadDropOptions,
  _ref: RefObject<HTMLElement | null>,
): FileUploadDropTarget {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  // Disabled, the target still takes the drop and does nothing with it: a file dropped where no
  // handler cancels the drop is opened by the browser, in place of the page.
  if (options.disabled) {
    return { dropProps: { onDragOver: refuse, onDrop: refuse }, isDropTarget: false };
  }
  return {
    dropProps: {
      onDragEnter(event: DragEvent<HTMLElement>) {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        setOver(true);
      },
      onDragOver(event: DragEvent<HTMLElement>) {
        if (!carriesFiles(event)) return;
        // a drop is allowed only where dragover is cancelled
        event.preventDefault();
        if (event.dataTransfer !== null) event.dataTransfer.dropEffect = 'copy';
      },
      onDragLeave(event: DragEvent<HTMLElement>) {
        if (!carriesFiles(event)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      },
      onDrop(event: DragEvent<HTMLElement>) {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        depth.current = 0;
        setOver(false);
        const files = [...(event.dataTransfer?.files ?? [])];
        if (files.length > 0) options.onDrop(files, event.currentTarget);
      },
    },
    isDropTarget: over,
  };
}

function refuse(event: DragEvent<HTMLElement>): void {
  event.preventDefault();
  if (event.dataTransfer !== null) event.dataTransfer.dropEffect = 'none';
}

export const fileUploadEngine: FileUploadEngine = { useDropTarget };
