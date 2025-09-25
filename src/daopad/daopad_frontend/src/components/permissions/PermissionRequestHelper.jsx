import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import {
  FileText,
  Copy,
  CheckCircle,
  Users,
  Shield,
  AlertCircle,
  ChevronRight,
  Zap,
  Info
} from 'lucide-react';
import { Principal } from '@dfinity/principal';

const PermissionRequestHelper = ({ tokenId, actor, stationId }) => {
  const [selectedTier, setSelectedTier] = useState('Member');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [generatedRequest, setGeneratedRequest] = useState('');
  const [copied, setCopied] = useState(false);
  const [tierUsers, setTierUsers] = useState({ whales: [], dolphins: [], members: [] });
  const [loading, setLoading] = useState(false);

  const tierPermissions = {
    Whale: {
      emoji: '🐋',
      description: 'Full governance control for major stakeholders',
      permissions: [
        { id: 'create_high_value_proposal', name: 'Create High-Value Proposals', description: 'Proposals over $10,000' },
        { id: 'treasury_management', name: 'Treasury Management', description: 'Full treasury access and control' },
        { id: 'emergency_actions', name: 'Emergency Actions', description: 'Execute critical DAO operations' },
        { id: 'modify_dao_settings', name: 'Modify DAO Settings', description: 'Change core DAO parameters' },
        { id: 'priority_voting', name: 'Priority Voting', description: '10x voting weight multiplier' },
        { id: 'analytics_full', name: 'Full Analytics', description: 'Access to all DAO metrics' }
      ]
    },
    Dolphin: {
      emoji: '🐬',
      description: 'Standard governance for active participants',
      permissions: [
        { id: 'create_standard_proposal', name: 'Create Standard Proposals', description: 'Proposals up to $10,000' },
        { id: 'view_treasury', name: 'View Treasury Reports', description: 'Read-only treasury access' },
        { id: 'standard_voting', name: 'Standard Voting', description: '3x voting weight multiplier' },
        { id: 'participate_governance', name: 'Participate in Governance', description: 'Join governance discussions' },
        { id: 'analytics_standard', name: 'Standard Analytics', description: 'Core DAO metrics access' }
      ]
    },
    Member: {
      emoji: '👥',
      description: 'Basic participation rights',
      permissions: [
        { id: 'vote_proposals', name: 'Vote on Proposals', description: 'Cast votes on active proposals' },
        { id: 'view_dao_info', name: 'View DAO Information', description: 'Access public DAO data' },
        { id: 'basic_voting', name: 'Basic Voting', description: '1x voting weight' },
        { id: 'join_discussions', name: 'Join Discussions', description: 'Participate in forums' },
        { id: 'analytics_basic', name: 'Basic Analytics', description: 'View basic metrics' }
      ]
    }
  };

  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const generateRequest = () => {
    const tier = tierPermissions[selectedTier];
    const permissions = tier.permissions.filter(p => selectedPermissions.includes(p.id));

    const request = `
# Permission Request for ${selectedTier} Tier ${tier.emoji}

## Requested Permissions
${permissions.map(p => `- **${p.name}**: ${p.description}`).join('\n')}

## Tier Requirements
- Minimum VP: ${selectedTier === 'Whale' ? '10,000' : selectedTier === 'Dolphin' ? '1,000' : '100'}
- USD Locked: ${selectedTier === 'Whale' ? '≥$100' : selectedTier === 'Dolphin' ? '≥$10' : '≥$1'}

## Implementation Steps
1. Create user group: "${selectedTier} Tier"
2. Assign selected permissions to group
3. Add eligible users based on voting power
4. Set up permission inheritance rules

## Commands for Orbit Station
\`\`\`
Group Name: ${selectedTier} Tier
Group Type: Permission-based
Permissions: ${permissions.map(p => p.id).join(', ')}
\`\`\`
`.trim();

    setGeneratedRequest(request);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedRequest);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickTemplates = [
    {
      name: 'Full Whale Setup',
      tier: 'Whale',
      permissions: tierPermissions.Whale.permissions.map(p => p.id),
      description: 'Complete whale tier with all permissions'
    },
    {
      name: 'Standard Dolphin',
      tier: 'Dolphin',
      permissions: ['create_standard_proposal', 'view_treasury', 'standard_voting', 'participate_governance'],
      description: 'Balanced dolphin tier setup'
    },
    {
      name: 'Basic Member',
      tier: 'Member',
      permissions: ['vote_proposals', 'view_dao_info', 'basic_voting'],
      description: 'Essential member permissions'
    },
    {
      name: 'Treasury Viewer',
      tier: 'Dolphin',
      permissions: ['view_treasury', 'analytics_standard'],
      description: 'Read-only treasury access'
    }
  ];

  const applyTemplate = (template) => {
    setSelectedTier(template.tier);
    setSelectedPermissions(template.permissions);
    setTimeout(generateRequest, 100); // Allow state to update
  };

  useEffect(() => {
    if (selectedPermissions.length > 0) {
      generateRequest();
    }
  }, [selectedPermissions, selectedTier]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission Request Generator
          </CardTitle>
          <CardDescription>
            Generate permission requests for voting tier groups in Orbit Station
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="builder" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="templates">Quick Templates</TabsTrigger>
              <TabsTrigger value="builder">Permission Builder</TabsTrigger>
              <TabsTrigger value="output">Generated Request</TabsTrigger>
            </TabsList>

            {/* Quick Templates Tab */}
            <TabsContent value="templates" className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <Zap className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Use these pre-configured templates for common permission setups
                </AlertDescription>
              </Alert>

              <div className="grid gap-3">
                {quickTemplates.map((template, idx) => (
                  <Card
                    key={idx}
                    className="cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => applyTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {tierPermissions[template.tier].emoji}
                          </span>
                          <div>
                            <h4 className="font-semibold">{template.name}</h4>
                            <p className="text-sm text-gray-600">{template.description}</p>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {template.tier} Tier
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {template.permissions.length} permissions
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Permission Builder Tab */}
            <TabsContent value="builder" className="space-y-4">
              {/* Tier Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Tier</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(tierPermissions).map(([tier, config]) => (
                    <Card
                      key={tier}
                      className={`cursor-pointer transition-all ${
                        selectedTier === tier
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:border-gray-400'
                      }`}
                      onClick={() => setSelectedTier(tier)}
                    >
                      <CardContent className="p-4 text-center">
                        <span className="text-3xl">{config.emoji}</span>
                        <h4 className="font-semibold mt-2">{tier}</h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {tier === 'Whale' ? '≥10,000 VP' : tier === 'Dolphin' ? '≥1,000 VP' : '≥100 VP'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Permission Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Permissions</label>
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {tierPermissions[selectedTier].permissions.map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-start gap-3 p-3 rounded hover:bg-gray-50"
                        >
                          <Checkbox
                            id={permission.id}
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={() => handlePermissionToggle(permission.id)}
                          />
                          <label
                            htmlFor={permission.id}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="font-medium text-sm">{permission.name}</div>
                            <div className="text-xs text-gray-600">{permission.description}</div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Button
                onClick={generateRequest}
                disabled={selectedPermissions.length === 0}
                className="w-full"
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate Permission Request
              </Button>
            </TabsContent>

            {/* Generated Output Tab */}
            <TabsContent value="output" className="space-y-4">
              {generatedRequest ? (
                <>
                  <div className="relative">
                    <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                      {generatedRequest}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-3 w-3" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>

                  <Alert className="border-amber-200 bg-amber-50">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      <strong>Next Steps:</strong>
                      <ol className="mt-2 space-y-1 text-sm">
                        <li>1. Copy this request to your clipboard</li>
                        <li>2. Open Orbit Station Settings</li>
                        <li>3. Create a new user group with the specified name</li>
                        <li>4. Assign the listed permissions to the group</li>
                        <li>5. Add users based on their voting power tier</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Select a tier and permissions to generate a request
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionRequestHelper;