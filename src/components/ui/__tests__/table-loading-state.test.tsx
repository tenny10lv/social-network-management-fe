import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { TableLoadingState } from '@/components/ui/table-loading-state';

type DemoRow = { id: string; name: string; value: string };

function DemoTable({ isLoading, rows }: { isLoading: boolean; rows: DemoRow[] }) {
  return (
    <Table>
      <TableBody>
        {isLoading ? (
          <TableLoadingState colSpan={2} message="Loading rows..." />
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={2}>No rows</TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.value}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

const sampleRows: DemoRow[] = [
  { id: '1', name: 'Row A', value: 'First' },
  { id: '2', name: 'Row B', value: 'Second' },
];

test('shows the standardized loading indicator while waiting for data', () => {
  const html = renderToString(<DemoTable isLoading rows={sampleRows} />);

  assert.match(html, /Loading rows/);
  assert.match(html, /role="status"/);
});

test('renders table rows when data is available', () => {
  const html = renderToString(<DemoTable isLoading={false} rows={sampleRows} />);

  assert.match(html, /Row A/);
  assert.match(html, /First/);
});

test('hides the loading indicator once data has loaded', () => {
  const html = renderToString(<DemoTable isLoading={false} rows={sampleRows} />);

  assert.doesNotMatch(html, /Loading rows/);
});
