'use client';

import { Fragment } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertCircle, LoaderCircle, PencilLine } from 'lucide-react';
import { useCategory } from '../hooks/useCategoryApi';
import { useSettings } from '@/providers/settings-provider';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import {
  Card,
  CardContent,
  CardHeader,
  CardHeading,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/helpers';

const renderStatusBadge = (isActive?: boolean) => (
  <Badge variant={isActive ? 'success' : 'secondary'} appearance="light">
    {isActive ? 'Active' : 'Inactive'}
  </Badge>
);

export function CategoryDetailPage() {
  const navigate = useNavigate();
  const params = useParams<{ categoryId: string }>();
  const categoryId = params.categoryId;
  const { settings } = useSettings();

  const categoryQuery = useCategory(categoryId, { enabled: Boolean(categoryId) });

  const category = categoryQuery.data;
  const isLoading = categoryQuery.isLoading;
  const isError = categoryQuery.isError;
  const error = categoryQuery.error as Error | null;

  const parentLabel = category?.parent?.name ?? category?.parentId ?? '—';
  const orderLabel = typeof category?.order === 'number' ? category.order : '—';

  return (
    <Fragment>
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text="Category Details" />
              <ToolbarDescription>
                <span>Review category metadata and hierarchy.</span>
              </ToolbarDescription>
            </ToolbarHeading>
            <ToolbarActions>
              <Button variant="outline" onClick={() => navigate('/categories')}>
                Back to categories
              </Button>
              {categoryId && (
                <Button onClick={() => navigate(`/categories/${categoryId}/edit`)}>
                  <PencilLine className="mr-2 size-4" />
                  Edit category
                </Button>
              )}
            </ToolbarActions>
          </Toolbar>
        </Container>
      )}
      <Container>
        <Card>
          <CardHeader className="py-4">
            <CardHeading>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{category?.name ?? 'Category summary'}</CardTitle>
                {category && renderStatusBadge(category.isActive)}
              </div>
              <span className="text-sm text-muted-foreground">
                Complete overview of this category including its identifiers and timestamps.
              </span>
            </CardHeading>
          </CardHeader>
          <CardContent className="pb-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Loading category...
              </div>
            ) : isError ? (
              <Alert variant="mono" icon="destructive">
                <AlertIcon>
                  <AlertCircle className="size-5" />
                </AlertIcon>
                <AlertTitle>{error?.message ?? 'Failed to load category details.'}</AlertTitle>
              </Alert>
            ) : category ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Slug</p>
                  <p className="font-mono text-sm text-foreground">{category.slug}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
                  {renderStatusBadge(category.isActive)}
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Description</p>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {category.description ?? '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Parent category</p>
                  <p className="text-sm text-foreground">{parentLabel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Display order</p>
                  <p className="text-sm text-foreground">{orderLabel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Created at</p>
                  <p className="text-sm text-foreground">
                    {category.createdAt ? formatDateTime(category.createdAt) : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Updated at</p>
                  <p className="text-sm text-foreground">
                    {category.updatedAt ? formatDateTime(category.updatedAt) : '—'}
                  </p>
                </div>
              </div>
            ) : (
              <Alert variant="mono" icon="destructive">
                <AlertIcon>
                  <AlertCircle className="size-5" />
                </AlertIcon>
                <AlertTitle>Category not found.</AlertTitle>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Container>
    </Fragment>
  );
}
