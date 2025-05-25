import React from 'react';
import { useSearchParams } from 'react-router-dom';

export default function ConfirmMatch() {
  const [searchParams] = useSearchParams();
  const proposalId = searchParams.get('proposalId');

  // TODO: Fetch match details by proposalId if needed

  const handleConfirm = () => {
    // TODO: Send confirmation notification (email or update backend)
    alert('Match confirmed! The proposer will be notified.');
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h1>Confirm Match</h1>
      <p>Proposal ID: {proposalId || 'N/A'}</p>
      {/* TODO: Show more match details here */}
      <button onClick={handleConfirm} style={{ padding: '10px 20px', fontSize: 16 }}>
        Confirm Match
      </button>
    </div>
  );
}
