import { NextRequest, NextResponse } from 'next/server';
import { performanceReporting } from '@/lib/performance-reporting';

export async function POST(request: NextRequest) {
  try {
    const report = await request.json();
    
    // Validate the report structure
    if (!report.timestamp || !report.metrics) {
      return NextResponse.json(
        { error: 'Invalid report structure' },
        { status: 400 }
      );
    }

    // Store the report (in a real implementation, this would go to a database)
    console.log('Performance report received:', {
      timestamp: report.timestamp,
      score: report.score,
      url: report.url,
      alertCount: report.alerts?.length || 0,
    });

    // Here you would typically:
    // 1. Store in a database (PostgreSQL, MongoDB, etc.)
    // 2. Send to monitoring service (DataDog, New Relic, etc.)
    // 3. Trigger alerts if thresholds are exceeded
    // 4. Update dashboards

    // For now, we'll just acknowledge receipt
    return NextResponse.json({ 
      success: true,
      message: 'Performance report received',
      reportId: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

  } catch (error) {
    console.error('Error processing performance report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // In a real implementation, this would fetch from a database
    // For now, return mock data
    const mockReports = [
      {
        id: 'report_1',
        timestamp: Date.now() - 3600000, // 1 hour ago
        url: '/dashboard',
        score: 85,
        metrics: {
          lcp: 2400,
          fid: 95,
          cls: 0.08,
          fcp: 1700,
          ttfb: 750,
        },
        alerts: [],
      },
      {
        id: 'report_2',
        timestamp: Date.now() - 7200000, // 2 hours ago
        url: '/courses',
        score: 72,
        metrics: {
          lcp: 3200,
          fid: 180,
          cls: 0.15,
          fcp: 2100,
          ttfb: 950,
        },
        alerts: [
          {
            metric: 'lcp',
            value: 3200,
            threshold: 2500,
            severity: 'medium',
            timestamp: Date.now() - 7200000,
            url: '/courses',
          },
        ],
      },
    ];

    return NextResponse.json({
      reports: mockReports,
      total: mockReports.length,
    });

  } catch (error) {
    console.error('Error fetching performance reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
