import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Category } from '../types/category';

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .toLowerCase();

export const categoryFormSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(1, 'Name is required'),
  slug: z.preprocess(
    (value) => (typeof value === 'string' ? slugify(value.trim()) : value),
    z
      .string({ required_error: 'Slug is required' })
      .min(1, 'Slug is required')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug can only contain lowercase letters, numbers, and hyphens.'),
  ),
  description: z
    .union([
      z
        .string()
        .trim()
        .max(500, 'Description must be 500 characters or fewer.'),
      z.null(),
    ])
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return null;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      }

      return value;
    }),
  isActive: z.boolean().default(true),
  parentId: z
    .union([z.string().trim().min(1), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return null;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      }

      return value;
    }),
  order: z
    .preprocess(
      (value) => {
        if (value === '' || value === undefined || value === null) {
          return null;
        }

        if (typeof value === 'number') {
          return Number.isNaN(value) ? null : value;
        }

        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (!trimmed) {
            return null;
          }

          const parsed = Number(trimmed);
          return Number.isNaN(parsed) ? trimmed : parsed;
        }

        return value;
      },
      z
        .number({ invalid_type_error: 'Order must be a number' })
        .int('Order must be an integer')
        .nullable(),
    )
    .optional(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const DEFAULT_CATEGORY_FORM_VALUES: CategoryFormValues = {
  name: '',
  slug: '',
  description: null,
  isActive: true,
  parentId: null,
  order: null,
};

const mapCategoryToFormValues = (category: Category): CategoryFormValues => ({
  name: category.name ?? '',
  slug: category.slug ?? '',
  description: category.description ?? null,
  isActive: category.isActive ?? true,
  parentId: category.parent?.id ?? category.parentId ?? null,
  order: typeof category.order === 'number' ? category.order : null,
});

interface UseCategoryFormOptions {
  category?: Category | null;
}

export const useCategoryForm = ({ category }: UseCategoryFormOptions = {}) => {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: DEFAULT_CATEGORY_FORM_VALUES,
  });

  useEffect(() => {
    if (category) {
      form.reset(mapCategoryToFormValues(category));
    } else {
      form.reset(DEFAULT_CATEGORY_FORM_VALUES);
    }
  }, [category, form]);

  const nameValue = form.watch('name');
  const slugValue = form.watch('slug');

  useEffect(() => {
    const currentSlug = form.getValues('slug');
    if (!currentSlug) {
      const nextSlug = slugify(nameValue ?? '');
      if (nextSlug !== currentSlug) {
        form.setValue('slug', nextSlug, { shouldDirty: false });
      }
    }
  }, [form, nameValue]);

  useEffect(() => {
    if (typeof slugValue === 'string') {
      const sanitized = slugify(slugValue);
      if (sanitized !== slugValue) {
        form.setValue('slug', sanitized, { shouldDirty: true });
      }
    }
  }, [form, slugValue]);

  return { form };
};
