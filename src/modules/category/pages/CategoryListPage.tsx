'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { AlertCircle, RefreshCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { CategoryTable } from '../components/CategoryTable';
import { useCategoryList, useDeleteCategory } from '../hooks/useCategoryApi';
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
  CardFooter,
  CardHeader,
  CardHeading,
  CardTable,
  CardTitle,
  CardToolbar,
} from '@/components/ui/card';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function CategoryListPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_OPTIONS[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingCategory, setPendingCategory] = useState<Category | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const categoriesQuery = useCategoryList({
    page,
    limit,
    search: debouncedSearch ? debouncedSearch : null,
  });

  const deleteMutation = useDeleteCategory();

  const data = categoriesQuery.data;
  const categories = data?.data ?? [];

  const paginationMeta = useMemo(() => {
    const total = data?.meta?.total;
    const totalPages = data?.meta?.totalPages;

    const resolvedTotalPages =
      typeof totalPages === 'number'
        ? totalPages
        : typeof total === 'number'
          ? Math.max(1, Math.ceil(total / limit))
          : undefined;

    const canGoNext =
      resolvedTotalPages !== undefined
        ? page < resolvedTotalPages
        : (data?.data?.length ?? 0) === limit;

    const canGoPrevious = page > 1;

    return {
      total,
      totalPages: resolvedTotalPages,
      canGoNext,
      canGoPrevious,
    };
  }, [data, limit, page]);

  const handleNextPage = () => {
    if (paginationMeta.canGoNext) {
      setPage((current) => current + 1);
    }
  };

  const handlePreviousPage = () => {
    if (paginationMeta.canGoPrevious) {
      setPage((current) => Math.max(1, current - 1));
    }
  };

  const handlePageSizeChange = (value: string) => {
    const nextLimit = Number(value) || PAGE_SIZE_OPTIONS[0];
    setLimit(nextLimit);
    setPage(1);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const openDeleteConfirm = (category: Category) => {
    setPendingCategory(category);
    setConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setConfirmOpen(false);
    setPendingCategory(null);
  };

  const handleDeleteConfirmed = () => {
    if (!pendingCategory) {
      return;
    }

    deleteMutation.mutate(pendingCategory.id, {
      onSuccess: () => {
        toast.custom(
          (t) => (
            <Alert variant="mono" icon="success" onClose={() => toast.dismiss(t)}>
              <AlertIcon>
                <RiCheckboxCircleFill />
              </AlertIcon>
              <AlertTitle>Category deleted successfully.</AlertTitle>
            </Alert>
          ),
          { duration: 4000 },
        );
        closeDeleteConfirm();
      },
      onError: (error) => {
        toast.custom(
          (t) => (
            <Alert variant="mono" icon="destructive" onClose={() => toast.dismiss(t)}>
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertTitle>{error?.message ?? 'Failed to delete category.'}</AlertTitle>
            </Alert>
          ),
          { duration: 5000 },
        );
      },
    });
  };

  const isLoading = categoriesQuery.isLoading || categoriesQuery.isFetching;
  const isError = categoriesQuery.isError;
  const error = categoriesQuery.error as Error | null;

  return (
    <Fragment>
      {settings?.layout === 'demo1' && (
        <Container>
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text="Categories" />
              <ToolbarDescription>
                <span>Classify watchlist accounts into reusable categories.</span>
              </ToolbarDescription>
            </ToolbarHeading>
            <ToolbarActions>
              <Button onClick={() => navigate('/categories/new')}>+ Create Category</Button>
            </ToolbarActions>
          </Toolbar>
        </Container>
      )}
      <Container>
        <Card>
          <CardHeader className="py-4">
            <CardHeading>
              <CardTitle>Category Management</CardTitle>
              <span className="text-sm text-muted-foreground">
                View, search, and maintain the category taxonomy powering the watchlist.
              </span>
            </CardHeading>
            <CardToolbar className="flex-1 justify-end">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
                <div className="relative w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="Search by name or slug"
                    className="pl-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void categoriesQuery.refetch()}
                  disabled={categoriesQuery.isRefetching}
                >
                  <RefreshCcw className={categoriesQuery.isRefetching ? 'size-4 animate-spin' : 'size-4'} />
                </Button>
              </div>
            </CardToolbar>
          </CardHeader>
          <CardTable>
            <CategoryTable
              categories={categories}
              isLoading={isLoading}
              isError={isError}
              error={error}
              onEdit={(id) => navigate(`/categories/${id}/edit`)}
              onDelete={openDeleteConfirm}
              onView={(id) => navigate(`/categories/${id}`)}
              isDeleting={deleteMutation.isPending}
              deletingCategoryId={deleteMutation.isPending ? pendingCategory?.id ?? null : null}
            />
          </CardTable>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page:</span>
                <Select value={String(limit)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-[90px]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
                <Pagination className="sm:order-2">
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={!paginationMeta.canGoPrevious}
                      >
                        Previous
                      </Button>
                    </PaginationItem>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={!paginationMeta.canGoNext}
                      >
                        Next
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                <div className="text-sm text-muted-foreground sm:order-1">
                  Page {page}
                  {paginationMeta.totalPages ? ` of ${paginationMeta.totalPages}` : ''}
                  {typeof paginationMeta.total === 'number' ? ` • ${paginationMeta.total} total` : ''}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <span className="text-xs text-muted-foreground">
              {categories.length} item{categories.length === 1 ? '' : 's'} on this page.
            </span>
          </CardFooter>
        </Card>
      </Container>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => (open ? setConfirmOpen(true) : closeDeleteConfirm())}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCategory
                ? `Are you sure you want to delete “${pendingCategory.name}”? You can reactivate it later from the API if needed.`
                : 'Are you sure you want to delete this category?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" onClick={closeDeleteConfirm} disabled={deleteMutation.isPending}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={handleDeleteConfirmed} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending && <RefreshCcw className="mr-2 size-4 animate-spin" />}
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Fragment>
  );
}
