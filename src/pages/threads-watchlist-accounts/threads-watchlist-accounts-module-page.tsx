import { Fragment } from 'react';

import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { useSettings } from '@/providers/settings-provider';

import { ThreadsWatchlistAccountsModuleContent } from './threads-watchlist-accounts-module-content';

export function ThreadsWatchlistAccountsModulePage() {
  const { settings } = useSettings();

  return (
    <Fragment>
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text="Threads Watchlist Accounts" />
              <ToolbarDescription>
                <span>Review high-priority profiles collected by the watchlist crawler.</span>
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </Container>
      )}
      <Container>
        <ThreadsWatchlistAccountsModuleContent />
      </Container>
    </Fragment>
  );
}
