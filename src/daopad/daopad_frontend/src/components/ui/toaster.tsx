import React from 'react';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast: 'bg-executive-darkGray text-executive-ivory border border-executive-gold/30',
          success: 'border-executive-gold text-executive-ivory',
          error: 'border-red-500 text-red-200',
        },
      }}
    />
  );
}

export const toast = sonnerToast;
