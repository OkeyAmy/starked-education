'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  Flag,
  MessageSquare,
  FileText,
  Image,
  Video,
  MoreVertical,
  Ban,
  Check,
  BookOpen,
  X
} from 'lucide-react';

interface ContentItem {
  id: string;
  type: 'course' | 'quiz' | 'user_post' | 'comment' | 'file';
  title: string;
  description: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  flags: number;
  reports: Report[];
  createdAt: string;
  updatedAt: string;
  metadata: {
    category?: string;
    difficulty?: string;
    duration?: string;
    fileSize?: number;
  };
}

interface Report {
  id: string;
  reason: string;
  description: string;
  reporter: string;
  createdAt: string;
  status: 'pending' | 'resolved';
}

export default function ContentModeration() {
  const { hasPermission } = useAuth();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

  useEffect(() => {
    fetchContent();
  }, [selectedStatus, selectedType, searchTerm]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: selectedStatus,
        ...(selectedType !== 'all' && { type: selectedType }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/admin/content/moderation?${params}`);
      if (response.ok) {
        const data = await response.json();
        setContent(data.content || []);
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerateContent = async (contentId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const response = await fetch(`/api/admin/content/moderation/${contentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
      });

      if (response.ok) {
        fetchContent();
        setSelectedContent(null);
      }
    } catch (error) {
      console.error('Failed to moderate content:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'course': return <BookOpen className="w-4 h-4" />;
      case 'quiz': return <FileText className="w-4 h-4" />;
      case 'user_post': return <MessageSquare className="w-4 h-4" />;
      case 'comment': return <MessageSquare className="w-4 h-4" />;
      case 'file': return <Image className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'flagged': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (flags: number) => {
    if (flags >= 5) return 'text-red-600 bg-red-100';
    if (flags >= 3) return 'text-orange-600 bg-orange-100';
    if (flags >= 1) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  if (loading && content.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Content Moderation</h1>
          <p className="text-gray-600">Review and moderate platform content</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            <AlertTriangle className="w-4 h-4" />
            Flagged Content ({content.filter(c => c.status === 'flagged').length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">Pending Review</option>
            <option value="flagged">Flagged</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="course">Courses</option>
            <option value="quiz">Quizzes</option>
            <option value="user_post">User Posts</option>
            <option value="comment">Comments</option>
            <option value="file">Files</option>
          </select>

          <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
        </div>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {content.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  {getTypeIcon(item.type)}
                  <h3 className="text-lg font-semibold text-gray-800">{item.title}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(item.flags)}`}>
                    <Flag className="w-3 h-3 inline mr-1" />
                    {item.flags} flags
                  </span>
                </div>
                
                <p className="text-gray-600 mb-3">{item.description}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <span>Author: {item.author.name}</span>
                  <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                  {item.metadata.category && <span>Category: {item.metadata.category}</span>}
                </div>

                {item.reports.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">Recent Reports</h4>
                    <div className="space-y-2">
                      {item.reports.slice(0, 2).map((report) => (
                        <div key={report.id} className="text-sm">
                          <span className="font-medium">{report.reason}:</span>
                          <span className="text-red-600 ml-2">{report.description}</span>
                          <span className="text-red-500 ml-2">
                            by {report.reporter} • {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                      {item.reports.length > 2 && (
                        <div className="text-sm text-red-600">
                          +{item.reports.length - 2} more reports
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => setSelectedContent(item)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {hasPermission('moderation:content') && item.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleModerateContent(item.id, 'approve')}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleModerateContent(item.id, 'reject')}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Detail Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Content Review</h2>
                <button
                  onClick={() => setSelectedContent(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  {getTypeIcon(selectedContent.type)}
                  <h3 className="text-lg font-semibold">{selectedContent.title}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedContent.status)}`}>
                    {selectedContent.status}
                  </span>
                </div>
                <p className="text-gray-600">{selectedContent.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Author Information</h4>
                  <div className="text-sm text-gray-600">
                    <p>Name: {selectedContent.author.name}</p>
                    <p>Email: {selectedContent.author.email}</p>
                    <p>ID: {selectedContent.author.id}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Content Details</h4>
                  <div className="text-sm text-gray-600">
                    <p>Type: {selectedContent.type}</p>
                    <p>Created: {new Date(selectedContent.createdAt).toLocaleDateString()}</p>
                    <p>Updated: {new Date(selectedContent.updatedAt).toLocaleDateString()}</p>
                    {selectedContent.metadata.category && <p>Category: {selectedContent.metadata.category}</p>}
                  </div>
                </div>
              </div>

              {selectedContent.reports.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-3">All Reports ({selectedContent.reports.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedContent.reports.map((report) => (
                      <div key={report.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium">{report.reason}:</span>
                            <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                          </div>
                          <div className="text-xs text-gray-500">
                            <p>{report.reporter}</p>
                            <p>{new Date(report.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasPermission('moderation:content') && selectedContent.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleModerateContent(selectedContent.id, 'approve')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Approve Content
                  </button>
                  <button
                    onClick={() => handleModerateContent(selectedContent.id, 'reject')}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Content
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
