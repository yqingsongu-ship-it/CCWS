import { createLogger } from "../utils/logger.js";
import type { ResourceTiming } from "@synthetic-monitoring/shared";

const logger = createLogger("page-perf-service");

export interface PerfMetrics {
  fcp: number;
  lcp: number;
  cls: number;
  fid: number;
  tti?: number;
  ttfb?: number;
}

export interface PagePerfResult {
  url: string;
  metrics: PerfMetrics;
  score: number;
  screenshot?: string;
  har?: unknown;
  resources: ResourceTiming[];
  timestamp: Date;
}

export class PagePerfService {
  /**
   * Calculate performance score (0-100)
   */
  public calculateScore(metrics: PerfMetrics): number {
    const weights = { fcp: 0.25, lcp: 0.25, cls: 0.25, fid: 0.25 };

    const fcpScore = this.calculateFcpScore(metrics.fcp);
    const lcpScore = this.calculateLcpScore(metrics.lcp);
    const clsScore = this.calculateClsScore(metrics.cls);
    const fidScore = this.calculateFidScore(metrics.fid);

    const score = (
      fcpScore * weights.fcp +
      lcpScore * weights.lcp +
      clsScore * weights.cls +
      fidScore * weights.fid
    ) * 100;

    return Math.round(score);
  }

  private calculateFcpScore(fcp: number): number {
    if (fcp <= 1800) return 1;
    if (fcp <= 3000) return 0.5;
    return 0;
  }

  private calculateLcpScore(lcp: number): number {
    if (lcp <= 2500) return 1;
    if (lcp <= 4000) return 0.5;
    return 0;
  }

  private calculateClsScore(cls: number): number {
    if (cls <= 0.1) return 1;
    if (cls <= 0.25) return 0.5;
    return 0;
  }

  private calculateFidScore(fid: number): number {
    if (fid <= 100) return 1;
    if (fid <= 300) return 0.5;
    return 0;
  }

  /**
   * Parse resource timing entries
   */
  public parseResourceTiming(entries: any[]): ResourceTiming[] {
    return entries.map(entry => ({
      name: entry.name,
      type: entry.initiatorType || "other",
      startTime: entry.startTime || 0,
      duration: entry.duration || 0,
      transferSize: entry.transferSize || 0,
      encodedBodySize: entry.encodedBodySize || 0,
      decodedBodySize: entry.decodedBodySize || 0,
      initiatorType: entry.initiatorType,
    }));
  }

  /**
   * Capture page screenshot
   */
  public async captureScreenshot(page: any): Promise<string> {
    try {
      const buffer = await page.screenshot({ fullPage: true, type: "png" });
      return buffer.toString("base64");
    } catch (error) {
      logger.error("Failed to capture screenshot", { error });
      return "";
    }
  }

  /**
   * Generate HAR data
   */
  public async generateHar(page: any): Promise<unknown> {
    // Implementation would use puppeteer har plugin
    return {};
  }
}

export const pagePerfService = new PagePerfService();
