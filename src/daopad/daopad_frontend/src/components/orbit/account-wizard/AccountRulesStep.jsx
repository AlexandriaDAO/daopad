import React from 'react';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../ui/select';
import { Info, Shield } from 'lucide-react';

export const AccountRulesStep = ({
  accountConfig,
  setAccountConfig
}) => {
  const ruleOptions = [
    {
      value: 'none',
      label: 'No rule',
      description: 'Use default approval process',
      rule: null
    },
    {
      value: 'auto',
      label: 'Auto-approve',
      description: 'Requests are approved automatically',
      rule: { type: 'AutoApproved' }
    },
    {
      value: 'quorum-2',
      label: 'Require 2 approvals',
      description: 'Any 2 members must approve',
      rule: { type: 'Quorum', minApproved: 2 }
    },
    {
      value: 'quorum-3',
      label: 'Require 3 approvals',
      description: 'Any 3 members must approve',
      rule: { type: 'Quorum', minApproved: 3 }
    },
    {
      value: 'quorum-5',
      label: 'Require 5 approvals',
      description: 'Any 5 members must approve',
      rule: { type: 'Quorum', minApproved: 5 }
    },
    {
      value: 'quorum-50',
      label: 'Require 50% approval',
      description: 'Half of all members must approve',
      rule: { type: 'QuorumPercentage', minPercent: 50 }
    },
    {
      value: 'quorum-75',
      label: 'Require 75% approval',
      description: 'Three quarters of members must approve',
      rule: { type: 'QuorumPercentage', minPercent: 75 }
    }
  ];

  const getCurrentRuleValue = (rule) => {
    if (!rule) return 'none';
    if (rule.type === 'AutoApproved') return 'auto';
    if (rule.type === 'Quorum') {
      if (rule.minApproved === 2) return 'quorum-2';
      if (rule.minApproved === 3) return 'quorum-3';
      if (rule.minApproved === 5) return 'quorum-5';
    }
    if (rule.type === 'QuorumPercentage') {
      if (rule.minPercent === 50) return 'quorum-50';
      if (rule.minPercent === 75) return 'quorum-75';
    }
    return 'none';
  };

  const handleRuleChange = (ruleType, value) => {
    const option = ruleOptions.find(opt => opt.value === value);
    setAccountConfig(prev => ({
      ...prev,
      [ruleType]: option?.rule || null
    }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-2 items-start">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Approval Rules</p>
            <p className="text-sm text-blue-800 mt-1">
              Define how requests for this account should be approved. These rules add an additional layer of security beyond the default treasury governance.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="configs-rule">Settings Changes Rule</Label>
          <p className="text-sm text-gray-500 mb-2">
            Approval required for changing account settings and permissions
          </p>
          <Select
            value={getCurrentRuleValue(accountConfig.configsRule)}
            onValueChange={(value) => handleRuleChange('configsRule', value)}
          >
            <SelectTrigger id="configs-rule">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ruleOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="transfer-rule">Transfer Funds Rule</Label>
          <p className="text-sm text-gray-500 mb-2">
            Approval required for transferring funds from this account
          </p>
          <Select
            value={getCurrentRuleValue(accountConfig.transferRule)}
            onValueChange={(value) => handleRuleChange('transferRule', value)}
          >
            <SelectTrigger id="transfer-rule">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ruleOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex gap-2 items-start">
          <Info className="h-5 w-5 text-gray-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">How Rules Work</p>
            <ul className="text-sm text-gray-700 mt-2 space-y-1">
              <li>• <strong>No rule:</strong> Uses the treasury's default approval process</li>
              <li>• <strong>Auto-approve:</strong> Bypasses approval for trusted operations</li>
              <li>• <strong>Quorum:</strong> Requires a fixed number of approvals</li>
              <li>• <strong>Percentage:</strong> Scales with the number of members</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};