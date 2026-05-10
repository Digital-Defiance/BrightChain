import { Alert } from '@mui/material';
import { useState } from 'react';
import { CanaryConfigPanel } from '../../src/lib/components/CanaryConfigPanel';

export function CanaryScene() {
  const [message, setMessage] = useState('');

  return (
    <>
      {message && (
        <Alert severity="info" sx={{ mb: 2 }} data-testid="canary-message">
          {message}
        </Alert>
      )}
      <CanaryConfigPanel
        bindings={[
          {
            id: 'b1',
            condition: 'MISSED_CHECK_IN',
            provider: 'MANUAL',
            action: 'DeleteFiles',
            targetDescription: '2 files',
          },
        ]}
        recipientLists={[
          { id: 'rl1', name: 'Legal Team', recipientCount: 3 },
          { id: 'rl2', name: 'Board Members', recipientCount: 5 },
        ]}
        onCreateBinding={async (binding) => {
          await new Promise((r) => setTimeout(r, 200));
          setMessage(
            `Created binding: ${binding.condition} → ${binding.action}`,
          );
        }}
        onUpdateBinding={(id) => {
          setMessage(`Updated binding ${id}`);
        }}
        onDeleteBinding={(id) => {
          setMessage(`Deleted binding ${id}`);
        }}
        onDryRun={async (id) => {
          await new Promise((r) => setTimeout(r, 200));
          setMessage(`Dry run for binding ${id}: Would delete 2 files`);
          return {
            actionsDescription: ['Delete 2 files'],
            affectedFileCount: 2,
            recipientCount: 0,
          };
        }}
        onCreateRecipientList={async (list) => {
          await new Promise((r) => setTimeout(r, 200));
          setMessage(`Created recipient list: ${list.name}`);
        }}
        onUpdateRecipientList={(id) => {
          setMessage(`Updated recipient list ${id}`);
        }}
      />
    </>
  );
}
