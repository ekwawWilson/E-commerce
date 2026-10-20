import prisma from '../../config/database';
import { Prisma } from '@prisma/client';
import { NotFoundError } from '../../middleware/errorHandler';

export interface CreateCourierData {
  name: string;
  phone: string;
  email?: string;
}

export interface UpdateCourierData {
  name?: string;
  phone?: string;
  email?: string;
  active?: boolean;
}

export class CourierService {
  /**
   * List couriers
   */
  async getCouriers(params: { active?: boolean } = {}) {
    const where: Prisma.CourierWhereInput = {};

    if (params.active !== undefined) {
      where.active = params.active;
    }

    return prisma.courier.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get single courier
   */
  async getCourier(id: string) {
    const courier = await prisma.courier.findUnique({ where: { id } });

    if (!courier) {
      throw new NotFoundError('Courier');
    }

    return courier;
  }

  /**
   * Create courier
   */
  async createCourier(data: CreateCourierData) {
    return prisma.courier.create({ data });
  }

  /**
   * Update courier
   */
  async updateCourier(id: string, data: UpdateCourierData) {
    await this.getCourier(id);

    return prisma.courier.update({
      where: { id },
      data,
    });
  }
}

export const courierService = new CourierService();
