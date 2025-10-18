import React from 'react';
import { FileX, Users, Wallet, FolderOpen, Search, AlertCircle, LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/**
 * EmptyState - Reusable component for empty state displays
 * Provides consistent empty state UI across the application
 */
export function EmptyState({
  icon: Icon = FileX,
  title,
  description,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-center max-w-sm mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

interface PresetEmptyStateProps {
  action?: React.ReactNode
}

interface NoResultsProps {
  searchTerm?: string
  action?: React.ReactNode
}

interface ErrorStateProps {
  message?: string
  action?: React.ReactNode
}

// Common preset empty states for consistency
export const EmptyStates = {
  NoData: ({ action }: PresetEmptyStateProps) => (
    <EmptyState
      icon={FileX}
      title="No data available"
      description="There's no data to display at the moment"
      action={action}
    />
  ),

  NoMembers: ({ action }: PresetEmptyStateProps) => (
    <EmptyState
      icon={Users}
      title="No members yet"
      description="Add members to start collaborating"
      action={action}
    />
  ),

  NoAccounts: ({ action }: PresetEmptyStateProps) => (
    <EmptyState
      icon={Wallet}
      title="No treasury accounts found"
      description="Create an account to manage treasury funds"
      action={action}
    />
  ),

  NoResults: ({ searchTerm, action }: NoResultsProps) => (
    <EmptyState
      icon={Search}
      title="No results found"
      description={searchTerm ? `No results matching "${searchTerm}"` : "Try adjusting your search criteria"}
      action={action}
    />
  ),

  NoRequests: ({ action }: PresetEmptyStateProps) => (
    <EmptyState
      icon={FolderOpen}
      title="No requests found"
      description="Create a request to get started"
      action={action}
    />
  ),

  Error: ({ message, action }: ErrorStateProps) => (
    <EmptyState
      icon={AlertCircle}
      title="Something went wrong"
      description={message || "An error occurred while loading data"}
      action={action}
    />
  )
};

export default EmptyState;