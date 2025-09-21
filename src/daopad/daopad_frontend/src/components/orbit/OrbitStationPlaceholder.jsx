import React from 'react';
import { AlertCircle, Clock, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ORBIT_PANEL_URL = 'https://orbit.orbitcontrol.panel';

const STATUS_COPY = {
  linked: {
    badge: 'Station Linked',
    Icon: null,
    message: (tokenSymbol) => `An Orbit Station treasury is active for ${tokenSymbol}.`,
  },
  proposal: {
    badge: 'Link Proposal Pending',
    Icon: Clock,
    message: (tokenSymbol) => `A treasury link proposal for ${tokenSymbol} is awaiting approval. Once executed, the Orbit shell will unlock automatically.`,
  },
  missing: {
    badge: 'No Station Linked',
    Icon: AlertCircle,
    message: (tokenSymbol) => `No Orbit Station treasury is linked to ${tokenSymbol}. Create one in Orbit Station and link it through DAOPad to unlock treasury management.`,
  },
  error: {
    badge: 'Station Lookup Failed',
    Icon: AlertCircle,
    message: (tokenSymbol) => `We could not confirm the Orbit Station status for ${tokenSymbol}. Try again or redeploy the treasury link.`,
  },
  unknown: {
    badge: 'Station Status Pending',
    Icon: HelpCircle,
    message: (tokenSymbol) => `We are still loading Orbit Station details for ${tokenSymbol}. This usually resolves in a moment.`,
  },
  'no-token': {
    badge: 'Select a Token',
    Icon: HelpCircle,
    message: () => 'Select a token with locked liquidity to manage its Orbit Station treasury.',
  },
};

function resolveCopy(status) {
  return STATUS_COPY[status] ?? STATUS_COPY.unknown;
}

const OrbitStationPlaceholder = ({
  tokenSymbol = 'this token',
  status = 'unknown',
  error,
  className,
  children,
}) => {
  const copy = resolveCopy(status);
  const Icon = copy.Icon;

  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-executive-gold/30 bg-executive-darkGray/20 p-6',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-executive-lightGray">
        <Badge variant="outline" className="border-executive-gold/40 text-executive-gold">
          {copy.badge}
        </Badge>
        {Icon ? <Icon className="h-4 w-4 text-executive-lightGray/70" /> : null}
      </div>

      <p className="mt-3 text-sm text-executive-lightGray/75">
        {copy.message(tokenSymbol ?? 'this token')}
      </p>

      {error ? (
        <p className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {children}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          asChild
          size="sm"
          variant="outline"
          className="border-executive-gold/40 text-executive-gold hover:text-executive-goldLight"
        >
          <a href={ORBIT_PANEL_URL} target="_blank" rel="noopener noreferrer">
            Open Orbit Control Panel
          </a>
        </Button>
      </div>
    </div>
  );
};

export default OrbitStationPlaceholder;
