import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Download, FileText, RefreshCw, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { BackendServiceBase } from '../../services/backend';
import AgreementDocument from './AgreementDocument';
import { generateMarkdown, downloadFile } from '../../utils/agreementExport';
import { Principal } from '@dfinity/principal';
import { useToast } from '@/hooks/use-toast';

const OperatingAgreementTab = ({ tokenId, stationId, tokenSymbol, identity }) => {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snapshotInfo, setSnapshotInfo] = useState(null);

  // Fetch cached snapshot on load
  const fetchSnapshot = async () => {
    setLoading(true);
    setError(null);

    try {
      const service = new BackendServiceBase(identity);
      const actor = await service.getActor();
      const result = await actor.get_agreement_snapshot(
        Principal.fromText(tokenId)
      );

      if ('ok' in result) {
        const data = JSON.parse(result.ok.data);
        setData(data);
        setSnapshotInfo({
          created: new Date(Number(result.ok.created_at) / 1000000),
          version: result.ok.version
        });
      } else if ('err' in result) {
        console.log('No snapshot found:', result.err);
        setError('No snapshot available. Click regenerate to create one.');
      } else {
        setError('No snapshot available. Click regenerate to create one.');
      }
    } catch (e) {
      console.error('Error fetching snapshot:', e);
      const errorMsg = e?.message || 'Failed to load snapshot';
      setError(errorMsg + '. Click regenerate to create one.');
    } finally {
      setLoading(false);
    }
  };

  // Regenerate snapshot
  const regenerateAgreement = async () => {
    setLoading(true);
    setError(null);

    try {
      const service = new BackendServiceBase(identity);
      const actor = await service.getActor();
      const result = await actor.regenerate_agreement_snapshot(
        Principal.fromText(tokenId),
        Principal.fromText(stationId)
      );

      if ('ok' in result) {
        const data = JSON.parse(result.ok.data);
        setData(data);
        setSnapshotInfo({
          created: new Date(Number(result.ok.created_at) / 1000000),
          version: result.ok.version
        });
        toast.success('Agreement regenerated successfully', {
          description: `Version ${result.ok.version} has been created.`
        });
      } else if ('err' in result) {
        const errorMsg = result.err || 'Unknown error occurred';
        console.error('Backend error:', errorMsg);
        setError('Failed to regenerate: ' + errorMsg);
        toast.error('Failed to regenerate', {
          description: errorMsg
        });
      } else {
        console.error('Unexpected result format:', result);
        setError('Failed to regenerate: Unexpected response format');
      }
    } catch (e) {
      console.error('Error regenerating agreement:', e);
      const errorMsg = e?.message || e?.toString() || 'Network error or timeout - please try again';
      setError('Failed to regenerate: ' + errorMsg);
      toast.error('Failed to regenerate', {
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  // Get permanent link
  const permanentLink = `${window.location.origin}/agreement/${stationId}?token=${tokenSymbol}`;

  const copyLink = () => {
    navigator.clipboard.writeText(permanentLink);
    toast.success('Link copied to clipboard', {
      description: 'The permanent agreement link has been copied.'
    });
  };

  const openStandalone = () => {
    window.open(permanentLink, '_blank');
  };

  useEffect(() => {
    if (stationId && tokenId) {
      fetchSnapshot();
    }
  }, [stationId, tokenId]);

  const handleExport = (format) => {
    if (!data) return;

    if (format === 'markdown') {
      const content = generateMarkdown(data, tokenSymbol, stationId);
      downloadFile(content, `${tokenSymbol}_operating_agreement.md`, 'text/markdown');
    } else if (format === 'print') {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                LLC Operating Agreement
              </span>
              {snapshotInfo && (
                <p className="text-sm text-gray-500 mt-1">
                  Version {snapshotInfo.version} • Generated: {snapshotInfo.created.toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={regenerateAgreement}
                disabled={loading || !stationId || !tokenId}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
                disabled={!stationId}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openStandalone}
                disabled={!stationId}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Standalone
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  This Operating Agreement is generated from on-chain data and smart contract configuration.
                  It establishes your DAO as a Wyoming LLC with legally compliant governance structure.
                </p>
                {!data && (
                  <p className="font-medium">
                    Click "Regenerate" to create or update your agreement snapshot.
                  </p>
                )}
                {data && (
                  <p>
                    <span className="font-medium">Permanent Link:</span>{' '}
                    <a href={permanentLink} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
                      {permanentLink}
                    </a>
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Export Actions */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleExport('markdown')}
              >
                <Download className="mr-2 h-4 w-4" />
                Export as Markdown
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('print')}
              >
                <FileText className="mr-2 h-4 w-4" />
                Print / Save as PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-600">Loading agreement data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agreement Document */}
      {data && !loading && (
        <AgreementDocument data={data} tokenSymbol={tokenSymbol} stationId={stationId} />
      )}
    </div>
  );
};

export default OperatingAgreementTab;