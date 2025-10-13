import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function GovernanceMetrics({ metrics, loading, onViewRequests, onViewPolicies }) {
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

  const approvalStats = {
    approved: metrics.approvedRequests || 0,
    rejected: metrics.rejectedRequests || 0,
    pending: metrics.pendingRequests || 0,
    executed: metrics.executedRequests || 0,
    total: (metrics.approvedRequests || 0) + (metrics.rejectedRequests || 0) +
           (metrics.pendingRequests || 0) + (metrics.executedRequests || 0)
  };

  const participationRate = metrics.participationRate || 0;
  const avgApprovalTime = metrics.avgApprovalTime || 0;
  const activeUsers = metrics.activeUsers || 0;
  const totalUsers = metrics.totalUsers || 0;

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participation Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{Math.round(participationRate)}%</span>
                <Badge variant="secondary" className="text-xs">
                  {activeUsers}/{totalUsers} users
                </Badge>
              </div>
              <Progress value={participationRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Active in last 30 days
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg Approval Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatDuration(avgApprovalTime)}
              </div>
              <p className="text-xs text-muted-foreground">
                Time to reach quorum
              </p>
              {metrics.fastestApproval && (
                <div className="flex items-center gap-2 text-xs">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span>Fastest: {formatDuration(metrics.fastestApproval)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Policy Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {metrics.policiesCount || 0}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewPolicies}
                  className="h-7 text-xs"
                >
                  View all
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Active policies
              </p>
              {metrics.uncoveredOperations > 0 && (
                <Badge variant="outline" className="text-xs">
                  {metrics.uncoveredOperations} operations need policies
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Statistics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Request Statistics</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onViewRequests}
            >
              View all requests
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status">By Status</TabsTrigger>
              <TabsTrigger value="type">By Type</TabsTrigger>
              <TabsTrigger value="trend">Trend</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              <div className="space-y-3">
                <StatusBar
                  label="Approved"
                  value={approvalStats.approved}
                  total={approvalStats.total}
                  color="green"
                  icon={CheckCircle}
                />
                <StatusBar
                  label="Rejected"
                  value={approvalStats.rejected}
                  total={approvalStats.total}
                  color="red"
                  icon={XCircle}
                />
                <StatusBar
                  label="Pending"
                  value={approvalStats.pending}
                  total={approvalStats.total}
                  color="yellow"
                  icon={Clock}
                />
                <StatusBar
                  label="Executed"
                  value={approvalStats.executed}
                  total={approvalStats.total}
                  color="blue"
                  icon={CheckCircle}
                />
              </div>
            </TabsContent>

            <TabsContent value="type" className="space-y-4">
              {metrics.requestsByType && Object.entries(metrics.requestsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {type.replace(/([A-Z])/g, ' $1').trim()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{count}</span>
                    <span className="text-xs text-muted-foreground">
                      ({Math.round((count / approvalStats.total) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
              {!metrics.requestsByType && (
                <p className="text-center text-muted-foreground text-sm">
                  No request type data available
                </p>
              )}
            </TabsContent>

            <TabsContent value="trend" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">This month</span>
                  <span className="font-medium">{metrics.requestsThisMonth || 0} requests</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last month</span>
                  <span className="font-medium">{metrics.requestsLastMonth || 0} requests</span>
                </div>
                {metrics.requestsThisMonth && metrics.requestsLastMonth && (
                  <div className="flex items-center gap-2">
                    {metrics.requestsThisMonth > metrics.requestsLastMonth ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">
                          +{Math.round(((metrics.requestsThisMonth - metrics.requestsLastMonth) / metrics.requestsLastMonth) * 100)}%
                        </span>
                      </>
                    ) : metrics.requestsThisMonth < metrics.requestsLastMonth ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                        <span className="text-sm text-red-600">
                          -{Math.round(((metrics.requestsLastMonth - metrics.requestsThisMonth) / metrics.requestsLastMonth) * 100)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">No change</span>
                    )}
                  </div>
                )}
              </div>

              {/* Weekly breakdown */}
              {metrics.weeklyRequests && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Weekly Activity</p>
                  <div className="grid grid-cols-7 gap-1">
                    {metrics.weeklyRequests.map((count, index) => (
                      <div
                        key={index}
                        className="flex flex-col items-center gap-1"
                      >
                        <div
                          className={cn(
                            "w-full rounded",
                            count > 0 ? "bg-primary" : "bg-muted"
                          )}
                          style={{
                            height: `${Math.max(4, count * 4)}px`,
                            opacity: count > 0 ? 0.2 + (count / Math.max(...metrics.weeklyRequests)) * 0.8 : 0.2
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'][index]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Top Approvers */}
      {metrics.topApprovers && metrics.topApprovers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Approvers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.topApprovers.map((approver, index) => (
                <div key={approver.principal} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                      index === 0 ? "bg-yellow-100 text-yellow-700" :
                      index === 1 ? "bg-gray-100 text-gray-700" :
                      index === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{approver.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {approver.approvalCount} approvals
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round((approver.approvalCount / approvalStats.approved) * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBar({ label, value, total, color, icon: Icon }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "p-1.5 rounded",
        color === "green" ? "bg-green-100" :
        color === "red" ? "bg-red-100" :
        color === "yellow" ? "bg-yellow-100" :
        color === "blue" ? "bg-blue-100" :
        "bg-gray-100"
      )}>
        <Icon className={cn(
          "w-3 h-3",
          color === "green" ? "text-green-600" :
          color === "red" ? "text-red-600" :
          color === "yellow" ? "text-yellow-600" :
          color === "blue" ? "text-blue-600" :
          "text-gray-600"
        )} />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span>{label}</span>
          <span className="font-medium">{value}</span>
        </div>
        <Progress value={percentage} className="h-1.5" />
      </div>
    </div>
  );
}

function formatDuration(nanoseconds) {
  if (!nanoseconds) return "N/A";

  const ms = Number(nanoseconds) / 1000000;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}