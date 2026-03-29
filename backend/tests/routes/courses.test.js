const request = require('supertest');
const app = require('../../src/index');
const userData = require('../fixtures/userData');

// Mock the courseController and version control service
jest.mock('../../src/controllers/courseController', () => ({
  courseController: {
    createCourse: jest.fn(),
    getCourses: jest.fn(),
    getCourse: jest.fn(),
    updateCourse: jest.fn(),
    deleteCourse: jest.fn(),
    enrollStudent: jest.fn(),
    unenrollStudent: jest.fn(),
    getCourseProgress: jest.fn(),
    updateCourseProgress: jest.fn()
  }
}));

jest.mock('../../src/utils/versionControl', () => ({
  VersionControlService: {
    createVersion: jest.fn(),
    getVersionHistory: jest.fn(),
    getCurrentVersion: jest.fn(),
    getVersion: jest.fn(),
    compareVersions: jest.fn(),
    restoreVersion: jest.fn(),
    updateVersionSettings: jest.fn(),
    exportVersions: jest.fn(),
    getVersionStatistics: jest.fn()
  }
}));

const { courseController } = require('../../src/controllers/courseController');
const { VersionControlService } = require('../../src/utils/versionControl');

describe('Course API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Version Control Endpoints', () => {
    describe('POST /api/courses/:contentId/versions', () => {
      it('should create a new version successfully', async () => {
        const mockVersion = userData.versions.validVersion;
        const createdVersion = { ...mockVersion, id: 'ver_123', createdAt: new Date() };
        
        VersionControlService.createVersion.mockResolvedValue(createdVersion);

        const response = await request(app)
          .post('/api/courses/content_123/versions')
          .send(mockVersion);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(createdVersion);
        expect(VersionControlService.createVersion).toHaveBeenCalledWith(mockVersion);
      });

      it('should handle version creation errors', async () => {
        VersionControlService.createVersion.mockRejectedValue(new Error('Creation failed'));

        const response = await request(app)
          .post('/api/courses/content_123/versions')
          .send(userData.versions.validVersion);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Failed to create version');
      });

      it('should validate required fields for version creation', async () => {
        const invalidVersion = userData.versions.invalidVersion;

        const response = await request(app)
          .post('/api/courses/content_123/versions')
          .send(invalidVersion);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/courses/:contentId/versions', () => {
      it('should retrieve version history', async () => {
        const mockHistory = {
          versions: [
            userData.versions.validVersion,
            userData.helpers.generateVersion({ version: 2 })
          ],
          total: 2,
          page: 1,
          limit: 10,
          hasMore: false
        };

        VersionControlService.getVersionHistory.mockResolvedValue(mockHistory);

        const response = await request(app)
          .get('/api/courses/content_123/versions?page=1&limit=10');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockHistory);
        expect(VersionControlService.getVersionHistory).toHaveBeenCalledWith('content_123', {
          page: 1,
          limit: 10
        });
      });

      it('should handle pagination parameters', async () => {
        const mockHistory = {
          versions: [],
          total: 0,
          page: 2,
          limit: 5,
          hasMore: false
        };

        VersionControlService.getVersionHistory.mockResolvedValue(mockHistory);

        const response = await request(app)
          .get('/api/courses/content_123/versions?page=2&limit=5');

        expect(response.status).toBe(200);
        expect(response.body.data.page).toBe(2);
        expect(response.body.data.limit).toBe(5);
      });

      it('should handle version history retrieval errors', async () => {
        VersionControlService.getVersionHistory.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .get('/api/courses/content_123/versions');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/courses/:contentId/versions/current', () => {
      it('should retrieve current version', async () => {
        const mockCurrentVersion = userData.helpers.generateVersion({
          version: 3,
          isCurrent: true
        });

        VersionControlService.getCurrentVersion.mockResolvedValue(mockCurrentVersion);

        const response = await request(app)
          .get('/api/courses/content_123/versions/current');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockCurrentVersion);
        expect(VersionControlService.getCurrentVersion).toHaveBeenCalledWith('content_123');
      });

      it('should handle missing current version', async () => {
        VersionControlService.getCurrentVersion.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/courses/content_123/versions/current');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/courses/:contentId/versions/:versionNumber', () => {
      it('should retrieve specific version', async () => {
        const mockVersion = userData.helpers.generateVersion({ version: 2 });

        VersionControlService.getVersion.mockResolvedValue(mockVersion);

        const response = await request(app)
          .get('/api/courses/content_123/versions/2');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockVersion);
        expect(VersionControlService.getVersion).toHaveBeenCalledWith('content_123', 2);
      });

      it('should handle invalid version number', async () => {
        VersionControlService.getVersion.mockRejectedValue(new Error('Invalid version'));

        const response = await request(app)
          .get('/api/courses/content_123/versions/invalid');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });

      it('should handle non-existent version', async () => {
        VersionControlService.getVersion.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/courses/content_123/versions/999');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/courses/versions/compare/:version1Id/:version2Id', () => {
      it('should compare two versions successfully', async () => {
        const version1 = userData.helpers.generateVersion({ version: 1 });
        const version2 = userData.helpers.generateVersion({ version: 2 });
        const mockComparison = {
          version1,
          version2,
          differences: [
            {
              field: 'title',
              oldValue: 'Version 1',
              newValue: 'Version 2',
              changeType: 'modified'
            }
          ],
          summary: {
            totalChanges: 1,
            additions: 0,
            modifications: 1,
            removals: 0
          }
        };

        VersionControlService.compareVersions.mockResolvedValue(mockComparison);

        const response = await request(app)
          .post('/api/courses/versions/compare/ver_1/ver_2');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockComparison);
        expect(VersionControlService.compareVersions).toHaveBeenCalledWith('ver_1', 'ver_2');
      });

      it('should handle comparison errors', async () => {
        VersionControlService.compareVersions.mockRejectedValue(new Error('Comparison failed'));

        const response = await request(app)
          .post('/api/courses/versions/compare/ver_1/ver_2');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/courses/:contentId/versions/restore', () => {
      it('should restore content to specific version', async () => {
        const restoreData = {
          versionId: 'ver_1',
          restoreReason: 'Reverting to stable version',
          restoredBy: 'GD5DJ3B7MHLRWGS7QKXYYEJZRGFQMVJ7T7S6DLPNHP5TGB7FZ7NBHJVP'
        };
        const mockRestoredContent = {
          id: 'content_123',
          title: 'Restored Content',
          version: { current: 3 },
          updatedAt: new Date()
        };

        VersionControlService.restoreVersion.mockResolvedValue(mockRestoredContent);

        const response = await request(app)
          .post('/api/courses/content_123/versions/restore')
          .send(restoreData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockRestoredContent);
        expect(VersionControlService.restoreVersion).toHaveBeenCalledWith('content_123', restoreData);
      });

      it('should validate restore request data', async () => {
        const invalidRestoreData = {
          versionId: '', // empty
          restoreReason: 'a', // too short
          restoredBy: 'invalid-address'
        };

        const response = await request(app)
          .post('/api/courses/content_123/versions/restore')
          .send(invalidRestoreData);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/courses/:contentId/versions/settings', () => {
      it('should update version control settings', async () => {
        const settingsData = {
          autoVersioning: true,
          maxVersions: 20,
          versionRetention: '6months'
        };
        const mockUpdatedSettings = {
          contentId: 'content_123',
          ...settingsData,
          updatedAt: new Date()
        };

        VersionControlService.updateVersionSettings.mockResolvedValue(mockUpdatedSettings);

        const response = await request(app)
          .put('/api/courses/content_123/versions/settings')
          .send(settingsData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockUpdatedSettings);
        expect(VersionControlService.updateVersionSettings).toHaveBeenCalledWith('content_123', settingsData);
      });

      it('should handle invalid settings data', async () => {
        const invalidSettings = {
          autoVersioning: 'not-a-boolean',
          maxVersions: -1 // negative
        };

        VersionControlService.updateVersionSettings.mockRejectedValue(new Error('Invalid settings'));

        const response = await request(app)
          .put('/api/courses/content_123/versions/settings')
          .send(invalidSettings);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/courses/:contentId/versions/export', () => {
      it('should export versions as JSON', async () => {
        const mockExportData = {
          versions: [userData.versions.validVersion],
          metadata: {
            exportedAt: new Date(),
            format: 'json'
          }
        };

        VersionControlService.exportVersions.mockResolvedValue(mockExportData);

        const response = await request(app)
          .get('/api/courses/content_123/versions/export?format=json');

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('application/json');
        expect(response.headers['content-disposition']).toContain('attachment');
      });

      it('should export versions as CSV', async () => {
        const mockCSVData = 'Version,Title,Description,Created By,Created At\n1,Test Version,Test Description,user123,2024-01-01';

        VersionControlService.exportVersions.mockResolvedValue(mockCSVData);

        const response = await request(app)
          .get('/api/courses/content_123/versions/export?format=csv');

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment');
      });

      it('should handle unsupported export format', async () => {
        const response = await request(app)
          .get('/api/courses/content_123/versions/export?format=xml');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/courses/:contentId/versions/statistics', () => {
      it('should retrieve version statistics', async () => {
        const mockStatistics = {
          totalVersions: 5,
          currentVersion: 5,
          lastUpdate: new Date(),
          versionsByCreator: {
            'user_123': 3,
            'user_456': 2
          },
          averageVersionsPerMonth: 2.5,
          recentActivity: [
            {
              version: 5,
              createdAt: new Date(),
              changes: ['Bug fixes', 'Performance improvements']
            }
          ]
        };

        VersionControlService.getVersionStatistics.mockResolvedValue(mockStatistics);

        const response = await request(app)
          .get('/api/courses/content_123/versions/statistics');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockStatistics);
        expect(VersionControlService.getVersionStatistics).toHaveBeenCalledWith('content_123');
      });

      it('should handle statistics retrieval errors', async () => {
        VersionControlService.getVersionStatistics.mockRejectedValue(new Error('Statistics error'));

        const response = await request(app)
          .get('/api/courses/content_123/versions/statistics');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Course Management Endpoints', () => {
    describe('POST /api/courses', () => {
      it('should create a new course successfully', async () => {
        const mockCourse = userData.courses.validCourse;
        const createdCourse = { ...mockCourse, id: 'course_123', createdAt: new Date() };

        courseController.createCourse.mockResolvedValue(createdCourse);

        const response = await request(app)
          .post('/api/courses')
          .send(mockCourse);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(createdCourse);
      });

      it('should validate course creation data', async () => {
        const invalidCourse = userData.courses.invalidCourse;

        const response = await request(app)
          .post('/api/courses')
          .send(invalidCourse);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/courses', () => {
      it('should retrieve courses with pagination', async () => {
        const mockCourses = [
          userData.courses.validCourse,
          userData.courses.advancedCourse
        ];
        const mockResult = {
          courses: mockCourses,
          total: 2,
          page: 1,
          limit: 10,
          hasMore: false
        };

        courseController.getCourses.mockResolvedValue(mockResult);

        const response = await request(app)
          .get('/api/courses?page=1&limit=10&category=blockchain');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockResult);
      });

      it('should handle filter parameters', async () => {
        const mockResult = { courses: [], total: 0, page: 1, limit: 10, hasMore: false };
        courseController.getCourses.mockResolvedValue(mockResult);

        const response = await request(app)
          .get('/api/courses?level=beginner&price=free');

        expect(response.status).toBe(200);
        expect(courseController.getCourses).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          level: 'beginner',
          price: 'free'
        });
      });
    });

    describe('GET /api/courses/:courseId', () => {
      it('should retrieve specific course', async () => {
        const mockCourse = userData.courses.validCourse;

        courseController.getCourse.mockResolvedValue(mockCourse);

        const response = await request(app)
          .get('/api/courses/course_123');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockCourse);
      });

      it('should handle non-existent course', async () => {
        courseController.getCourse.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/courses/nonexistent');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/courses/:courseId', () => {
      it('should update course successfully', async () => {
        const updateData = { title: 'Updated Course Title' };
        const updatedCourse = { ...userData.courses.validCourse, ...updateData };

        courseController.updateCourse.mockResolvedValue(updatedCourse);

        const response = await request(app)
          .put('/api/courses/course_123')
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(updatedCourse);
      });

      it('should validate course update data', async () => {
        const invalidUpdate = { title: 'a' }; // too short

        const response = await request(app)
          .put('/api/courses/course_123')
          .send(invalidUpdate);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/courses/:courseId', () => {
      it('should delete course successfully', async () => {
        courseController.deleteCourse.mockResolvedValue({ deleted: true });

        const response = await request(app)
          .delete('/api/courses/course_123');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should handle course deletion errors', async () => {
        courseController.deleteCourse.mockRejectedValue(new Error('Cannot delete course'));

        const response = await request(app)
          .delete('/api/courses/course_123');

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/courses/:courseId/enroll', () => {
      it('should enroll student in course', async () => {
        const enrollmentData = {
          studentId: 'student_123',
          enrollmentType: 'full'
        };
        const mockEnrollment = {
          id: 'enrollment_123',
          courseId: 'course_123',
          ...enrollmentData,
          enrolledAt: new Date()
        };

        courseController.enrollStudent.mockResolvedValue(mockEnrollment);

        const response = await request(app)
          .post('/api/courses/course_123/enroll')
          .send(enrollmentData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockEnrollment);
      });

      it('should handle duplicate enrollment', async () => {
        courseController.enrollStudent.mockRejectedValue(new Error('Already enrolled'));

        const response = await request(app)
          .post('/api/courses/course_123/enroll')
          .send({ studentId: 'student_123' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/courses/:courseId/enroll/:studentId', () => {
      it('should unenroll student from course', async () => {
        courseController.unenrollStudent.mockResolvedValue({ unenrolled: true });

        const response = await request(app)
          .delete('/api/courses/course_123/enroll/student_123');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/courses/:courseId/progress/:studentId', () => {
      it('should retrieve course progress', async () => {
        const mockProgress = {
          courseId: 'course_123',
          studentId: 'student_123',
          completedSections: ['section1', 'section2'],
          totalSections: 5,
          progressPercentage: 40,
          lastAccessed: new Date(),
          timeSpent: 3600
        };

        courseController.getCourseProgress.mockResolvedValue(mockProgress);

        const response = await request(app)
          .get('/api/courses/course_123/progress/student_123');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockProgress);
      });
    });

    describe('PUT /api/courses/:courseId/progress/:studentId', () => {
      it('should update course progress', async () => {
        const progressData = {
          completedSections: ['section1', 'section2', 'section3'],
          timeSpent: 4200
        };
        const updatedProgress = {
          courseId: 'course_123',
          studentId: 'student_123',
          ...progressData,
          progressPercentage: 60,
          lastAccessed: new Date()
        };

        courseController.updateCourseProgress.mockResolvedValue(updatedProgress);

        const response = await request(app)
          .put('/api/courses/course_123/progress/student_123')
          .send(progressData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(updatedProgress);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    it('should handle concurrent version creation', async () => {
      const version1 = userData.helpers.generateVersion();
      const version2 = userData.helpers.generateVersion();

      VersionControlService.createVersion
        .mockResolvedValueOnce({ ...version1, id: 'ver_1' })
        .mockResolvedValueOnce({ ...version2, id: 'ver_2' });

      const [response1, response2] = await Promise.all([
        request(app).post('/api/courses/content_123/versions').send(version1),
        request(app).post('/api/courses/content_123/versions').send(version2)
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
    });

    it('should handle rate limiting on version operations', async () => {
      // Mock rate limit exceeded
      VersionControlService.createVersion.mockRejectedValue(new Error('Rate limit exceeded'));

      const responses = await Promise.all(
        Array(10).fill().map(() =>
          request(app).post('/api/courses/content_123/versions').send(userData.versions.validVersion)
        )
      );

      expect(responses.some(r => r.status === 429)).toBe(true);
    });

    it('should handle large file uploads in course content', async () => {
      const largeContent = {
        ...userData.courses.validCourse,
        content: {
          sections: Array(1000).fill().map((_, i) => ({
            id: `section_${i}`,
            title: `Section ${i}`,
            content: 'a'.repeat(10000), // Large content
            order: i
          }))
        }
      };

      courseController.createCourse.mockRejectedValue(new Error('Content too large'));

      const response = await request(app)
        .post('/api/courses')
        .send(largeContent);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
