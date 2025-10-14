import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-12 items-center justify-center rounded-lg p-1.5",

      // Default variant - standard shadcn styling
      variant === "default" && "bg-muted text-muted-foreground",

      // Executive variant - golden professional styling
      variant === "executive" && [
        "bg-executive-darkGray/80",
        "border-2 border-executive-gold/40",
        "backdrop-blur-sm",
        "shadow-lg shadow-executive-gold/10"
      ],

      className
    )}
    {...props} />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium",
      "ring-offset-background transition-all duration-300",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",

      // Default variant
      variant === "default" && [
        "data-[state=active]:bg-background",
        "data-[state=active]:text-foreground",
        "data-[state=active]:shadow-sm"
      ],

      // Executive variant - golden active state with glow
      variant === "executive" && [
        // Inactive state
        "text-executive-lightGray/80",
        "hover:text-executive-goldLight",
        "hover:bg-executive-gold/10",

        // Active state with golden glow
        "data-[state=active]:bg-gradient-to-br data-[state=active]:from-executive-gold/20 data-[state=active]:to-executive-gold/10",
        "data-[state=active]:text-executive-goldLight",
        "data-[state=active]:border data-[state=active]:border-executive-gold/50",
        "data-[state=active]:shadow-lg data-[state=active]:shadow-executive-gold/30",

        // Smooth transitions
        "transition-all duration-300 ease-in-out",

        // Icon scaling on hover
        "hover:scale-[1.02] active:scale-[0.98]"
      ],

      className
    )}
    {...props} />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
