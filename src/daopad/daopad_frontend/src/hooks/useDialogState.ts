import { useState, useCallback } from 'react';

interface DialogState<T = any> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  isSubmitting: boolean;
}

interface DialogStateActions<T = any> {
  setData: (data: T | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsSubmitting: (submitting: boolean) => void;
  reset: () => void;
}

export function useDialogState<T = any>(
  initialData?: T
): [DialogState<T>, DialogStateActions<T>] {
  const [data, setData] = useState<T | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = useCallback(() => {
    setData(() => initialData || null);
    setIsLoading(() => false);
    setError(() => null);
    setIsSubmitting(() => false);
  }, [initialData]);

  return [
    { data, isLoading, error, isSubmitting },
    { setData, setIsLoading, setError, setIsSubmitting, reset },
  ];
}
