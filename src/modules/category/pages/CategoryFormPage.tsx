'use client';

import { Fragment, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { AlertCircle, ArrowLeft, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CategoryForm } from '../components/CategoryForm';
import { useCategory, useCategoryList, useCreateCategory, useUpdateCategory } from '../hooks/useCategoryApi';
import { CategoryFormValues, useCategoryForm } from '../hooks/useCategoryForm';
import { Category } from '../types/category';
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
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const PARENT_OPTIONS_LIMIT = 200;

const mapCategoryToOption = (category: Category) => ({
  value: category.id,
  label: category.name,
});

const mapFormValuesToPayload = (values: CategoryFormValues) => ({
  name: values.name,
  slug: values.slug,
  description: values.description ?? null,
  isActive: values.isActive,
  parentId: values.parentId ?? null,
  order: values.order ?? null,
});

export function CategoryFormPage() {
  const navigate = useNavigate();
  const params = useParams<{ categoryId?: string }>();
  const categoryId = params.categoryId;
  const isEditMode = Boolean(categoryId);
  const { settings } = useSettings();

  const categoryQuery = useCategory(categoryId, { enabled: isEditMode && Boolean(categoryId) });
  const parentOptionsQuery = useCategoryList({ page: 1, limit: PARENT_OPTIONS_LIMIT });

  const { form } = useCategoryForm({ category: categoryQuery.data ?? null });

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isLoadingCategory = isEditMode && categoryQuery.isLoading;
  const hasCategoryError = isEditMode && categoryQuery.isError;
  const categoryError = categoryQuery.error as Error | null;

  const parentOptions = useMemo(() => {
    const rawOptions = parentOptionsQuery.data?.data ?? [];
    const options = rawOptions
      .filter((item) => !categoryId || item.id !== categoryId)
      .map(mapCategoryToOption);

    if (isEditMode && categoryQuery.data?.parentId) {
      const parentId = categoryQuery.data.parentId;
      const exists = options.some((option) => option.value === parentId);
      if (!exists) {
        options.push({
          value: parentId,
          label: categoryQuery.data.parent?.name ?? 'Current parent',
        });
      }
    }

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [categoryId, categoryQuery.data, isEditMode, parentOptionsQuery.data]);

  const handleCancel = () => {
    navigate('/categories');
  };

  const handleSubmit = (values: CategoryFormValues) => {
    const payload = mapFormValuesToPayload(values);

    if (isEditMode && categoryId) {
      updateMutation.mutate(
        { id: categoryId, data: payload },
        {
          onSuccess: (updated) => {
            toast.custom(
              (t) => (
                <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
                  <AlertIcon>
                    <RiCheckboxCircleFill />
                  </AlertIcon>
                  <AlertTitle>Category updated successfully.</AlertTitle>
                </Alert>
              ),
              { duration: 4000 },
            );
            navigate(`/categories/${updated.id}`);
          },
          onError: (error) => {
            toast.custom(
              (t) => (
                <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
                  <AlertIcon>
                    <AlertCircle className="size-5" />
                  </AlertIcon>
                  <AlertTitle>{error?.message ?? 'Failed to update category.'}</AlertTitle>
                </Alert>
              ),
              { duration: 5000 },
            );
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: (created) => {
          toast.custom(
            (t) => (
              <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
                <AlertIcon>
                  <RiCheckboxCircleFill />
                </AlertIcon>
                <AlertTitle>Category created successfully.</AlertTitle>
              </Alert>
            ),
            { duration: 4000 },
          );
          navigate(`/categories/${created.id}`);
        },
        onError: (error) => {
          toast.custom(
            (t) => (
              <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
                <AlertIcon>
                  <AlertCircle className="size-5" />
                </AlertIcon>
                <AlertTitle>{error?.message ?? 'Failed to create category.'}</AlertTitle>
              </Alert>
            ),
            { duration: 5000 },
          );
        },
      });
    }
  };

  const parentOptionsLoading = parentOptionsQuery.isLoading || parentOptionsQuery.isFetching;

  const submitLabel = isEditMode ? 'Save changes' : 'Create category';

  return (
    <Fragment>
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={isEditMode ? 'Edit Category' : 'Create Category'} />
              <ToolbarDescription>
                <span>
                  {isEditMode
                    ? 'Update the category configuration for your watchlist taxonomy.'
                    : 'Add a new category to organize watchlist accounts.'}
                </span>
              </ToolbarDescription>
            </ToolbarHeading>
            <ToolbarActions>
              <Button variant="outline" onClick={() => navigate('/categories')}>
                <ArrowLeft className="mr-2 size-4" />
                Back to categories
              </Button>
            </ToolbarActions>
          </Toolbar>
        </Container>
      )}
      <Container>
        <Card>
          <CardHeader className="py-4">
            <CardHeading>
              <CardTitle>{isEditMode ? 'Edit category' : 'Create category'}</CardTitle>
              <span className="text-sm text-muted-foreground">
                {isEditMode
                  ? 'Modify category metadata and hierarchy. Changes apply immediately to watchlist accounts.'
                  : 'Define the name, slug, and placement for the new category.'}
              </span>
            </CardHeading>
          </CardHeader>
          <CardContent className="pb-8">
            {isLoadingCategory ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Loading category...
              </div>
            ) : hasCategoryError ? (
              <Alert variant="mono" icon="destructive">
                <AlertIcon>
                  <AlertCircle className="size-5" />
                </AlertIcon>
                <AlertTitle>{categoryError?.message ?? 'Failed to load category.'}</AlertTitle>
              </Alert>
            ) : (
              <CategoryForm
                form={form}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                parentOptions={parentOptions}
                isParentLoading={parentOptionsLoading}
                submitLabel={submitLabel}
              />
            )}
          </CardContent>
        </Card>
      </Container>
    </Fragment>
  );
}
