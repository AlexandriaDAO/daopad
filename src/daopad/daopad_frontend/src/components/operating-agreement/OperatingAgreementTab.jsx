import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { Download, FileText } from 'lucide-react';
import { OrbitAgreementService } from '../../services/backend/OrbitAgreementService';
import AgreementDocument from './AgreementDocument';
import { generateMarkdown } from '../../utils/agreementFormatter';

const OperatingAgreementTab = ({ tokenId, stationId, tokenSymbol, identity }) => {
  const [agreementData, setAgreementData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (tokenId && identity) {
      loadAgreementData();
    }
  }, [tokenId, identity]);

  const loadAgreementData = async () => {
    setLoading(true);
    setError(null);

    try {
      const service = new OrbitAgreementService(identity);
      const result = await service.getOperatingAgreementData(tokenId);

      if (result.success) {
        setAgreementData(result.data);
      } else {
        setError(result.error || 'Failed to load operating agreement data');
      }
    } catch (err) {
      console.error('Error loading agreement data:', err);
      setError('Failed to load operating agreement data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!agreementData) return;

    const markdown = generateMarkdown(agreementData, tokenSymbol);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tokenSymbol}-Operating-Agreement-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!agreementData) return null;

  return (
    <div className="space-y-6">
      {/* Header with export options */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Operating Agreement</CardTitle>
              <CardDescription>
                Legally-binding document generated from on-chain governance configuration
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExportMarkdown}
                variant="outline"
                size="sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                Export Markdown
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Security warning if not decentralized */}
      {!agreementData.is_truly_decentralized && (
        <Alert variant="warning">
          <AlertDescription>
            ⚠️ This DAO is not fully decentralized. Multiple admins exist beyond the governance backend.
            Review the Security tab for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Formatted operating agreement document */}
      <AgreementDocument data={agreementData} tokenSymbol={tokenSymbol} />
    </div>
  );
};

export default OperatingAgreementTab;
