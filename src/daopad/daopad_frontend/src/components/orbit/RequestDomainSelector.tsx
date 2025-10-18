import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { REQUEST_DOMAIN_FILTERS, RequestDomains } from '../../utils/requestDomains';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  FileText,
  Users,
  Wallet,
  ArrowLeftRight,
  Book,
  Package,
  Settings,
  Coins,
  ChevronDown
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

// Format domain name for display
const formatDomainName = (domain) => {
  if (domain === RequestDomains.All) return 'All Requests';
  if (domain === RequestDomains.AddressBook) return 'Address Book';
  if (domain === RequestDomains.ExternalCanisters) return 'External Canisters';

  return domain.charAt(0).toUpperCase() + domain.slice(1);
};

const RequestDomainSelector = ({ selectedDomain, onDomainChange, requestCounts }) => {
  const SelectedIcon = DOMAIN_ICONS[selectedDomain];
  const selectedCount = requestCounts?.[selectedDomain] || 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SelectedIcon className="h-4 w-4" />
          <span className="font-medium">{formatDomainName(selectedDomain)}</span>
          {selectedCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1">
              {selectedCount}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {Object.values(RequestDomains).map((domain) => {
          const Icon = DOMAIN_ICONS[domain];
          const count = requestCounts?.[domain] || 0;
          const isSelected = selectedDomain === domain;

          return (
            <DropdownMenuItem
              key={domain}
              onClick={() => onDomainChange(domain)}
              className={`flex items-center justify-between cursor-pointer ${
                isSelected ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{formatDomainName(domain)}</span>
              </div>
              {count > 0 && (
                <Badge variant="secondary" className="h-5 px-1">
                  {count}
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RequestDomainSelector;