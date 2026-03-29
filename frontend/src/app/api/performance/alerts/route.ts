import { NextRequest, NextResponse } from 'next/server';
import { performanceAlertService } from '@/lib/performance-alerts';

export async function POST(request: NextRequest) {
  try {
    const alert = await request.json();
    
    // Validate the alert structure
    if (!alert.metric || !alert.value || !alert.timestamp) {
      return NextResponse.json(
        { error: 'Invalid alert structure' },
        { status: 400 }
      );
    }

    // Process the alert
    console.log('Performance alert received:', {
      metric: alert.metric,
      value: alert.value,
      severity: alert.severity,
      url: alert.url,
      timestamp: alert.timestamp,
    });

    // Here you would typically:
    // 1. Store in a database
    // 2. Send notifications (email, Slack, etc.)
    // 3. Create incidents in monitoring systems
    // 4. Trigger automated responses

    // For demonstration, we'll log and acknowledge
    if (alert.severity === 'high' || alert.severity === 'critical') {
      console.warn('🚨 HIGH SEVERITY ALERT:', alert);
      
      // In a real implementation, you might:
      // - Send SMS/pager alerts
      // - Create incidents in PagerDuty
      // - Send Slack notifications to on-call engineers
      // - Trigger automated rollback procedures
    }

    return NextResponse.json({ 
      success: true,
      message: 'Alert processed',
      alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

  } catch (error) {
    console.error('Error processing performance alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return recent alerts
    const alerts = performanceAlertService.getAlertHistory();
    
    return NextResponse.json({
      alerts: alerts.slice(-50), // Return last 50 alerts
      total: alerts.length,
      config: performanceAlertService.getConfig(),
    });

  } catch (error) {
    console.error('Error fetching performance alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
