import { Response, NextFunction } from 'express';
import { reportService } from './report.service';
import { successResponse, paginatedResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const period = (req.query.period as 'today' | 'week' | 'month' | 'year') || 'month';
    const stats = await reportService.getDashboardStats(period);
    return successResponse(res, stats);
  } catch (error) {
    next(error);
  }
}

/**
 * Get sales report
 */
export async function getSalesReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate, groupBy } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const report = await reportService.getSalesReport(
      start,
      end,
      (groupBy as 'day' | 'week' | 'month') || 'day'
    );

    return successResponse(res, report);
  } catch (error) {
    next(error);
  }
}

/**
 * Get inventory report
 */
export async function getInventoryReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { lowStock, outOfStock, categoryId } = req.query;

    const report = await reportService.getInventoryReport({
      lowStock: lowStock === 'true',
      outOfStock: outOfStock === 'true',
      categoryId: categoryId as string,
    });

    return successResponse(res, report);
  } catch (error) {
    next(error);
  }
}

/**
 * Get order report
 */
export async function getOrderReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const report = await reportService.getOrderReport(start, end);

    return successResponse(res, report);
  } catch (error) {
    next(error);
  }
}

/**
 * Generate a report (queued)
 */
export async function generateReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { type, startDate, endDate, format } = req.body;

    const report = await reportService.generateReport(
      type,
      {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        format,
      },
      req.admin!.id
    );

    return successResponse(res, report, 'Report ready to download', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Get report by ID
 */
export async function getReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const report = await reportService.getReportById(req.params.id);
    return successResponse(res, report);
  } catch (error) {
    next(error);
  }
}

/**
 * Get all reports
 */
export async function getReports(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { reports, total, page, limit } = await reportService.getReports(req.query);
    return paginatedResponse(res, reports, page, limit, total);
  } catch (error) {
    next(error);
  }
}

/**
 * Get report summary for admin reports page
 */
export async function getReportSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const report = await reportService.getReportSummary(start, end);

    return successResponse(res, report);
  } catch (error) {
    next(error);
  }
}

/**
 * Download a report as CSV
 */
export async function downloadReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { filename, csv } = await reportService.buildReportCsv(req.params.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Byte-order mark so Excel reads the file as UTF-8 (e.g. the GH₵ sign)
    return res.send('\uFEFF' + csv);
  } catch (error) {
    next(error);
  }
}
