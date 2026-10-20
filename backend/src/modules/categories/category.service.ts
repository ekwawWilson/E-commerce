import prisma from '../../config/database';
import { Prisma } from '@prisma/client';
import { slugify } from '../../utils/helpers';
import { NotFoundError } from '../../middleware/errorHandler';

export interface CreateCategoryData {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  parentId?: string;
  active?: boolean;
  sortOrder?: number;
}

export class CategoryService {
  /**
   * Get all categories (with optional filters)
   */
  async getCategories(params: {
    parentId?: string;
    active?: boolean;
    includeProducts?: boolean;
  } = {}) {
    const where: Prisma.CategoryWhereInput = {};

    if (params.parentId !== undefined) {
      where.parentId = params.parentId || null;
    }

    if (params.active !== undefined) {
      where.active = params.active;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        children: {
          where: params.active !== undefined ? { active: params.active } : {},
          orderBy: { sortOrder: 'asc' },
        },
        parent: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return categories;
  }

  /**
   * Get category tree (hierarchical)
   */
  async getCategoryTree(activeOnly = true) {
    const where: Prisma.CategoryWhereInput = {
      parentId: null,
    };

    if (activeOnly) {
      where.active = true;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        children: {
          where: activeOnly ? { active: true } : {},
          include: {
            children: {
              where: activeOnly ? { active: true } : {},
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return categories;
  }

  /**
   * Get category by ID or slug
   */
  async getCategoryByIdOrSlug(idOrSlug: string) {
    const category = await prisma.category.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        children: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
        },
        parent: true,
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Category');
    }

    return category;
  }

  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryData) {
    const slug = data.slug || slugify(data.name);

    // Check if slug exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      throw new Error('A category with this slug already exists');
    }

    // Validate parentId if provided
    if (data.parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parentCategory) {
        throw new NotFoundError('Parent category');
      }
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        image: data.image,
        parentId: data.parentId,
        active: data.active ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    return category;
  }

  /**
   * Update a category
   */
  async updateCategory(id: string, data: Partial<CreateCategoryData>) {
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new NotFoundError('Category');
    }

    // Handle slug update
    let slug = data.slug;
    if (data.name && !data.slug) {
      slug = slugify(data.name);
    }

    if (slug && slug !== existingCategory.slug) {
      const slugExists = await prisma.category.findFirst({
        where: { slug, NOT: { id } },
      });
      if (slugExists) {
        throw new Error('A category with this slug already exists');
      }
    }

    // Validate parentId if provided
    if (data.parentId) {
      if (data.parentId === id) {
        throw new Error('A category cannot be its own parent');
      }

      const parentCategory = await prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parentCategory) {
        throw new NotFoundError('Parent category');
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        slug,
        description: data.description,
        image: data.image,
        parentId: data.parentId,
        active: data.active,
        sortOrder: data.sortOrder,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    return category;
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        products: true,
      },
    });

    if (!category) {
      throw new NotFoundError('Category');
    }

    if (category.children.length > 0) {
      throw new Error('Cannot delete a category with child categories');
    }

    if (category.products.length > 0) {
      throw new Error('Cannot delete a category with associated products');
    }

    await prisma.category.delete({ where: { id } });

    return { success: true };
  }
}

export const categoryService = new CategoryService();
