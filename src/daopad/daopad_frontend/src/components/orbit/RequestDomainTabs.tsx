import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { REQUEST_DOMAIN_FILTERS, RequestDomains } from '../../utils/requestDomains';
import {
  FileText,
  Users,
  Wallet,
  ArrowLeftRight,
  Book,
  Package,
  Settings,
  Coins
} from 'lucide-react';

// Icon mapping for each domain
const DOMAIN_ICONS = {
  [RequestDomains.All]: FileText,
  [RequestDomains.Accounts]: Wallet,
  [RequestDomains.Transfers]: ArrowLeftRight,
  [RequestDomains.Users]: Users,
  [RequestDomains.AddressBook]: Book,
  [RequestDomains.ExternalCanisters]: Package,
  [RequestDomains.System]: Settings,
  [RequestDomains.Assets]: Coins,
};

const RequestDomainTabs = ({ selectedDomain, onDomainChange, requestCounts }) => {
  return (
    <Tabs value={selectedDomain} onValueChange={onDomainChange}>
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
        {Object.values(RequestDomains).map((domain) => {
          const Icon = DOMAIN_ICONS[domain];
          const count = requestCounts?.[domain] || 0;

          return (
            <TabsTrigger
              key={domain}
              value={domain}
              className="flex items-center gap-1"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">
                {domain.charAt(0).toUpperCase() + domain.slice(1).replace('_', ' ')}
              </span>
              {count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1">
                  {count}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
};

export default RequestDomainTabs;