import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateSpecificationTemplateInput {
  key: string;
  label: string;
  group?: string;
  type?: string;
  options?: string[];
  required?: boolean;
  sortOrder?: number;
}

export interface UpdateSpecificationTemplateInput {
  key?: string;
  label?: string;
  group?: string;
  type?: string;
  options?: string[];
  required?: boolean;
  sortOrder?: number;
}

export const specificationService = {
  async getAll() {
    return prisma.specificationTemplate.findMany({
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    });
  },

  async getById(id: string) {
    const template = await prisma.specificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error('Specification template not found');
    }

    return template;
  },

  async getByGroup(group: string) {
    return prisma.specificationTemplate.findMany({
      where: { group },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  },

  async create(data: CreateSpecificationTemplateInput) {
    // Check if key already exists
    const existing = await prisma.specificationTemplate.findUnique({
      where: { key: data.key },
    });

    if (existing) {
      throw new Error('A specification with this key already exists');
    }

    return prisma.specificationTemplate.create({
      data: {
        key: data.key,
        label: data.label,
        group: data.group || 'General',
        type: data.type || 'text',
        options: data.options || [],
        required: data.required || false,
        sortOrder: data.sortOrder || 0,
      },
    });
  },

  async update(id: string, data: UpdateSpecificationTemplateInput) {
    // Check if template exists
    await this.getById(id);

    // If updating key, check for duplicates
    if (data.key) {
      const existing = await prisma.specificationTemplate.findFirst({
        where: {
          key: data.key,
          id: { not: id },
        },
      });

      if (existing) {
        throw new Error('A specification with this key already exists');
      }
    }

    return prisma.specificationTemplate.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    // Check if template exists
    await this.getById(id);

    return prisma.specificationTemplate.delete({
      where: { id },
    });
  },

  async getGroups() {
    const result = await prisma.specificationTemplate.findMany({
      select: { group: true },
      distinct: ['group'],
      orderBy: { group: 'asc' },
    });

    return result.map((r) => r.group);
  },
};
