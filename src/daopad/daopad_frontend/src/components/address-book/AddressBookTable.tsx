import React from 'react';
import { Copy, Eye, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import BlockchainIcon from './BlockchainIcon';
import ShortenedAddress from './ShortenedAddress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const AddressBookTable = ({
  entries,
  privileges,
  loading,
  onCopy,
  onEdit,
  onDelete,
  onView
}) => {
  // Helper function to check permissions
  const hasEditPrivilege = (id) => privileges[id]?.can_edit || false;
  const hasDeletePrivilege = (id) => privileges[id]?.can_delete || false;

  // Table headers
  const headers = [
    { key: 'blockchain', label: 'Blockchain', width: '100px' },
    { key: 'name', label: 'Name', width: '200px' },
    { key: 'address', label: 'Address' },
    { key: 'labels', label: 'Labels', width: '200px' },
    { key: 'actions', label: 'Actions', width: '120px', align: 'right' }
  ];

  return (
    <div className="relative">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Blockchain</TableHead>
            <TableHead className="w-[200px]">Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="w-[200px]">Labels</TableHead>
            <TableHead className="text-right w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              {/* Blockchain */}
              <TableCell>
                <BlockchainIcon blockchain={entry.blockchain} size="sm" showLabel={true} />
              </TableCell>

              {/* Name */}
              <TableCell>
                <div className="font-medium">
                  {entry.address_owner}
                </div>
                {entry.last_modification_timestamp && (
                  <div className="text-xs text-muted-foreground">
                    Modified: {new Date(entry.last_modification_timestamp).toLocaleDateString()}
                  </div>
                )}
              </TableCell>

              {/* Address */}
              <TableCell>
                <div className="flex items-center gap-2">
                  <ShortenedAddress
                    address={entry.address}
                    format={entry.address_format}
                    maxLength={20}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCopy(entry.address)}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Format: {entry.address_format.replace(/_/g, ' ')}
                </div>
              </TableCell>

              {/* Labels */}
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {entry.labels && entry.labels.length > 0 ? (
                    entry.labels.slice(0, 3).map((label, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {label}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No labels
                    </span>
                  )}
                  {entry.labels && entry.labels.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{entry.labels.length - 3}
                    </Badge>
                  )}
                </div>
              </TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(entry)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {hasEditPrivilege(entry.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(entry)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}

                  {hasDeletePrivilege(entry.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(entry)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(entry)}>
                        View Details
                      </DropdownMenuItem>
                      {hasEditPrivilege(entry.id) && (
                        <DropdownMenuItem onClick={() => onEdit(entry)}>
                          Edit Entry
                        </DropdownMenuItem>
                      )}
                      {hasDeletePrivilege(entry.id) && (
                        <DropdownMenuItem
                          onClick={() => onDelete(entry)}
                          className="text-destructive"
                        >
                          Delete Entry
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      )}
    </div>
  );
};

export default AddressBookTable;