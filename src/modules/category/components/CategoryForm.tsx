'use client';

import { LoaderCircle } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { CategoryFormValues } from '../hooks/useCategoryForm';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NO_PARENT_VALUE = '__no_parent__';

export interface CategoryParentOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CategoryFormProps {
  form: UseFormReturn<CategoryFormValues>;
  onSubmit: (values: CategoryFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  parentOptions?: CategoryParentOption[];
  isParentLoading?: boolean;
  submitLabel?: string;
}

export function CategoryForm({
  form,
  onSubmit,
  onCancel,
  isSubmitting = false,
  parentOptions = [],
  isParentLoading = false,
  submitLabel = 'Save category',
}: CategoryFormProps) {
  const handleSubmit = form.handleSubmit(onSubmit);

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Category name" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input placeholder="unique-slug" autoComplete="off" {...field} />
                </FormControl>
                <FormDescription>Used as a unique identifier in URLs and integrations.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Explain how this category is used"
                  rows={4}
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormDescription>Optional. Provide context for admins using this category.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent category</FormLabel>
                <Select
                  value={field.value ?? NO_PARENT_VALUE}
                  onValueChange={(value) => field.onChange(value === NO_PARENT_VALUE ? null : value)}
                  disabled={isParentLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isParentLoading ? 'Loading...' : 'No parent'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_PARENT_VALUE}>No parent</SelectItem>
                    {parentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display order</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="Optional"
                    value={field.value ?? ''}
                    onChange={(event) => {
                      const { value } = event.target;
                      if (value === '') {
                        field.onChange(null);
                        return;
                      }

                      const numericValue = Number(value);
                      if (Number.isNaN(numericValue)) {
                        return;
                      }

                      field.onChange(numericValue);
                    }}
                  />
                </FormControl>
                <FormDescription>Controls sorting when categories are displayed in lists.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-1">
                <FormLabel className="mb-0">Active status</FormLabel>
                <FormDescription>
                  Toggle to enable or disable the category without deleting it.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Toggle active status" />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle className="mr-2 size-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
