import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Download, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { OrbitAgreementService } from '../../services/backend/OrbitAgreementService';
import AgreementDocument from './AgreementDocument';
import { generateMarkdown, downloadFile } from '../../utils/agreementExport';

const OperatingAgreementTab = ({ tokenId, stationId, tokenSymbol, identity }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAgreementData = async () => {
    if (!stationId || !identity) {
      setError('Station ID and identity are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const service = new OrbitAgreementService(identity);
      const result = await service.getAgreementData(tokenId, stationId);

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load agreement data');
      }
    } catch (err) {
      console.error('Error fetching agreement data:', err);
      setError('Failed to fetch agreement data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stationId && identity) {
      fetchAgreementData();
    }
  }, [stationId, identity, tokenId]);

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
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              LLC Operating Agreement
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAgreementData}
                disabled={loading || !stationId || !identity}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('markdown')}
                disabled={!data}
              >
                <Download className="mr-2 h-4 w-4" />
                Export MD
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('print')}
                disabled={!data}
              >
                <FileText className="mr-2 h-4 w-4" />
                Print/PDF
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This legally-binding operating agreement is generated from your DAO's
              on-chain configuration. The smart contracts ARE the agreement - this
              document describes their current state for traditional legal compliance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading agreement data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* No Station State */}
      {!stationId && !loading && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Orbit Station Linked</h3>
              <p className="text-gray-600">
                This token needs to be linked to an Orbit Station before the operating agreement can be generated.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agreement Document */}
      {data && !loading && stationId && (
        <Card className="print:border-0 print:shadow-none">
          <CardContent className="p-8 print:p-0">
            <AgreementDocument
              data={data}
              tokenSymbol={tokenSymbol}
              stationId={stationId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OperatingAgreementTab;