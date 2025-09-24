import React from 'react';
import { FileX, Users, Wallet, FolderOpen, Search, AlertCircle } from 'lucide-react';

/**
 * EmptyState - Reusable component for empty state displays
 * Provides consistent empty state UI across the application
 *
 * @param {Object} props
 * @param {React.ComponentType} props.icon - Lucide icon component to display
 * @param {string} props.title - Main title text
 * @param {string} [props.description] - Optional description text
 * @param {React.ReactNode} [props.action] - Optional action button/component
 * @param {string} [props.className] - Additional CSS classes
 */
export function EmptyState({
  icon: Icon = FileX,
  title,
  description,
  action,
  className = ''
}) {
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

// Common preset empty states for consistency
export const EmptyStates = {
  NoData: ({ action }) => (
    <EmptyState
      icon={FileX}
      title="No data available"
      description="There's no data to display at the moment"
      action={action}
    />
  ),

  NoMembers: ({ action }) => (
    <EmptyState
      icon={Users}
      title="No members yet"
      description="Add members to start collaborating"
      action={action}
    />
  ),

  NoAccounts: ({ action }) => (
    <EmptyState
      icon={Wallet}
      title="No treasury accounts found"
      description="Create an account to manage treasury funds"
      action={action}
    />
  ),

  NoResults: ({ searchTerm, action }) => (
    <EmptyState
      icon={Search}
      title="No results found"
      description={searchTerm ? `No results matching "${searchTerm}"` : "Try adjusting your search criteria"}
      action={action}
    />
  ),

  NoRequests: ({ action }) => (
    <EmptyState
      icon={FolderOpen}
      title="No requests found"
      description="Create a request to get started"
      action={action}
    />
  ),

  Error: ({ message, action }) => (
    <EmptyState
      icon={AlertCircle}
      title="Something went wrong"
      description={message || "An error occurred while loading data"}
      action={action}
    />
  )
};

export default EmptyState;