import { Client } from '@elastic/elasticsearch';
import logger from '../../utils/logger';

export class ElasticsearchService {
  private client: Client;
  private readonly indices = {
    courses: 'courses',
    users: 'users',
    content: 'content'
  };

  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
      }
    });
  }

  async initializeIndices() {
    try {
      const courseIndexExists = await this.client.indices.exists({ index: this.indices.courses });
      if (!courseIndexExists) {
        await this.client.indices.create({
          index: this.indices.courses,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                title: { 
                  type: 'text', 
                  analyzer: 'english',
                  fields: {
                    suggest: { type: 'completion' }
                  }
                },
                description: { type: 'text', analyzer: 'english' },
                category: { type: 'keyword' },
                level: { type: 'keyword' },
                tags: { type: 'keyword' },
                price: { type: 'float' },
                rating: { type: 'float' },
                enrollmentCount: { type: 'integer' },
                content_vector: { type: 'dense_vector', dims: 384 }
              }
            }
          }
        });
        logger.info('Created courses index in Elasticsearch');
      }
      
      const userIndexExists = await this.client.indices.exists({ index: this.indices.users });
      if (!userIndexExists) {
        await this.client.indices.create({
          index: this.indices.users,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text' },
                bio: { type: 'text' },
                skills: { type: 'keyword' }
              }
            }
          }
        });
        logger.info('Created users index in Elasticsearch');
      }
    } catch (error) {
      logger.error('Error initializing Elasticsearch indices', error);
    }
  }

  async indexCourse(course: any) {
    try {
      await this.client.index({
        index: this.indices.courses,
        id: course.id,
        body: {
          id: course.id,
          title: course.title,
          description: course.description,
          category: course.category?.id || course.category,
          level: course.metadata?.level || course.level,
          tags: course.tags,
          price: course.price,
          rating: course.rating,
          enrollmentCount: course.enrollmentCount
        }
      });
    } catch (error) {
      logger.error('Error indexing course to Elasticsearch', error);
    }
  }

  async searchCourses(query: string, filters: any, from = 0, size = 10) {
    try {
      const must: any[] = [];
      const filter: any[] = [];

      if (query) {
        must.push({
          multi_match: {
            query,
            fields: ['title^3', 'description', 'tags^2'],
            fuzziness: 'AUTO'
          }
        });
      } else {
        must.push({ match_all: {} });
      }

      if (filters.category) filter.push({ term: { category: filters.category } });
      if (filters.level) filter.push({ term: { level: filters.level } });
      if (filters.tags && filters.tags.length > 0) filter.push({ terms: { tags: filters.tags } });
      if (filters.priceRange) {
        filter.push({
          range: {
            price: { gte: filters.priceRange.min, lte: filters.priceRange.max }
          }
        });
      }

      let sort: any = [{ _score: 'desc' }];
      if (filters.sortBy === 'newest') sort = [{ 'metadata.createdAt': 'desc' }];
      else if (filters.sortBy === 'popular') sort = [{ enrollmentCount: 'desc' }];
      else if (filters.sortBy === 'price-low') sort = [{ price: 'asc' }];
      else if (filters.sortBy === 'price-high') sort = [{ price: 'desc' }];

      const response = await this.client.search({
        index: this.indices.courses,
        body: {
          from,
          size,
          query: {
            bool: { must, filter }
          },
          sort,
          aggs: {
            categories: { terms: { field: 'category' } },
            levels: { terms: { field: 'level' } }
          }
        }
      });

      return {
        hits: response.hits.hits.map((hit: any) => hit._source),
        total: typeof response.hits.total === 'number' ? response.hits.total : (response.hits.total as any).value,
        aggregations: response.aggregations
      };
    } catch (error) {
      logger.error('Error searching courses in Elasticsearch', error);
      throw error;
    }
  }

  async getSuggestions(query: string): Promise<string[]> {
    try {
      const response = await this.client.search({
        index: this.indices.courses,
        body: {
          suggest: {
            course_suggest: {
              prefix: query,
              completion: {
                field: 'title.suggest',
                size: 5
              }
            }
          }
        }
      });
      
      const suggestions = response.suggest?.course_suggest?.[0]?.options.map((opt: any) => opt.text) || [];
      return suggestions;
    } catch (error) {
      logger.error('Error getting suggestions from Elasticsearch', error);
      return [];
    }
  }
}

export default new ElasticsearchService();