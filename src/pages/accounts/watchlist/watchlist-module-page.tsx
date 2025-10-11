import { Fragment } from 'react';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { useSettings } from '@/providers/settings-provider';
import { WatchlistModuleContent } from './watchlist-module-content';

export function WatchlistModulePage() {
  const { settings } = useSettings();

  return (
    <Fragment>
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text="Watchlist Intelligence" />
              <ToolbarDescription>
                <span>
                  Track competitor accounts, curate crawled posts, and orchestrate republishing across your Threads
                  portfolio.
                </span>
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </Container>
      )}
      <Container>
        <WatchlistModuleContent />
      </Container>
    </Fragment>
  );
}
