import { Fragment } from 'react';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { useSettings } from '@/providers/settings-provider';
import { AccountModuleContent } from './account-module-content';

export function AccountModulePage() {
  const { settings } = useSettings();

  return (
    <Fragment>
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text="Accounts" />
              <ToolbarDescription>
                <span>Provision, update, and monitor your connected accounts.</span>
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </Container>
      )}
      <Container>
        <AccountModuleContent />
      </Container>
    </Fragment>
  );
}
