import { useEffect, type JSX } from 'react';
import { Button } from '../button/index';
import { toast, Toaster } from './index';

/**
 * A confirmation after a save, with one action. `toast()` runs in an event handler, so this is a
 * client component of your app; `<Toaster />` goes once in the root layout.
 */
export function ToastExample(): JSX.Element {
  return (
    <>
      <Button
        onClick={() =>
          toast('Product saved', {
            tone: 'success',
            action: { label: 'View', onAction: () => {} },
          })
        }
      >
        Save product
      </Button>
      <Toaster />
    </>
  );
}

/**
 * The three tones as a stack, newest last. Each has an action or is critical, so all three stay
 * until dismissed; a plain toast would leave after 5 s.
 */
export function ToastStackExample(): JSX.Element {
  useEffect(() => {
    toast('Product saved', { tone: 'success', action: { label: 'View', onAction: () => {} } });
    toast('Couldn’t publish 2 products', {
      tone: 'critical',
      action: { label: 'Retry', onAction: () => {} },
    });
    toast('Order #1042 archived', { action: { label: 'Undo', onAction: () => {} } });
    return () => toast.dismiss();
  }, []);
  return <Toaster />;
}
