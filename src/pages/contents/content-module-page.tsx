import { Fragment } from 'react';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { useSettings } from '@/providers/settings-provider';
import { ContentModuleContent } from './content-module-content';

export function ContentModulePage() {
  const { settings } = useSettings();

  return (
    <Fragment>
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text="Contents" />
              <ToolbarDescription>
                <span>Plan, publish, and refine your social content campaigns.</span>
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </Container>
      )}
      <Container>
        <ContentModuleContent />
      </Container>
    </Fragment>
  );
}
