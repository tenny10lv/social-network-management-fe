import { Fragment } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/providers/settings-provider';
import { WatchlistModuleContent } from './watchlist-module-content';

export function WatchlistModulePage() {
  const { settings } = useSettings();
  const params = useParams<{ threadsAccountId?: string; id?: string }>();
  const threadsAccountId = params.threadsAccountId ?? params.id;
  const navigate = useNavigate();
  const isDemoLayout = settings?.layout === 'demo1';

  const handleBackToThreadsAccounts = () => {
    navigate('/threads-accounts');
  };

  return (
    <Fragment>
      {isDemoLayout && (
        <Container width="fluid">
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
            <ToolbarActions>
              <Button variant="outline" onClick={handleBackToThreadsAccounts}>
                <ArrowLeft className="me-2 size-4" />
                Back
              </Button>
            </ToolbarActions>
          </Toolbar>
        </Container>
      )}
      <Container width="fluid">
        {!isDemoLayout && (
          <div className="mb-6 flex justify-end">
            <Button variant="outline" onClick={handleBackToThreadsAccounts}>
              <ArrowLeft className="me-2 size-4" />
              Back
            </Button>
          </div>
        )}
        <WatchlistModuleContent threadsAccountId={threadsAccountId} />
      </Container>
    </Fragment>
  );
}
