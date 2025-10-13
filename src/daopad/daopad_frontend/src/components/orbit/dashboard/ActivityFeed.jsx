import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  User,
  Wallet,
  Shield,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { formatDateTime, formatPrincipalShort, formatBalance } from '@/utils/format';
import { cn } from '@/lib/utils';

const activityIcons = {
  user_added: User,
  user_removed: User,
  transfer_completed: Wallet,
  request_approved: CheckCircle,
  request_rejected: XCircle,
  request_created: FileText,
  request_executed: CheckCircle,
  policy_updated: Shield,
  account_added: Wallet,
  asset_added: Activity
};

const activityColors = {
  user_added: 'text-blue-600 bg-blue-50',
  user_removed: 'text-red-600 bg-red-50',
  transfer_completed: 'text-green-600 bg-green-50',
  request_approved: 'text-green-600 bg-green-50',
  request_rejected: 'text-red-600 bg-red-50',
  request_created: 'text-yellow-600 bg-yellow-50',
  request_executed: 'text-purple-600 bg-purple-50',
  policy_updated: 'text-orange-600 bg-orange-50',
  account_added: 'text-blue-600 bg-blue-50',
  asset_added: 'text-indigo-600 bg-indigo-50'
};

export function ActivityFeed({ activities, loading, onViewDetails }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Activity className="w-12 h-12 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              No recent activity
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(Number(activity.timestamp) / 1000000); // Convert from nanoseconds
    const dateKey = date.toLocaleDateString();

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
    return groups;
  }, {});

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {activities.length} events
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedActivities).map(([date, dateActivities]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground px-2">
                    {date === new Date().toLocaleDateString() ? 'Today' :
                     date === new Date(Date.now() - 86400000).toLocaleDateString() ? 'Yesterday' :
                     date}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="space-y-3">
                  {dateActivities.map((activity) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      onViewDetails={onViewDetails}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity, onViewDetails }) {
  const Icon = activityIcons[activity.type] || Activity;
  const colorClasses = activityColors[activity.type] || 'text-gray-600 bg-gray-50';

  const getActivityDescription = () => {
    switch (activity.type) {
      case 'user_added':
        return (
          <span>
            <strong>{activity.actor_name || formatPrincipalShort(activity.actor)}</strong>
            {' added user '}
            <strong>{activity.details?.user_name || 'Unknown'}</strong>
          </span>
        );
      case 'user_removed':
        return (
          <span>
            <strong>{activity.actor_name || formatPrincipalShort(activity.actor)}</strong>
            {' removed user '}
            <strong>{activity.details?.user_name || 'Unknown'}</strong>
          </span>
        );
      case 'transfer_completed':
        return (
          <span>
            <strong>{activity.actor_name || formatPrincipalShort(activity.actor)}</strong>
            {' transferred '}
            <strong>
              {formatBalance(activity.details?.amount, activity.details?.decimals || 8)}
              {' '}{activity.details?.symbol || 'tokens'}
            </strong>
            {activity.details?.to && (
              <>
                {' to '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {formatPrincipalShort(activity.details.to)}
                </code>
              </>
            )}
          </span>
        );
      case 'request_approved':
        return (
          <span>
            <strong>{activity.actor_name || formatPrincipalShort(activity.actor)}</strong>
            {' approved request '}
            <strong>#{activity.details?.request_id || 'Unknown'}</strong>
            {activity.details?.request_title && (
              <span className="text-muted-foreground"> - {activity.details.request_title}</span>
            )}
          </span>
        );
      case 'request_rejected':
        return (
          <span>
            <strong>{activity.actor_name || formatPrincipalShort(activity.actor)}</strong>
            {' rejected request '}
            <strong>#{activity.details?.request_id || 'Unknown'}</strong>
          </span>
        );
      case 'request_created':
        return (
          <span>
            <strong>{activity.actor_name || formatPrincipalShort(activity.actor)}</strong>
            {' created request '}
            <strong>#{activity.details?.request_id || 'Unknown'}</strong>
            {activity.details?.operation_type && (
              <Badge variant="outline" className="text-xs ml-2">
                {activity.details.operation_type.replace(/([A-Z])/g, ' $1').trim()}
              </Badge>
            )}
          </span>
        );
      case 'request_executed':
        return (
          <span>
            <strong>{activity.actor_name || formatPrincipalShort(activity.actor)}</strong>
            {' executed request '}
            <strong>#{activity.details?.request_id || 'Unknown'}</strong>
          </span>
        );
      case 'policy_updated':
        return (
          <span>
            <strong>{activity.actor_name || formatPrincipalShort(activity.actor)}</strong>
            {' updated policy for '}
            <Badge variant="outline" className="text-xs">
              {activity.details?.operation_type || 'Unknown'}
            </Badge>
          </span>
        );
      case 'account_added':
        return (
          <span>
            <strong>{activity.actor_name || formatPrincipalShort(activity.actor)}</strong>
            {' added account '}
            <strong>{activity.details?.account_name || 'Unknown'}</strong>
          </span>
        );
      case 'asset_added':
        return (
          <span>
            <strong>{activity.actor_name || formatPrincipalShort(activity.actor)}</strong>
            {' added asset '}
            <strong>{activity.details?.symbol || 'Unknown'}</strong>
          </span>
        );
      default:
        return (
          <span>
            <strong>{activity.actor_name || formatPrincipalShort(activity.actor)}</strong>
            {' performed '}{activity.type.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={cn("p-2 rounded-lg", colorClasses.split(' ')[1])}>
        <Icon className={cn("w-4 h-4", colorClasses.split(' ')[0])} />
      </div>

      <div className="flex-1 space-y-1">
        <div className="text-sm">
          {getActivityDescription()}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDateTime(activity.timestamp)}
          </div>

          {activity.details?.status && (
            <Badge variant="secondary" className="text-xs">
              {activity.details.status}
            </Badge>
          )}
        </div>

        {activity.details?.note && (
          <p className="text-xs text-muted-foreground mt-1">
            {activity.details.note}
          </p>
        )}
      </div>

      {activity.details?.viewable && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(activity)}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}