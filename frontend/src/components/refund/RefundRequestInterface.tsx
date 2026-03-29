/**
 * Refund Request Interface Component
 * Handles refund requests and tracking for students and admins
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  FileText,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  User,
  MessageSquare,
  Loader2,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';

interface RefundRequest {
  id: string;
  enrollmentId: string;
  userId: string;
  courseId: string;
  originalAmount: number;
  requestedAmount: number;
  calculatedRefundAmount: number;
  reason: string;
  category: 'change_of_mind' | 'technical_issues' | 'course_quality' | 'personal_reasons' | 'other';
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'cancelled';
  policyApplied: string;
  calculationDetails: {
    baseRefund: number;
    deductibles: Array<{ type: string; amount: number; description: string }>;
    finalAmount: number;
  };
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNotes?: string;
  processedAt?: string;
  refundTransactionId?: string;
  estimatedProcessingTime?: number;
  metadata?: Record<string, any>;
  enrollment?: {
    id: string;
    course: {
      title: string;
      thumbnail: string;
      instructor: string;
    };
    enrolledAt: string;
    paymentMethod: string;
  };
}

interface RefundPolicy {
  id: string;
  name: string;
  description: string;
  maxRefundWindow: number;
  autoApprove: boolean;
  applicableCourses: string[];
  isActive: boolean;
}

interface RefundAnalytics {
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  processedRequests: number;
  totalRefundAmount: number;
  averageRefundAmount: number;
  averageProcessingTime: number;
  refundByCategory: { category: string; count: number; amount: number }[];
  refundByMonth: { month: string; count: number; amount: number }[];
  commonRejectionReasons: { reason: string; count: number }[];
}

interface RefundRequestInterfaceProps {
  enrollmentId?: string;
  userId?: string;
  viewMode?: 'student' | 'admin';
  onRefundSubmitted?: () => void;
  onRefundUpdated?: () => void;
  className?: string;
}

export function RefundRequestInterface({ 
  enrollmentId, 
  userId, 
  viewMode = 'student',
  onRefundSubmitted,
  onRefundUpdated,
  className 
}: RefundRequestInterfaceProps) {
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [policies, setPolicies] = useState<RefundPolicy[]>([]);
  const [analytics, setAnalytics] = useState<RefundAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [selectedEnrollment, setSelectedEnrollment] = useState<string>('');
  const [refundReason, setRefundReason] = useState('');
  const [refundCategory, setRefundCategory] = useState<string>('');
  const [requestedAmount, setRequestedAmount] = useState<number>(0);
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRefundData();
  }, [userId, viewMode]);

  const fetchRefundData = async () => {
    setIsLoading(true);
    try {
      // Fetch refund requests
      let endpoint = '/api/refunds';
      if (userId && viewMode === 'student') {
        endpoint = `/api/refunds/user/${userId}`;
      }

      const response = await fetch(endpoint);
      const data = await response.json();
      if (data.success) {
        setRefundRequests(data.data);
      }

      // Fetch policies
      const policiesResponse = await fetch('/api/refunds/policies');
      const policiesData = await policiesResponse.json();
      if (policiesData.success) {
        setPolicies(policiesData.data);
      }

      // Fetch analytics for admin view
      if (viewMode === 'admin') {
        const analyticsResponse = await fetch('/api/refunds/analytics');
        const analyticsData = await analyticsResponse.json();
        if (analyticsData.success) {
          setAnalytics(analyticsData.data);
        }
      }
    } catch (error) {
      console.error('Error fetching refund data:', error);
      setError('Failed to load refund data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRefundRequest = async () => {
    if (!selectedEnrollment || !refundReason || !refundCategory) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: selectedEnrollment,
          reason: refundReason,
          category: refundCategory,
          requestedAmount,
          additionalNotes
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Refund request submitted successfully');
        setSelectedEnrollment('');
        setRefundReason('');
        setRefundCategory('');
        setAdditionalNotes('');
        setRequestedAmount(0);
        fetchRefundData();
        onRefundSubmitted?.();
      } else {
        setError(data.message || 'Failed to submit refund request');
      }
    } catch (error) {
      setError('Failed to submit refund request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveRefund = async (refundId: string, adminNotes?: string) => {
    try {
      const response = await fetch(`/api/refunds/${refundId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Refund request approved');
        fetchRefundData();
        onRefundUpdated?.();
      } else {
        setError(data.message || 'Failed to approve refund request');
      }
    } catch (error) {
      setError('Failed to approve refund request');
    }
  };

  const handleRejectRefund = async (refundId: string, rejectionReason: string) => {
    try {
      const response = await fetch(`/api/refunds/${refundId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Refund request rejected');
        fetchRefundData();
        onRefundUpdated?.();
      } else {
        setError(data.message || 'Failed to reject refund request');
      }
    } catch (error) {
      setError('Failed to reject refund request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'processed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredRequests = refundRequests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || request.category === categoryFilter;
    const matchesSearch = searchTerm === '' || 
      request.enrollment?.course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesCategory && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        Loading refund data...
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Student View */}
      {viewMode === 'student' && (
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList>
            <TabsTrigger value="requests">My Refund Requests</TabsTrigger>
            <TabsTrigger value="new">New Request</TabsTrigger>
            <TabsTrigger value="policies">Refund Policies</TabsTrigger>
          </TabsList>

          {/* Refund Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search refund requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="processed">Processed</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="all">All Categories</option>
                <option value="change_of_mind">Change of Mind</option>
                <option value="technical_issues">Technical Issues</option>
                <option value="course_quality">Course Quality</option>
                <option value="personal_reasons">Personal Reasons</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Requests List */}
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {request.enrollment?.course.title}
                          </h3>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Requested Amount:</span>
                            <p className="font-medium">
                              {formatCurrency(request.requestedAmount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Refund Amount:</span>
                            <p className="font-medium text-green-600">
                              {formatCurrency(request.calculatedRefundAmount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Requested:</span>
                            <p className="font-medium">{formatDate(request.requestedAt)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Category:</span>
                            <p className="font-medium capitalize">
                              {request.category.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium">Reason:</span>
                        <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                      </div>

                      {request.calculationDetails && (
                        <div className="text-sm">
                          <span className="font-medium">Calculation Details:</span>
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between">
                              <span>Base Refund:</span>
                              <span>{formatCurrency(request.calculationDetails.baseRefund)}</span>
                            </div>
                            {request.calculationDetails.deductibles.map((deductible, index) => (
                              <div key={index} className="flex justify-between">
                                <span>{deductible.description}:</span>
                                <span>-${formatCurrency(deductible.amount)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-bold border-t pt-1">
                              <span>Final Amount:</span>
                              <span>{formatCurrency(request.calculationDetails.finalAmount)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {request.adminNotes && (
                        <div>
                          <span className="text-sm font-medium">Admin Notes:</span>
                          <p className="text-sm text-muted-foreground mt-1">{request.adminNotes}</p>
                        </div>
                      )}
                    </div>

                    {request.refundTransactionId && (
                      <div className="flex items-center gap-2 pt-3 border-t">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View Transaction
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          Download Receipt
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {filteredRequests.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Refund Requests</h3>
                    <p className="text-muted-foreground">
                      You haven't submitted any refund requests yet
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* New Request Tab */}
          <TabsContent value="new" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Submit Refund Request</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enrollment Selection */}
                <div>
                  <Label htmlFor="enrollment">Select Enrollment</Label>
                  <Select value={selectedEnrollment} onValueChange={setSelectedEnrollment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an enrollment to refund" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* This would be populated with user's enrollments */}
                      <SelectItem value="enrollment1">Course 1 - $99.99</SelectItem>
                      <SelectItem value="enrollment2">Course 2 - $149.99</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Refund Amount */}
                <div>
                  <Label htmlFor="amount">Requested Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(parseFloat(e.target.value))}
                    placeholder="Enter refund amount"
                  />
                </div>

                {/* Category */}
                <div>
                  <Label htmlFor="category">Refund Category</Label>
                  <Select value={refundCategory} onValueChange={setRefundCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="change_of_mind">Change of Mind</SelectItem>
                      <SelectItem value="technical_issues">Technical Issues</SelectItem>
                      <SelectItem value="course_quality">Course Quality</SelectItem>
                      <SelectItem value="personal_reasons">Personal Reasons</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reason */}
                <div>
                  <Label htmlFor="reason">Reason for Refund</Label>
                  <Textarea
                    id="reason"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Please explain why you're requesting a refund..."
                    rows={4}
                  />
                </div>

                {/* Additional Notes */}
                <div>
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Any additional information..."
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleSubmitRefundRequest}
                  disabled={isSubmitting || !selectedEnrollment || !refundReason || !refundCategory}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Submit Refund Request
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="space-y-4">
            {policies.map((policy) => (
              <Card key={policy.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{policy.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {policy.description}
                      </p>
                    </div>
                    <Badge className={policy.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {policy.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Refund Window:</span>
                      <p className="font-medium">{policy.maxRefundWindow} days</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Auto-Approval:</span>
                      <p className="font-medium">{policy.autoApprove ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Admin View */}
      {viewMode === 'admin' && (
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList>
            <TabsTrigger value="requests">All Requests</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {analytics && (
              <>
                {/* Stats Overview */}
                <div className="grid md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                          <p className="text-2xl font-bold">{analytics.totalRequests}</p>
                        </div>
                        <FileText className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Approved</p>
                          <p className="text-2xl font-bold">{analytics.approvedRequests}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Refunded</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(analytics.totalRefundAmount)}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Avg Processing Time</p>
                          <p className="text-2xl font-bold">
                            {analytics.averageProcessingTime} days
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Analytics */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Refunds by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.refundByCategory.map((item, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="capitalize">{item.category.replace('_', ' ')}</span>
                            <div className="text-right">
                              <div className="font-medium">{item.count}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatCurrency(item.amount)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Common Rejection Reasons</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.commonRejectionReasons.map((item, index) => (
                          <div key={index} className="flex justify-between">
                            <span>{item.reason}</span>
                            <span className="font-medium">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Admin Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            {/* Similar filtering as student view but with admin actions */}
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {request.enrollment?.course.title}
                          </h3>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">User:</span>
                            <p className="font-medium">User ID: {request.userId}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Requested:</span>
                            <p className="font-medium">{formatDate(request.requestedAt)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Amount:</span>
                            <p className="font-medium">
                              {formatCurrency(request.calculatedRefundAmount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium">Reason:</span>
                        <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {request.status === 'pending' && (
                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          onClick={() => handleApproveRefund(request.id)}
                          className="flex-1"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleRejectRefund(request.id, 'Admin review')}
                          className="flex-1"
                        >
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
