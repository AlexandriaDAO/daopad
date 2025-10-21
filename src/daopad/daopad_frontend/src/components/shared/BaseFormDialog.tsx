import React, { useState, useEffect } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Helper function to get explicit Tailwind grid classes (required for JIT compiler)
const getTabsGridClass = (count: number): string => {
  const gridClasses: Record<number, string> = {
    1: 'grid w-full grid-cols-1',
    2: 'grid w-full grid-cols-2',
    3: 'grid w-full grid-cols-3',
    4: 'grid w-full grid-cols-4',
    5: 'grid w-full grid-cols-5',
    6: 'grid w-full grid-cols-6',
  };
  return gridClasses[count] || 'grid w-full grid-cols-2'; // Default to 2 cols
};

interface TabConfig {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BaseFormDialogProps<TSchema extends z.ZodType> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  schema: TSchema;
  defaultValues: z.infer<TSchema>;
  onSubmit: (data: z.infer<TSchema>) => Promise<void>;
  submitText?: string;
  children: (form: UseFormReturn<z.infer<TSchema>>) => React.ReactNode;
  maxWidth?: string;
  tabs?: TabConfig[];
}

export function BaseFormDialog<TSchema extends z.ZodType>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  onSubmit,
  submitText = 'Submit',
  children,
  maxWidth = 'max-w-2xl',
  tabs,
}: BaseFormDialogProps<TSchema>) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues,
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open]); // form.reset is stable, no need in deps

  // Submission handler with error handling
  const handleSubmit = async (data: z.infer<TSchema>) => {
    setIsSubmitting(true);

    try {
      await onSubmit(data);
      toast.success('Success', {
        description: 'Operation completed successfully',
      });
      onOpenChange(false);
      form.reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      // Only show toast notification (remove duplicate inline alert)
      toast.error('Operation Failed', {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidth}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Tabs or direct content */}
            {tabs ? (
              <Tabs defaultValue={tabs[0].value} className="w-full">
                <TabsList className={getTabsGridClass(tabs.length)}>
                  {tabs.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                      {tab.icon && <tab.icon className="h-4 w-4 mr-2" />}
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {children(form)}
              </Tabs>
            ) : (
              children(form)
            )}

            {/* Footer */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
