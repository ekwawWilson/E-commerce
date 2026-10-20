import { z } from 'zod';
import { dateRangeSchema, paginationSchema } from './common';
import { ReportType } from '@prisma/client';

// Generate report schema
export const generateReportSchema = z.object({
  type: z.nativeEnum(ReportType),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  format: z.enum(['pdf', 'csv']).default('pdf'),
});

// Report list query schema
export const reportListQuerySchema = paginationSchema.extend({
  type: z.nativeEnum(ReportType).optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  ...dateRangeSchema.shape,
});

// Dashboard stats query schema
export const dashboardStatsQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year']).default('month'),
});

// Sales report query schema
export const salesReportQuerySchema = dateRangeSchema.extend({
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

// Inventory report query schema
export const inventoryReportQuerySchema = z.object({
  lowStock: z.coerce.boolean().optional(),
  outOfStock: z.coerce.boolean().optional(),
  categoryId: z.string().optional(),
});
