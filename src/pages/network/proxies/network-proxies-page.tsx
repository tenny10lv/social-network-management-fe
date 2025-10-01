import { Fragment } from 'react';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { useSettings } from '@/providers/settings-provider';
import { NetworkProxiesContent } from './network-proxies-content';

export function NetworkProxiesPage() {
  const { settings } = useSettings();

  return (
    <Fragment>
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text="Proxies" />
              <ToolbarDescription>
                <span>Manage proxy endpoints for your network operations.</span>
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </Container>
      )}
      <Container>
        <NetworkProxiesContent />
      </Container>
    </Fragment>
  );
}
