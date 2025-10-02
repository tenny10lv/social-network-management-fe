import { Fragment } from 'react';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { useSettings } from '@/providers/settings-provider';
import { PublishingModuleContent } from './publishing-module-content';

export function PublishingModulePage() {
  const { settings } = useSettings();

  return (
    <Fragment>
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text="Publishing" />
              <ToolbarDescription>
                <span>Schedule, review, and manage publish jobs.</span>
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </Container>
      )}
      <Container>
        <PublishingModuleContent />
      </Container>
    </Fragment>
  );
}
