'use client';

import { Link } from 'react-router';
import { EllipsisVertical, Eye, LoaderCircle, Pencil, Server, Trash2 } from 'lucide-react';
import { Category } from '../types/category';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/helpers';

interface CategoryTableProps {
  categories: Category[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onEdit: (id: string) => void;
  onDelete: (category: Category) => void;
  onView?: (id: string) => void;
  isDeleting?: boolean;
  deletingCategoryId?: string | null;
}

const renderStatusBadge = (category: Category) => (
  <Badge variant={category.isActive ? 'success' : 'secondary'} appearance="light">
    {category.isActive ? 'Active' : 'Inactive'}
  </Badge>
);

export function CategoryTable({
  categories,
  isLoading = false,
  isError = false,
  error,
  onEdit,
  onDelete,
  onView,
  isDeleting = false,
  deletingCategoryId,
}: CategoryTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="sticky right-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
              <div className="flex items-center justify-center gap-2 text-sm">
                <LoaderCircle className="size-4 animate-spin" />
                Loading categories...
              </div>
            </TableCell>
          </TableRow>
        ) : isError ? (
          <TableRow>
            <TableCell colSpan={6} className="py-6">
              <Alert variant="mono" icon="destructive">
                <AlertIcon>
                  <Server className="size-5" />
                </AlertIcon>
                <AlertTitle>{error?.message ?? 'Failed to load categories.'}</AlertTitle>
              </Alert>
            </TableCell>
          </TableRow>
        ) : categories.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
              No categories found.
            </TableCell>
          </TableRow>
        ) : (
          categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  {onView ? (
                    <button
                      type="button"
                      onClick={() => onView(category.id)}
                      className="w-fit text-left text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {category.name}
                    </button>
                  ) : (
                    <Link
                      to={`/categories/${category.id}`}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {category.name}
                    </Link>
                  )}
                  {category.parent?.name && (
                    <span className="text-xs text-muted-foreground">Parent: {category.parent.name}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm text-muted-foreground">{category.slug}</span>
              </TableCell>
              <TableCell>
                <span className="line-clamp-2 text-sm text-muted-foreground">
                  {category.description ?? '—'}
                </span>
              </TableCell>
              <TableCell>{renderStatusBadge(category)}</TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {category.createdAt ? formatDateTime(category.createdAt) : '—'}
                </span>
              </TableCell>
              <TableCell className="sticky right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hover:bg-muted">
                      <EllipsisVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onView && (
                      <DropdownMenuItem onClick={() => onView(category.id)}>
                        <Eye className="me-2 size-4" />
                        View details
                      </DropdownMenuItem>
                    )}
                    {onView && <DropdownMenuSeparator />}
                    <DropdownMenuItem onClick={() => onEdit(category.id)}>
                      <Pencil className="me-2 size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(category)}
                      variant="destructive"
                      disabled={isDeleting && deletingCategoryId === category.id}
                    >
                      {isDeleting && deletingCategoryId === category.id ? (
                        <LoaderCircle className="me-2 size-4 animate-spin" />
                      ) : (
                        <Trash2 className="me-2 size-4" />
                      )}
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
