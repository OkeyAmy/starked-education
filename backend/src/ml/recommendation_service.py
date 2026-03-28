"""
Python Recommendation Service
Main service for handling recommendation requests from Node.js
"""

import argparse
import json
import sys
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np

# Import our recommendation engines
from collaborative_filtering import CollaborativeFilteringEngine
from content_based_filtering import ContentBasedRecommendationEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RecommendationService:
    """
    Main recommendation service that orchestrates different recommendation algorithms
    """
    
    def __init__(self):
        self.collaborative_engine = None
        self.content_engine = None
        self.is_initialized = False
        
        # Data storage (in production, this would be a database)
        self.interactions_data = None
        self.courses_data = None
        self.user_profiles = {}
        
    def initialize(self) -> Dict[str, Any]:
        """
        Initialize the recommendation service
        """
        try:
            logger.info("Initializing recommendation service...")
            
            # Load sample data (in production, load from database)
            self._load_sample_data()
            
            # Initialize collaborative filtering engine
            self.collaborative_engine = CollaborativeFilteringEngine()
            self.collaborative_engine.prepare_data(self.interactions_data)
            
            # Initialize content-based engine
            self.content_engine = ContentBasedRecommendationEngine()
            self.content_engine.build_course_features(self.courses_data)
            
            # Train models
            self._train_models()
            
            # Build user profiles
            self._build_user_profiles()
            
            self.is_initialized = True
            
            logger.info("Recommendation service initialized successfully")
            return {
                "status": "success",
                "message": "Recommendation service initialized",
                "models_trained": list(self.collaborative_engine.models.keys()) if self.collaborative_engine else [],
                "users_profiled": len(self.user_profiles)
            }
            
        except Exception as e:
            logger.error(f"Failed to initialize recommendation service: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def _load_sample_data(self):
        """Load sample data for demonstration"""
        # Sample interactions data
        interactions = []
        courses = []
        users = []
        
        # Generate sample data
        np.random.seed(42)
        n_users = 1000
        n_courses = 500
        n_interactions = 10000
        
        # Generate courses
        categories = ['Programming', 'Data Science', 'Web Development', 'Mobile Development', 'AI/ML']
        difficulties = ['beginner', 'intermediate', 'advanced', 'expert']
        
        for i in range(n_courses):
            course = {
                'course_id': f'course_{i}',
                'title': f'Course {i} Title',
                'description': f'Description for course {i} with detailed content about learning objectives and outcomes',
                'category': np.random.choice(categories),
                'difficulty_level': np.random.choice(difficulties),
                'duration': np.random.randint(1, 100),
                'rating': np.random.uniform(3.0, 5.0),
                'num_reviews': np.random.randint(10, 1000),
                'price': np.random.uniform(0, 200),
                'content': f'Course content for course {i} includes comprehensive learning materials'
            }
            courses.append(course)
        
        # Generate interactions
        for i in range(n_interactions):
            user_id = f'user_{np.random.randint(0, n_users)}'
            course_id = f'course_{np.random.randint(0, n_courses)}'
            rating = np.random.uniform(1, 5)
            timestamp = datetime.now() - timedelta(days=np.random.randint(0, 365))
            
            interaction = {
                'user_id': user_id,
                'course_id': course_id,
                'rating': rating,
                'timestamp': timestamp.isoformat()
            }
            interactions.append(interaction)
        
        self.interactions_data = pd.DataFrame(interactions)
        self.courses_data = pd.DataFrame(courses)
        
        logger.info(f"Loaded {len(courses)} courses and {len(interactions)} interactions")
    
    def _train_models(self):
        """Train recommendation models"""
        if self.collaborative_engine:
            logger.info("Training collaborative filtering models...")
            
            # Train different collaborative filtering algorithms
            self.collaborative_engine.train_user_based_cf(self.interactions_data)
            self.collaborative_engine.train_item_based_cf(self.interactions_data)
            self.collaborative_engine.train_matrix_factorization(self.interactions_data)
            self.collaborative_engine.train_implicit_cf(self.interactions_data)
            self.collaborative_engine.train_lightfm(self.interactions_data)
            
            logger.info("Collaborative filtering models trained")
    
    def _build_user_profiles(self):
        """Build user profiles for content-based filtering"""
        if self.content_engine:
            logger.info("Building user profiles...")
            
            # Build profiles for all users
            for user_id in self.interactions_data['user_id'].unique():
                user_interactions = self.interactions_data[
                    self.interactions_data['user_id'] == user_id
                ]
                profile = self.content_engine.build_user_profile(user_id, user_interactions)
                self.user_profiles[user_id] = profile
            
            logger.info(f"Built profiles for {len(self.user_profiles)} users")
    
    def get_recommendations(self, user_id: str, count: int = 10, 
                          algorithm: str = 'hybrid', 
                          include_explanations: bool = True,
                          context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Get recommendations for a user
        """
        try:
            if not self.is_initialized:
                return {"error": "Service not initialized"}
            
            context = context or {}
            recommendations = []
            
            if algorithm == 'collaborative':
                # Get collaborative filtering recommendations
                recommendations = self.collaborative_engine.get_hybrid_recommendations(
                    user_id, count
                )
            
            elif algorithm == 'content_based':
                # Get content-based recommendations
                recommendations = self.content_engine.get_content_based_recommendations(
                    user_id, count
                )
            
            elif algorithm == 'hybrid':
                # Get hybrid recommendations
                cf_recs = self.collaborative_engine.get_hybrid_recommendations(
                    user_id, count // 2
                )
                
                cb_recs = self.content_engine.get_content_based_recommendations(
                    user_id, count // 2
                )
                
                # Combine and rank
                all_recs = {}
                
                # Add collaborative filtering recommendations
                for rec in cf_recs:
                    course_id = rec['item_id']
                    if course_id not in all_recs:
                        all_recs[course_id] = {
                            'course_id': course_id,
                            'score': 0,
                            'algorithms': [],
                            'explanations': []
                        }
                    all_recs[course_id]['score'] += rec['score'] * 0.6
                    all_recs[course_id]['algorithms'].append('collaborative')
                    if 'explanation' in rec:
                        all_recs[course_id]['explanations'].append(rec['explanation'])
                
                # Add content-based recommendations
                for rec in cb_recs:
                    course_id = rec['course_id']
                    if course_id not in all_recs:
                        all_recs[course_id] = {
                            'course_id': course_id,
                            'score': 0,
                            'algorithms': [],
                            'explanations': []
                        }
                    all_recs[course_id]['score'] += rec['score'] * 0.4
                    all_recs[course_id]['algorithms'].append('content_based')
                    if 'explanation' in rec:
                        all_recs[course_id]['explanations'].append(rec['explanation'])
                
                # Sort by score
                recommendations = sorted(
                    all_recs.values(), 
                    key=lambda x: x['score'], 
                    reverse=True
                )[:count]
            
            # Add course details
            for rec in recommendations:
                course_id = rec.get('course_id') or rec.get('item_id')
                course_details = self._get_course_details(course_id)
                rec['course_details'] = course_details
            
            return {
                "recommendations": recommendations,
                "algorithm": algorithm,
                "count": len(recommendations),
                "user_id": user_id
            }
            
        except Exception as e:
            logger.error(f"Error getting recommendations for user {user_id}: {e}")
            return {"error": str(e)}
    
    def get_similar_courses(self, course_id: str, count: int = 10, 
                           algorithm: str = 'content_based') -> Dict[str, Any]:
        """
        Get courses similar to a given course
        """
        try:
            if not self.is_initialized:
                return {"error": "Service not initialized"}
            
            if algorithm == 'content_based' and self.content_engine:
                similar_courses = self.content_engine.get_similar_courses(course_id, count)
            else:
                similar_courses = []
            
            return {
                "similar_courses": similar_courses,
                "course_id": course_id,
                "count": len(similar_courses)
            }
            
        except Exception as e:
            logger.error(f"Error getting similar courses for {course_id}: {e}")
            return {"error": str(e)}
    
    def update_user_profile(self, user_id: str, interactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Update user profile with new interactions
        """
        try:
            if not self.is_initialized:
                return {"error": "Service not initialized"}
            
            # Convert interactions to DataFrame
            new_interactions_df = pd.DataFrame(interactions)
            
            # Update existing interactions data
            self.interactions_data = pd.concat([
                self.interactions_data,
                new_interactions_df
            ], ignore_index=True)
            
            # Update user profile
            if self.content_engine:
                user_interactions = self.interactions_data[
                    self.interactions_data['user_id'] == user_id
                ]
                profile = self.content_engine.build_user_profile(user_id, user_interactions)
                self.user_profiles[user_id] = profile
            
            # Retrain models periodically (simplified)
            if len(new_interactions_df) > 10:  # Retrain if significant new data
                self._train_models()
            
            return {
                "status": "success",
                "message": f"Profile updated for user {user_id}",
                "new_interactions": len(interactions)
            }
            
        except Exception as e:
            logger.error(f"Error updating profile for user {user_id}: {e}")
            return {"error": str(e)}
    
    def get_explanation(self, user_id: str, course_id: str) -> Dict[str, Any]:
        """
        Get explanation for why a course is recommended to a user
        """
        try:
            if not self.is_initialized:
                return {"error": "Service not initialized"}
            
            if self.content_engine:
                explanation = self.content_engine.get_course_explanation(user_id, course_id)
                return {"explanation": explanation}
            else:
                return {"error": "Content-based engine not available"}
            
        except Exception as e:
            logger.error(f"Error getting explanation for user {user_id}, course {course_id}: {e}")
            return {"error": str(e)}
    
    def get_popular_courses(self, count: int = 20, category: str = None, 
                          time_range: str = '7d') -> Dict[str, Any]:
        """
        Get popular courses
        """
        try:
            if not self.is_initialized:
                return {"error": "Service not initialized"}
            
            # Filter by time range
            cutoff_date = datetime.now() - timedelta(days=7)  # Simplified: always 7 days
            recent_interactions = self.interactions_data[
                pd.to_datetime(self.interactions_data['timestamp']) >= cutoff_date
            ]
            
            # Calculate popularity based on interactions and ratings
            popularity = recent_interactions.groupby('course_id').agg({
                'rating': ['mean', 'count'],
                'user_id': 'nunique'
            }).round(2)
            
            popularity.columns = ['avg_rating', 'interaction_count', 'unique_users']
            popularity['popularity_score'] = (
                popularity['avg_rating'] * 0.3 + 
                popularity['interaction_count'] * 0.4 + 
                popularity['unique_users'] * 0.3
            )
            
            # Filter by category if specified
            if category:
                category_courses = self.courses_data[
                    self.courses_data['category'] == category
                ]['course_id'].tolist()
                popularity = popularity[popularity.index.isin(category_courses)]
            
            # Get top courses
            top_courses = popularity.sort_values('popularity_score', ascending=False).head(count)
            
            # Add course details
            courses = []
            for course_id in top_courses.index:
                course_details = self._get_course_details(course_id)
                course_details['popularity_score'] = top_courses.loc[course_id, 'popularity_score']
                courses.append(course_details)
            
            return {
                "courses": courses,
                "count": len(courses),
                "category": category,
                "time_range": time_range
            }
            
        except Exception as e:
            logger.error(f"Error getting popular courses: {e}")
            return {"error": str(e)}
    
    def get_trending_courses(self, count: int = 20, category: str = None, 
                           time_range: str = '24h') -> Dict[str, Any]:
        """
        Get trending courses (recently popular)
        """
        try:
            if not self.is_initialized:
                return {"error": "Service not initialized"}
            
            # For trending, look at very recent interactions
            cutoff_date = datetime.now() - timedelta(hours=24)  # Simplified: always 24 hours
            recent_interactions = self.interactions_data[
                pd.to_datetime(self.interactions_data['timestamp']) >= cutoff_date
            ]
            
            # Calculate trending score (recent growth)
            trending = recent_interactions.groupby('course_id').agg({
                'rating': 'mean',
                'user_id': 'nunique'
            }).round(2)
            
            trending.columns = ['avg_rating', 'recent_users']
            trending['trending_score'] = (
                trending['avg_rating'] * 0.4 + 
                trending['recent_users'] * 0.6
            )
            
            # Filter by category if specified
            if category:
                category_courses = self.courses_data[
                    self.courses_data['category'] == category
                ]['course_id'].tolist()
                trending = trending[trending.index.isin(category_courses)]
            
            # Get top trending courses
            top_courses = trending.sort_values('trending_score', ascending=False).head(count)
            
            # Add course details
            courses = []
            for course_id in top_courses.index:
                course_details = self._get_course_details(course_id)
                course_details['trending_score'] = top_courses.loc[course_id, 'trending_score']
                courses.append(course_details)
            
            return {
                "courses": courses,
                "count": len(courses),
                "category": category,
                "time_range": time_range
            }
            
        except Exception as e:
            logger.error(f"Error getting trending courses: {e}")
            return {"error": str(e)}
    
    def train_models(self, algorithms: List[str] = None, force_retrain: bool = False) -> Dict[str, Any]:
        """
        Train recommendation models
        """
        try:
            if algorithms is None:
                algorithms = ['collaborative', 'content_based']
            
            results = {}
            
            if 'collaborative' in algorithms and self.collaborative_engine:
                logger.info("Training collaborative filtering models...")
                cf_metrics = {}
                cf_metrics['user_based'] = self.collaborative_engine.train_user_based_cf(self.interactions_data)
                cf_metrics['item_based'] = self.collaborative_engine.train_item_based_cf(self.interactions_data)
                cf_metrics['matrix_factorization'] = self.collaborative_engine.train_matrix_factorization(self.interactions_data)
                cf_metrics['implicit'] = self.collaborative_engine.train_implicit_cf(self.interactions_data)
                cf_metrics['lightfm'] = self.collaborative_engine.train_lightfm(self.interactions_data)
                results['collaborative'] = cf_metrics
            
            if 'content_based' in algorithms and self.content_engine:
                logger.info("Training content-based models...")
                self.content_engine.build_course_features(self.courses_data)
                self._build_user_profiles()
                results['content_based'] = {"status": "success"}
            
            return {
                "status": "success",
                "results": results,
                "message": "Models trained successfully"
            }
            
        except Exception as e:
            logger.error(f"Error training models: {e}")
            return {"error": str(e)}
    
    def evaluate_models(self, algorithms: List[str] = None, metrics: List[str] = None) -> Dict[str, Any]:
        """
        Evaluate model performance
        """
        try:
            if algorithms is None:
                algorithms = ['collaborative', 'content_based']
            
            if metrics is None:
                metrics = ['precision', 'recall', 'ndcg']
            
            results = {}
            
            # Split data for evaluation
            train_size = int(len(self.interactions_data) * 0.8)
            train_data = self.interactions_data.iloc[:train_size]
            test_data = self.interactions_data.iloc[train_size:]
            
            if 'collaborative' in algorithms and self.collaborative_engine:
                cf_results = self.collaborative_engine.evaluate_models(test_data)
                results['collaborative'] = cf_results
            
            if 'content_based' in algorithms and self.content_engine:
                cb_results = self.content_engine.evaluate_recommendations(test_data)
                results['content_based'] = cb_results
            
            return {
                "status": "success",
                "results": results,
                "test_size": len(test_data),
                "train_size": len(train_data)
            }
            
        except Exception as e:
            logger.error(f"Error evaluating models: {e}")
            return {"error": str(e)}
    
    def get_statistics(self, time_range: str = '24h') -> Dict[str, Any]:
        """
        Get recommendation system statistics
        """
        try:
            # Calculate time-based statistics
            cutoff_date = datetime.now() - timedelta(hours=24)
            recent_interactions = self.interactions_data[
                pd.to_datetime(self.interactions_data['timestamp']) >= cutoff_date
            ]
            
            stats = {
                "total_users": self.interactions_data['user_id'].nunique(),
                "total_courses": len(self.courses_data),
                "total_interactions": len(self.interactions_data),
                "recent_interactions": len(recent_interactions),
                "avg_rating": self.interactions_data['rating'].mean(),
                "models_available": {
                    "collaborative": self.collaborative_engine is not None,
                    "content_based": self.content_engine is not None
                },
                "user_profiles": len(self.user_profiles)
            }
            
            return {"statistics": stats}
            
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {"error": str(e)}
    
    def health_check(self) -> Dict[str, Any]:
        """
        Health check for the recommendation service
        """
        try:
            health = {
                "status": "healthy",
                "initialized": self.is_initialized,
                "models": {
                    "collaborative": self.collaborative_engine is not None,
                    "content_based": self.content_engine is not None
                },
                "data": {
                    "interactions": len(self.interactions_data) if self.interactions_data is not None else 0,
                    "courses": len(self.courses_data) if self.courses_data is not None else 0,
                    "user_profiles": len(self.user_profiles)
                }
            }
            
            return health
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    def _get_course_details(self, course_id: str) -> Dict[str, Any]:
        """Get course details by ID"""
        if self.courses_data is not None:
            course = self.courses_data[self.courses_data['course_id'] == course_id]
            if not course.empty:
                return course.iloc[0].to_dict()
        
        return {
            "course_id": course_id,
            "title": "Unknown Course",
            "description": "Course details not available"
        }

def main():
    """Main function to handle command line arguments"""
    parser = argparse.ArgumentParser(description='Recommendation Service')
    parser.add_argument('--action', required=True, help='Action to perform')
    parser.add_argument('--data', help='JSON data for the action')
    parser.add_argument('--initialize', action='store_true', help='Initialize the service')
    
    args = parser.parse_args()
    
    # Create service instance
    service = RecommendationService()
    
    try:
        if args.initialize:
            result = service.initialize()
        else:
            # Parse data
            data = {}
            if args.data:
                data = json.loads(args.data)
            
            # Route to appropriate method
            if args.action == 'get_recommendations':
                result = service.get_recommendations(**data)
            elif args.action == 'get_similar_courses':
                result = service.get_similar_courses(**data)
            elif args.action == 'update_user_profile':
                result = service.update_user_profile(**data)
            elif args.action == 'get_explanation':
                result = service.get_explanation(**data)
            elif args.action == 'get_popular_courses':
                result = service.get_popular_courses(**data)
            elif args.action == 'get_trending_courses':
                result = service.get_trending_courses(**data)
            elif args.action == 'train_models':
                result = service.train_models(**data)
            elif args.action == 'evaluate_models':
                result = service.evaluate_models(**data)
            elif args.action == 'get_statistics':
                result = service.get_statistics(**data)
            elif args.action == 'health_check':
                result = service.health_check()
            else:
                result = {"error": f"Unknown action: {args.action}"}
        
        # Output result as JSON
        print(json.dumps(result, default=str))
        
    except Exception as e:
        error_result = {"error": str(e)}
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
