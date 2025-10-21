import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OrbitActionOptions<TOutput> {
  onSuccess?: (data: TOutput) => void;
  onError?: (error: string) => void;
  successMessage?: string;
  errorMessage?: string;
}

interface OrbitActionResult<TOutput> {
  success: boolean;
  data?: TOutput;
  error?: string;
}

export function useOrbitAction<TInput = any, TOutput = any>() {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);

  const execute = useCallback(
    async (
      action: (input: TInput) => Promise<TOutput>,
      input: TInput,
      options?: OrbitActionOptions<TOutput>
    ): Promise<OrbitActionResult<TOutput>> => {
      setIsExecuting(true);

      try {
        const result = await action(input);

        // Success notification
        toast.success(options?.successMessage || 'Operation completed', {
          description: 'The action was successful',
        });

        // Callback
        if (options?.onSuccess) {
          options.onSuccess(result);
        }

        return { success: true, data: result };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        // Error notification
        toast.error(options?.errorMessage || 'Operation failed', {
          description: message,
        });

        // Callback
        if (options?.onError) {
          options.onError(message);
        }

        return { success: false, error: message };
      } finally {
        setIsExecuting(false);
      }
    },
    [toast]
  );

  return { execute, isExecuting };
}
