import { Card, CardHeader, CardTitle, CardContent } from './card';
import { cn } from '@/lib/utils';

/**
 * Enhanced card with golden accent options
 * Provides subtle premium styling with executive color palette
 */
export function ExecutiveCard({
  children,
  variant = 'default',
  hover = true,
  className,
  ...props
}) {
  return (
    <Card
      className={cn(
        // Base styles
        "relative overflow-hidden",

        // Variant styles
        variant === 'gold' && [
          "border-executive-gold/30",
          "bg-gradient-to-br from-executive-gold/5 to-transparent"
        ],
        variant === 'gold-highlight' && [
          "border-executive-gold/50",
          "bg-gradient-to-br from-executive-gold/10 to-executive-darkGray/50"
        ],

        // Hover effects
        hover && "transition-all duration-300 hover:border-executive-gold/50 hover:shadow-lg hover:shadow-executive-gold/10",

        className
      )}
      {...props}
    >
      {/* Corner accent - top left golden corner */}
      {(variant === 'gold' || variant === 'gold-highlight') && (
        <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-executive-gold/30"></div>
      )}

      {children}
    </Card>
  );
}

/**
 * Enhanced card header with optional decorative divider
 */
export function ExecutiveCardHeader({
  children,
  showDivider = false,
  className,
  ...props
}) {
  return (
    <CardHeader
      className={cn(
        "relative",
        className
      )}
      {...props}
    >
      {children}

      {/* Decorative golden divider */}
      {showDivider && (
        <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-executive-gold/30 to-transparent"></div>
      )}
    </CardHeader>
  );
}

// Re-export for convenience
export { CardContent, CardTitle };
