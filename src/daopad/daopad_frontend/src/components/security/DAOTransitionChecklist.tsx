import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

const DAOTransitionChecklist = ({ securityData, stationId, tokenSymbol, onRefresh }) => {
  // Group checks by risk level
  const groupedChecks = useMemo(() => {
    if (!securityData?.checks) return { critical: [], high: [], medium: [], low: [], passing: [] };

    const groups = {
      critical: [], // Fail + Critical severity
      high: [],     // Fail + High severity
      medium: [],   // Fail/Warn + Medium severity
      low: [],      // Warn + Low severity
      passing: [],  // Pass
    };

    securityData.checks.forEach(check => {
      if (check.status === 'Fail' && check.severity === 'Critical') {
        groups.critical.push(check);
      } else if (check.status === 'Fail' && check.severity === 'High') {
        groups.high.push(check);
      } else if ((check.status === 'Fail' || check.status === 'Warn') &&
                 (check.severity === 'Medium' || check.severity === 'Low')) {
        groups.medium.push(check);
      } else if (check.status === 'Warn') {
        groups.low.push(check);
      } else if (check.status === 'Pass') {
        groups.passing.push(check);
      }
    });

    return groups;
  }, [securityData]);

  const [expandedSections, setExpandedSections] = useState({
    critical: true,  // Always expanded
    high: false,
    medium: false,
    low: false,
    passing: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getScoreColorClass = (score) => {
    if (score < 30) return 'border-red-500 bg-red-950 text-red-200';
    if (score < 60) return 'border-orange-500 bg-orange-950 text-orange-200';
    if (score < 85) return 'border-yellow-500 bg-yellow-950 text-yellow-200';
    return 'border-green-500 bg-green-950 text-green-200';
  };

  const getScoreColor = (score) => {
    if (score < 30) return 'text-red-400';
    if (score < 60) return 'text-orange-400';
    if (score < 85) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getScoreLabel = (score) => {
    if (score < 30) return 'NOT A DAO';
    if (score < 60) return 'PARTIAL DAO';
    if (score < 85) return 'MOSTLY DECENTRALIZED';
    return 'TRUE DAO';
  };

  if (!securityData) return null;

  return (
    <div className="space-y-4">
      {/* BIG SCORE DISPLAY */}
      <Card className={`border-2 ${getScoreColorClass(securityData.decentralization_score)}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2">
                {securityData.decentralization_score}% Decentralized
              </h2>
              <p className="text-lg font-semibold mb-2">
                {getScoreLabel(securityData.decentralization_score)}
              </p>
              <p className="text-sm opacity-80">
                {securityData.risk_summary || 'Security analysis complete'}
              </p>
            </div>
            <div className="ml-6">
              {/* Circular progress indicator */}
              <div className="relative w-24 h-24">
                <svg className="transform -rotate-90 w-24 h-24">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - securityData.decentralization_score / 100)}`}
                    className={getScoreColor(securityData.decentralization_score)}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold">
                    {securityData.decentralization_score}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CRITICAL RISKS - Always visible, red */}
      {groupedChecks.critical.length > 0 && (
        <RiskSection
          title="🚨 CRITICAL RISKS - Immediate Action Required"
          checks={groupedChecks.critical}
          expanded={true}
          alwaysExpanded={true}
          colorClass="border-red-500 bg-red-950/50"
          badgeClass="bg-red-900 text-red-200"
          description="These issues prevent true DAO governance. Individual admins can bypass community."
        />
      )}

      {/* HIGH RISKS - Collapsed by default, orange */}
      {groupedChecks.high.length > 0 && (
        <RiskSection
          title="⚠️ HIGH RISKS - Significant Concerns"
          checks={groupedChecks.high}
          expanded={expandedSections.high}
          onToggle={() => toggleSection('high')}
          colorClass="border-orange-500 bg-orange-950/50"
          badgeClass="bg-orange-900 text-orange-200"
          description="These issues create backdoors that could undermine governance."
        />
      )}

      {/* MEDIUM RISKS - Collapsed, yellow */}
      {groupedChecks.medium.length > 0 && (
        <RiskSection
          title="⚠️ MEDIUM RISKS - Review Recommended"
          checks={groupedChecks.medium}
          expanded={expandedSections.medium}
          onToggle={() => toggleSection('medium')}
          colorClass="border-yellow-500 bg-yellow-950/50"
          badgeClass="bg-yellow-900 text-yellow-200"
          description="These configurations may need adjustment for production."
        />
      )}

      {/* LOW RISKS - Collapsed, blue */}
      {groupedChecks.low.length > 0 && (
        <RiskSection
          title="ℹ️ LOW RISKS - Minor Warnings"
          checks={groupedChecks.low}
          expanded={expandedSections.low}
          onToggle={() => toggleSection('low')}
          colorClass="border-blue-500 bg-blue-950/50"
          badgeClass="bg-blue-900 text-blue-200"
          description="Low priority items that may be reviewed later."
        />
      )}

      {/* PASSING CHECKS - Hidden by default, green */}
      {groupedChecks.passing.length > 0 && (
        <RiskSection
          title={`✓ ${groupedChecks.passing.length} Checks Passing`}
          checks={groupedChecks.passing}
          expanded={expandedSections.passing}
          onToggle={() => toggleSection('passing')}
          colorClass="border-green-500 bg-green-950/50"
          badgeClass="bg-green-900 text-green-200"
          description="These settings are secure and properly configured."
        />
      )}

      {/* RECOMMENDED ACTIONS */}
      {securityData.recommended_actions && securityData.recommended_actions.length > 0 && (
        <Card className="border-2 border-blue-500 bg-blue-950/50">
          <CardHeader>
            <h3 className="text-lg font-bold text-blue-300 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Next Steps to Full Decentralization
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {securityData.recommended_actions.map((action, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <p className="text-sm text-blue-200 flex-1">{action}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* REFRESH BUTTON */}
      <div className="flex justify-end">
        <Button onClick={onRefresh} variant="outline">
          Refresh Analysis
        </Button>
      </div>
    </div>
  );
};

// Helper component for risk sections
const RiskSection = ({ title, checks, expanded, onToggle, alwaysExpanded, colorClass, badgeClass, description }) => (
  <Card className={`border-2 ${colorClass}`}>
    <CardHeader
      className={`cursor-pointer hover:opacity-80 ${alwaysExpanded ? '' : ''}`}
      onClick={alwaysExpanded ? undefined : onToggle}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-100">{title}</h3>
          <p className="text-sm mt-1 opacity-80 text-gray-300">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${badgeClass}`}>
            {checks.length} {checks.length === 1 ? 'issue' : 'issues'}
          </span>
          {!alwaysExpanded && (
            <ChevronDown
              className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          )}
        </div>
      </div>
    </CardHeader>

    {(expanded || alwaysExpanded) && (
      <CardContent className="p-4 space-y-2">
        {checks.map((check, idx) => (
          <CheckItem key={idx} check={check} />
        ))}
      </CardContent>
    )}
  </Card>
);

// Helper component for individual check items
const CheckItem = ({ check }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusBadge = (status) => {
    const badges = {
      'Fail': 'bg-red-900 text-red-200',
      'Warn': 'bg-yellow-900 text-yellow-200',
      'Pass': 'bg-green-900 text-green-200',
      'Error': 'bg-gray-800 text-gray-200',
    };
    return badges[status] || 'bg-gray-800 text-gray-200';
  };

  return (
    <div className="border rounded-lg p-3 hover:bg-gray-800/50 transition-colors">
      <div className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getStatusBadge(check.status)}`}>
                {check.status}
              </span>
              {check.severity && check.severity !== 'None' && (
                <span className="text-xs text-gray-500">
                  {check.severity}
                </span>
              )}
              <h4 className="font-semibold">{check.name}</h4>
            </div>
            <p className="text-sm text-gray-300">{check.message}</p>
          </div>
          <ChevronRight
            className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pl-6 space-y-2 border-t pt-3">
          {check.details && (
            <div className="text-sm">
              <span className="font-semibold">Details:</span>
              <p className="text-gray-300 mt-1">{check.details}</p>
            </div>
          )}

          {check.recommendation && (
            <div className="text-sm">
              <span className="font-semibold text-blue-400">How to Fix:</span>
              <p className="text-gray-300 mt-1">{check.recommendation}</p>
            </div>
          )}

          <div className="text-xs text-gray-400">
            Category: {check.category}
            {check.severity && check.severity !== 'None' && ` | Severity: ${check.severity}`}
          </div>
        </div>
      )}
    </div>
  );
};

export default DAOTransitionChecklist;
