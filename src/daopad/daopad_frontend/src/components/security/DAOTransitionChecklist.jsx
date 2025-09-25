import React, { useState, useEffect } from 'react';
import { Progress } from '../ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Sparkles,
  Info,
  ArrowRight,
  ExternalLink,
  Shield,
  Users,
  Lock,
  Settings,
  Zap
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const DAOTransitionChecklist = ({ securityData, stationId, tokenSymbol, onRefresh }) => {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedChecks, setExpandedChecks] = useState({});
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('foundation');
  const [journeyData, setJourneyData] = useState({
    foundation: [],
    decentralization: [],
    security: [],
    governance: [],
    advanced: []
  });

  const categoryInfo = {
    foundation: {
      label: "Foundation",
      icon: Settings,
      description: "Basic setup and deployment",
      color: "text-gray-900 bg-gray-100 border-gray-300"
    },
    decentralization: {
      label: "Decentralization",
      icon: Users,
      description: "Transfer control from individuals to community",
      color: "text-gray-900 bg-gray-100 border-gray-300"
    },
    security: {
      label: "Security Controls",
      icon: Shield,
      description: "Protect your treasury with proper policies",
      color: "text-gray-900 bg-gray-100 border-gray-300"
    },
    governance: {
      label: "Community Governance",
      icon: Users,
      description: "Enable token holder voting and proposals",
      color: "text-gray-900 bg-gray-100 border-gray-300"
    },
    advanced: {
      label: "Advanced Features",
      icon: Zap,
      description: "Optional optimizations and enhancements",
      color: "text-gray-900 bg-gray-100 border-gray-300"
    }
  };

  const transformCheckToUserFriendly = (check) => {
    const mappings = {
      'Admin Control': {
        category: 'decentralization',
        icon: '🔄',
        title: 'Who Controls Your Treasury?',
        getStatus: (check) => {
          if (check.status === 'Pass') return {
            icon: '✅',
            label: 'Community Controlled',
            message: 'Treasury fully controlled by token holders',
            color: 'text-green-600'
          };

          const adminCount = check.message.match(/\d+/)?.[0];
          if (adminCount && parseInt(adminCount) > 1) return {
            icon: '⚠️',
            label: 'Mixed Control',
            message: check.message,
            explanation: 'Multiple admins means any one of them could act without community approval. This is common during setup but should be changed for a true DAO.',
            impact: 'Risk: Any admin can bypass community decisions',
            solution: 'In Orbit Station: Go to Settings > Members > Remove non-DAOPad admins, keeping only the DAOPad backend principal as admin',
            color: 'text-yellow-600'
          };

          return {
            icon: '❌',
            label: 'Manual Control Only',
            message: 'DAOPad cannot manage your treasury',
            explanation: 'Without DAOPad as admin, all actions require manual approval from individual administrators.',
            impact: 'Your token holders cannot participate in governance',
            solution: 'In Orbit Station: Settings > Members > Add DAOPad principal as admin: lwsav-iiaaa-aaaap-qp2qq-cai',
            color: 'text-red-600'
          };
        }
      },
      'Group Permissions': {
        category: 'security',
        icon: '🔒',
        title: 'Permission Distribution',
        getStatus: (check) => {
          if (check.status === 'Error') return {
            icon: '🔄',
            label: 'Verification Pending',
            message: 'Permission check temporarily unavailable',
            explanation: 'We\'re updating our systems. You can verify manually in Orbit Station.',
            action: {
              label: 'Check in Orbit Station',
              url: `https://orbitstation.org/station/${stationId}/permissions`,
              external: true
            },
            color: 'text-gray-600'
          };

          return check.status === 'Pass' ? {
            icon: '✅',
            label: 'Properly Restricted',
            message: 'All permissions correctly assigned',
            color: 'text-green-600'
          } : {
            icon: '⚠️',
            label: 'Review Needed',
            message: check.message,
            solution: 'Review and update permission assignments',
            color: 'text-yellow-600'
          };
        }
      },
      'Request Approval Policies': {
        category: 'security',
        icon: '⚖️',
        title: 'How Are Decisions Made?',
        getStatus: (check) => {
          const bypassCount = parseInt(check.message.match(/\d+/)?.[0] || '0');

          if (bypassCount === 0) return {
            icon: '✅',
            label: 'Community Approval Required',
            message: 'All actions need community votes',
            explanation: 'Excellent! Every treasury action requires proper governance.',
            impact: 'Full transparency and community control',
            color: 'text-green-600'
          };

          if (bypassCount < 5) return {
            icon: '🔄',
            label: 'Development Mode',
            message: `${bypassCount} policies allow quick testing`,
            explanation: 'This is fine during setup but should be changed before going live.',
            impact: 'Faster testing, but not suitable for production',
            solution: 'In Orbit Station: Settings > Policies > Change each policy to require "Admin" approval instead of "Auto-approved"',
            color: 'text-blue-600'
          };

          return {
            icon: '⚠️',
            label: 'Bypasses Possible',
            message: check.message,
            explanation: 'Some treasury operations can skip community approval.',
            impact: 'Community votes can be circumvented',
            solution: 'In Orbit Station: Settings > Policies > Review each policy and set approval to "Admin" (which means community via DAOPad)',
            color: 'text-yellow-600'
          };
        }
      },
      'System Settings': {
        category: 'foundation',
        icon: '🏗️',
        title: 'Core Configuration',
        getStatus: () => ({
          icon: '✅',
          label: 'Properly Configured',
          message: 'System settings are secure',
          color: 'text-green-600'
        })
      }
    };

    const mapping = mappings[check.name] || {
      category: 'advanced',
      icon: '⚡',
      title: check.name,
      getStatus: () => ({
        message: check.message,
        color: 'text-gray-600'
      })
    };

    const status = mapping.getStatus(check);

    return {
      ...check,
      category: mapping.category,
      categoryIcon: mapping.icon,
      userFriendlyTitle: mapping.title,
      ...status
    };
  };

  const calculateProgress = (journey) => {
    const weights = {
      foundation: 20,
      decentralization: 35,
      security: 25,
      governance: 15,
      advanced: 5
    };

    let totalScore = 0;
    let maxScore = 0;
    let currentStage = 'foundation';

    Object.entries(journey).forEach(([category, checks]) => {
      if (checks.length === 0) return;

      const weight = weights[category] || 10;
      maxScore += weight;

      const passed = checks.filter(c => c.icon === '✅').length;
      const partial = checks.filter(c => ['🔄', '⚠️'].includes(c.icon)).length;

      const categoryScore = ((passed + partial * 0.5) / checks.length) * weight;
      totalScore += categoryScore;

      if (categoryScore < weight * 0.8 && currentStage === 'foundation') {
        currentStage = category;
      }
    });

    const progressPercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    setProgress(progressPercent);
    setStage(currentStage);

    return progressPercent;
  };

  useEffect(() => {
    if (securityData?.checks) {
      const transformed = {
        foundation: [],
        decentralization: [],
        security: [],
        governance: [],
        advanced: []
      };

      securityData.checks.forEach(check => {
        const userFriendly = transformCheckToUserFriendly(check);
        const category = userFriendly.category;
        if (transformed[category]) {
          transformed[category].push(userFriendly);
        }
      });

      setJourneyData(transformed);
      calculateProgress(transformed);
    }
  }, [securityData]);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleCheck = (checkId) => {
    setExpandedChecks(prev => ({
      ...prev,
      [checkId]: !prev[checkId]
    }));
  };

  const getStageMessage = () => {
    const messages = {
      foundation: "Getting started with your DAO journey",
      decentralization: "Working towards community control",
      security: "Establishing proper safeguards",
      governance: "Enabling community participation",
      advanced: "Optimizing your DAO operations"
    };
    return messages[stage] || "Building your DAO";
  };

  const InfoTooltip = ({ term, children }) => {
    const definitions = {
      dao: "A Decentralized Autonomous Organization where decisions are made by token holders, not individuals",
      admin: "The account that can execute treasury operations. Should be the community (via DAOPad), not individuals",
      voting_power: "Your influence in decisions, based on your locked LP tokens",
      quorum: "Minimum participation needed for a vote to be valid",
      proposal: "A suggestion for the DAO to take action, voted on by members"
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center cursor-help">
              {children}
              <Info className="ml-1 w-3 h-3 text-gray-400" />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{definitions[term]}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const CheckItem = ({ check }) => {
    const isExpanded = expandedChecks[check.name];

    // Determine status color and symbol
    const statusConfig = {
      '✅': {
        border: 'border-l-green-500',
        text: 'text-green-400',
        label: 'PASS'
      },
      '⚠️': {
        border: 'border-l-yellow-500',
        text: 'text-yellow-400',
        label: 'WARN'
      },
      '❌': {
        border: 'border-l-red-500',
        text: 'text-red-400',
        label: 'FAIL'
      },
      '🔄': {
        border: 'border-l-blue-500',
        text: 'text-blue-400',
        label: 'PENDING'
      }
    };

    const status = statusConfig[check.icon] || {
      border: 'border-l-gray-500',
      text: 'text-gray-400',
      label: 'UNKNOWN'
    };

    return (
      <div className={`border-l-2 ${status.border} bg-gray-800/50 p-2 mb-1 hover:bg-gray-800/70 transition-colors`}>
        <div
          className="cursor-pointer"
          onClick={() => toggleCheck(check.name)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-xs ${status.text} font-bold`}>[{status.label}]</span>
                <h4 className="text-sm font-medium text-gray-200">{check.userFriendlyTitle}</h4>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 ml-12">{check.message}</p>
            </div>
            <ChevronRight className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
        </div>

        {isExpanded && (
          <div className="mt-2 ml-12 space-y-1.5 border-t border-gray-700 pt-2">
            {/* Technical explanation */}
            <div className="text-xs text-gray-300">
              <span className="font-semibold text-gray-200">Technical Context:</span>
              <p className="mt-0.5 text-gray-400">{check.explanation || 'This check verifies proper configuration of your DAO settings.'}</p>
            </div>

            {/* Impact analysis */}
            {check.impact && (
              <div className="text-xs text-gray-300">
                <span className="font-semibold text-gray-200">Security Impact:</span>
                <p className="mt-0.5 text-gray-400">{check.impact}</p>
              </div>
            )}

            {/* Resolution steps */}
            {check.solution && (
              <div className="text-xs text-gray-300">
                <span className="font-semibold text-gray-200">Resolution:</span>
                <p className="mt-0.5 text-gray-400">{check.solution}</p>
                {check.action && check.action.external && check.action.url && (
                  <p className="mt-1 text-gray-500">
                    → Visit Orbit Station to make this change: <span className="font-mono">{check.action.url}</span>
                  </p>
                )}
              </div>
            )}

            {/* Raw technical details */}
            {check.details && (
              <details className="text-xs text-gray-500 mt-1.5">
                <summary className="cursor-pointer font-mono hover:text-gray-400">
                  [View Raw Data]
                </summary>
                <pre className="mt-1 p-1.5 bg-gray-900 border border-gray-700 rounded text-xs font-mono overflow-auto max-h-32 text-gray-500">
                  {typeof check.details === 'string' ? check.details : JSON.stringify(check.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    );
  };

  const CategorySection = ({ category, checks, isExpanded }) => {
    const info = categoryInfo[category];
    const Icon = info.icon;
    const passedCount = checks.filter(c => c.icon === '✅').length;
    const failedCount = checks.filter(c => c.icon === '❌').length;
    const warningCount = checks.filter(c => c.icon === '⚠️').length;

    return (
      <div className="mb-2">
        <div
          className="flex items-center justify-between p-2 bg-gray-800/70 border border-gray-700 cursor-pointer hover:bg-gray-800 transition-colors"
          onClick={() => toggleCategory(category)}
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-400" />
            <div>
              <h3 className="text-sm font-medium text-gray-200">{info.label}</h3>
              <p className="text-xs text-gray-500">{info.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {checks.length > 0 && (
              <div className="flex gap-2 text-xs font-mono">
                <span className="text-green-400">✓ {passedCount}</span>
                {warningCount > 0 && <span className="text-yellow-400">⚠ {warningCount}</span>}
                {failedCount > 0 && <span className="text-red-400">✗ {failedCount}</span>}
              </div>
            )}
            <ChevronRight className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
        </div>

        {isExpanded && checks.length > 0 && (
          <div className="mt-1 ml-2">
            {checks.map(check => (
              <CheckItem key={check.name} check={check} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const NextStepsGuide = () => {
    const getNextSteps = () => {
      const steps = [];

      journeyData.decentralization.forEach(check => {
        if (check.icon !== '✅' && check.action) {
          steps.push({
            priority: 'HIGH',
            title: check.action.label || 'Fix ' + check.userFriendlyTitle,
            description: check.solution || check.message,
            action: check.action,
            category: 'decentralization'
          });
        }
      });

      journeyData.security.forEach(check => {
        if (check.icon === '⚠️' && check.action) {
          steps.push({
            priority: 'MEDIUM',
            title: check.action.label || 'Review ' + check.userFriendlyTitle,
            description: check.solution || check.message,
            action: check.action,
            category: 'security'
          });
        }
      });

      if (steps.length === 0 && progress < 100) {
        steps.push({
          priority: 'LOW',
          title: 'Continue DAO Setup',
          description: 'Complete remaining configuration steps',
          category: 'general'
        });
      }

      return steps.slice(0, 5);
    };

    const nextSteps = getNextSteps();
    if (nextSteps.length === 0) return null;

    return (
      <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-800/50">
        <h3 className="text-xs font-bold text-yellow-400 mb-2">MANUAL ACTIONS REQUIRED</h3>
        <div className="space-y-1.5">
          {nextSteps.map((step, idx) => (
            <div key={idx} className="text-xs">
              <div className="flex items-start gap-2">
                <span className={`font-mono font-bold ${
                  step.priority === 'HIGH' ? 'text-red-400' :
                  step.priority === 'MEDIUM' ? 'text-yellow-400' :
                  'text-gray-500'
                }`}>
                  [{step.priority}]
                </span>
                <div className="flex-1">
                  <span className="font-medium text-gray-200">{step.title}</span>
                  <p className="text-gray-400 mt-0.5">{step.description}</p>
                  {step.priority === 'HIGH' && (
                    <p className="text-gray-500 mt-1 ml-2">
                      → Access your Orbit Station settings to make this change
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2 border-t border-gray-800 pt-2">
          Note: These changes must be made manually in your Orbit Station interface. DAOPad cannot make these changes for you.
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <Card className="border border-gray-700 bg-gray-900">
        <div className="bg-gray-900 border-b border-gray-800 p-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-100">
                {tokenSymbol} Treasury Security Analysis
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">
                Station: {stationId}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-mono font-bold text-gray-100">{progress}%</div>
              <div className="text-xs text-gray-500">
                Decentralization
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="bg-gray-800 rounded overflow-hidden h-1.5">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1 font-mono">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-gray-900/50 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono font-bold ${
              progress < 30 ? 'text-red-400' :
              progress < 60 ? 'text-yellow-400' :
              progress < 90 ? 'text-blue-400' :
              'text-green-400'
            }`}>
              [{progress < 30 ? 'HIGH RISK' :
                progress < 60 ? 'MEDIUM RISK' :
                progress < 90 ? 'LOW RISK' :
                'SECURE'}]
            </span>
            <span className="text-xs text-gray-300">
              {progress < 50 ?
                'Individual admins control treasury - community cannot govern' :
                progress < 100 ?
                'Partial community control - some admin overrides exist' :
                'Full community governance - no individual control'}
            </span>
          </div>
        </div>

        <CardContent className="pt-4">
          {Object.entries(journeyData).map(([category, checks]) => {
            if (checks.length === 0) return null;
            return (
              <CategorySection
                key={category}
                category={category}
                checks={checks}
                isExpanded={expandedCategories[category] !== false}
              />
            );
          })}

          <NextStepsGuide />

          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-7 text-xs border-gray-700 text-gray-300 bg-gray-800 hover:bg-gray-700"
            >
              Refresh Analysis
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-gray-700 text-gray-300 bg-gray-800 hover:bg-gray-700"
            >
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DAOTransitionChecklist;