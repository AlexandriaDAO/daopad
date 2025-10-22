import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Principal } from '@dfinity/principal';
import AgreementDocument from '../components/operating-agreement/AgreementDocument';
import { BackendServiceBase } from '../services/backend';

export default function OperatingAgreement() {
    const { stationId } = useParams();  // Get station ID from URL
    const [searchParams] = useSearchParams();
    const tokenSymbol = searchParams.get('token') || 'TOKEN';

    const [agreementData, setAgreementData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchAgreement() {
            try {
                // Call backend to get cached agreement by station ID
                const service = new BackendServiceBase();
                const actor = await service.getActor();
                const result = await actor.get_agreement_by_station(
                    Principal.fromText(stationId)
                );

                if ('ok' in result) {
                    // Parse JSON data from snapshot
                    const data = JSON.parse(result.ok.data);
                    setAgreementData(data);
                } else if ('err' in result) {
                    setError(result.err);
                } else {
                    setError('Agreement not found');
                }
            } catch (e) {
                console.error('Error fetching agreement:', e);
                setError(e.message);
            } finally {
                setLoading(false);
            }
        }

        if (stationId) {
            fetchAgreement();
        }
    }, [stationId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading agreement...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-600">Error: {error}</div>
            </div>
        );
    }

    if (!agreementData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div>No agreement found</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-8 print:p-0">
            <AgreementDocument
                data={agreementData}
                tokenSymbol={tokenSymbol}
                stationId={stationId}
            />
            <div className="mt-8 text-center text-sm text-gray-500 print:hidden">
                Permanent link to this agreement: {window.location.href}
            </div>
        </div>
    );
}