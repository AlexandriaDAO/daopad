import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { TrendingUp, Users, Shield, AlertCircle, Info } from 'lucide-react';
import { Principal } from '@dfinity/principal';

const VotingTierDisplay = ({ tokenId, actor, identity }) => {
  const isAuthenticated = !!identity;
  const userPrincipal = identity?.getPrincipal?.()?.toText?.() || null;
  const [votingTier, setVotingTier] = useState(null);
  const [votingPower, setVotingPower] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tierBenefits, setTierBenefits] = useState([]);

  const tierConfig = {
    Whale: {
      emoji: '🐋',
      minVP: 10000,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      benefits: [
        'Full governance participation',
        'Create high-value proposals',
        'Priority voting weight',
        'Treasury management access',
        'Advanced analytics access'
      ],
      description: '≥ $100 USD in locked LPs'
    },
    Dolphin: {
      emoji: '🐬',
      minVP: 1000,
      color: 'bg-cyan-500',
      textColor: 'text-cyan-600',
      benefits: [
        'Standard governance participation',
        'Create standard proposals',
        'Regular voting weight',
        'View treasury reports',
        'Basic analytics access'
      ],
      description: '≥ $10 USD in locked LPs'
    },
    Member: {
      emoji: '👥',
      minVP: 100,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      benefits: [
        'Basic governance participation',
        'Vote on proposals',
        'View DAO information',
        'Join discussions',
        'Access member resources'
      ],
      description: '≥ $1 USD in locked LPs'
    },
    None: {
      emoji: '👤',
      minVP: 0,
      color: 'bg-gray-400',
      textColor: 'text-gray-600',
      benefits: [
        'View public DAO information',
        'No voting rights',
        'Observer status only'
      ],
      description: '< $1 USD in locked LPs'
    }
  };

  useEffect(() => {
    if (isAuthenticated && userPrincipal && tokenId && actor) {
      fetchVotingTier();
    }
  }, [isAuthenticated, userPrincipal, tokenId, actor]);

  const fetchVotingTier = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get user's voting tier
      const tierResult = await actor.get_user_voting_tier(
        Principal.fromText(tokenId),
        Principal.fromText(userPrincipal)
      );

      if (tierResult && tierResult.length > 0) {
        const [tier, power] = tierResult[0];

        // Extract tier name from variant
        let tierName = 'None';
        if (tier.Whale !== undefined) tierName = 'Whale';
        else if (tier.Dolphin !== undefined) tierName = 'Dolphin';
        else if (tier.Member !== undefined) tierName = 'Member';

        setVotingTier(tierName);
        setVotingPower(Number(power));
        setTierBenefits(tierConfig[tierName].benefits);
      }
    } catch (err) {
      console.error('Error fetching voting tier:', err);
      setError('Failed to load voting tier information');
    } finally {
      setLoading(false);
    }
  };

  const getProgressToNextTier = () => {
    if (!votingTier || votingTier === 'Whale') return null;

    const currentConfig = tierConfig[votingTier];
    let nextTier = null;
    let nextMinVP = 0;

    if (votingTier === 'None') {
      nextTier = 'Member';
      nextMinVP = tierConfig.Member.minVP;
    } else if (votingTier === 'Member') {
      nextTier = 'Dolphin';
      nextMinVP = tierConfig.Dolphin.minVP;
    } else if (votingTier === 'Dolphin') {
      nextTier = 'Whale';
      nextMinVP = tierConfig.Whale.minVP;
    }

    if (!nextTier) return null;

    const progress = (votingPower / nextMinVP) * 100;
    const remaining = nextMinVP - votingPower;

    return {
      nextTier,
      nextMinVP,
      progress: Math.min(progress, 100),
      remaining,
      emoji: tierConfig[nextTier].emoji
    };
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Voting Tier
          </CardTitle>
          <CardDescription>Connect wallet to view your voting tier</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentTierConfig = votingTier ? tierConfig[votingTier] : tierConfig.None;
  const progressInfo = getProgressToNextTier();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Your Voting Tier
        </CardTitle>
        <CardDescription>Based on Kong Locker voting power</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Tier Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{currentTierConfig.emoji}</span>
            <div>
              <h3 className={`text-2xl font-bold ${currentTierConfig.textColor}`}>
                {votingTier || 'None'}
              </h3>
              <p className="text-sm text-gray-600">{currentTierConfig.description}</p>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="px-3 py-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {votingPower.toLocaleString()} VP
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Voting Power from Kong Locker</p>
                <p className="text-xs text-gray-400">1 VP = $0.01 USD locked</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Progress to Next Tier */}
        {progressInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress to {progressInfo.nextTier}</span>
              <span className="font-medium">
                {progressInfo.remaining.toLocaleString()} VP needed {progressInfo.emoji}
              </span>
            </div>
            <Progress value={progressInfo.progress} className="h-2" />
            <p className="text-xs text-gray-500">
              {progressInfo.progress.toFixed(1)}% complete ({votingPower.toLocaleString()} / {progressInfo.nextMinVP.toLocaleString()} VP)
            </p>
          </div>
        )}

        {/* Tier Benefits */}
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Tier Benefits
          </h4>
          <ul className="space-y-1">
            {tierBenefits.map((benefit, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className={`${currentTierConfig.textColor} mt-1`}>•</span>
                <span className="text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">How Voting Tiers Work</p>
              <p className="text-blue-700">
                Your voting tier is determined by the USD value of LP tokens you've locked in Kong Locker.
                Higher tiers unlock more governance features and greater voting weight in DAO decisions.
              </p>
              {votingTier === 'None' && (
                <p className="text-blue-700 mt-2">
                  Lock at least $1 worth of LP tokens to become a Member and participate in governance.
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VotingTierDisplay;