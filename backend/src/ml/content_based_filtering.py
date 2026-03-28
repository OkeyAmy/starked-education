"""
Content-Based Recommendation Engine
Implements content-based filtering using course features, user profiles, and semantic similarity
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional, Any
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity, linear_kernel
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.decomposition import TruncatedSVD, PCA
from sklearn.cluster import KMeans
import pickle
import logging
from datetime import datetime
import redis
import json
import re
from collections import Counter

# NLP libraries
import spacy
from transformers import AutoTokenizer, AutoModel
import torch
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

class ContentBasedRecommendationEngine:
    """
    Advanced content-based recommendation engine with multiple feature types
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {
            'max_features': 5000,
            'min_df': 2,
            'max_df': 0.8,
            'n_components': 100,
            'similarity_threshold': 0.1,
            'redis_host': 'localhost',
            'redis_port': 6379,
            'cache_ttl': 3600,
            'use_transformers': True,
            'transformer_model': 'sentence-transformers/all-MiniLM-L6-v2'
        }
        
        self.vectorizers = {}
        self.feature_matrices = {}
        self.similarity_matrices = {}
        self.course_features = None
        self.user_profiles = {}
        self.course_mapping = {}
        self.reverse_course_mapping = {}
        
        # Initialize NLP models
        self.nlp = None
        self.sentence_transformer = None
        self.tokenizer = None
        self.transformer_model = None
        
        # Initialize Redis for caching
        try:
            self.redis_client = redis.Redis(
                host=self.config['redis_host'],
                port=self.config['redis_port'],
                decode_responses=True
            )
            self.redis_client.ping()
            logger.info("Redis connection established for content-based filtering")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
            self.redis_client = None
        
        # Initialize NLP models
        self._initialize_nlp_models()
    
    def _initialize_nlp_models(self):
        """Initialize NLP models for text processing"""
        try:
            # Load spaCy model
            self.nlp = spacy.load("en_core_web_sm")
            logger.info("SpaCy model loaded successfully")
        except OSError:
            logger.warning("SpaCy model not found, using basic text processing")
            self.nlp = None
        
        try:
            # Load sentence transformer model
            if self.config['use_transformers']:
                self.sentence_transformer = SentenceTransformer(
                    self.config['transformer_model']
                )
                logger.info(f"Sentence transformer loaded: {self.config['transformer_model']}")
        except Exception as e:
            logger.warning(f"Failed to load sentence transformer: {e}")
            self.sentence_transformer = None
    
    def preprocess_text(self, text: str) -> str:
        """
        Preprocess text for feature extraction
        
        Args:
            text: Raw text string
            
        Returns:
            Preprocessed text
        """
        if not isinstance(text, str):
            text = str(text)
        
        # Basic cleaning
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Advanced processing with spaCy if available
        if self.nlp:
            doc = self.nlp(text)
            # Remove stop words and lemmatize
            tokens = [token.lemma_ for token in doc if not token.is_stop and not token.is_punct]
            text = ' '.join(tokens)
        
        return text
    
    def extract_text_features(self, courses_df: pd.DataFrame) -> np.ndarray:
        """
        Extract text-based features from course content
        
        Args:
            courses_df: DataFrame with course information
            
        Returns:
            Feature matrix
        """
        logger.info("Extracting text features")
        
        # Combine text fields
        text_columns = ['title', 'description', 'content', 'tags', 'category', 'instructor']
        available_columns = [col for col in text_columns if col in courses_df.columns]
        
        courses_df['combined_text'] = courses_df[available_columns].fillna('').apply(
            lambda row: ' '.join(row.values.astype(str)), axis=1
        )
        
        # Preprocess text
        courses_df['processed_text'] = courses_df['combined_text'].apply(self.preprocess_text)
        
        # TF-IDF Vectorization
        tfidf_vectorizer = TfidfVectorizer(
            max_features=self.config['max_features'],
            min_df=self.config['min_df'],
            max_df=self.config['max_df'],
            ngram_range=(1, 2),
            stop_words='english'
        )
        
        tfidf_matrix = tfidf_vectorizer.fit_transform(courses_df['processed_text'])
        
        # Store vectorizer
        self.vectorizers['tfidf'] = tfidf_vectorizer
        
        # Apply dimensionality reduction if needed
        if tfidf_matrix.shape[1] > self.config['n_components']:
            svd = TruncatedSVD(n_components=self.config['n_components'], random_state=42)
            tfidf_reduced = svd.fit_transform(tfidf_matrix)
            self.vectorizers['svd'] = svd
            return tfidf_reduced
        
        return tfidf_matrix.toarray()
    
    def extract_semantic_features(self, courses_df: pd.DataFrame) -> np.ndarray:
        """
        Extract semantic features using transformer models
        
        Args:
            courses_df: DataFrame with course information
            
        Returns:
            Semantic feature matrix
        """
        if not self.sentence_transformer:
            logger.warning("Sentence transformer not available, skipping semantic features")
            return np.zeros((len(courses_df), 384))  # Default embedding size
        
        logger.info("Extracting semantic features")
        
        # Combine text fields
        text_columns = ['title', 'description', 'content']
        available_columns = [col for col in text_columns if col in courses_df.columns]
        
        courses_df['semantic_text'] = courses_df[available_columns].fillna('').apply(
            lambda row: ' '.join(row.values.astype(str)), axis=1
        )
        
        # Generate embeddings
        embeddings = self.sentence_transformer.encode(
            courses_df['semantic_text'].tolist(),
            batch_size=32,
            show_progress_bar=True,
            convert_to_numpy=True
        )
        
        return embeddings
    
    def extract_numerical_features(self, courses_df: pd.DataFrame) -> np.ndarray:
        """
        Extract numerical features from course metadata
        
        Args:
            courses_df: DataFrame with course information
            
        Returns:
            Numerical feature matrix
        """
        logger.info("Extracting numerical features")
        
        numerical_columns = [
            'duration', 'difficulty_level', 'price', 'rating', 'num_reviews',
            'num_students', 'completion_rate', 'instructor_rating'
        ]
        
        available_numerical = [col for col in numerical_columns if col in courses_df.columns]
        
        if not available_numerical:
            logger.warning("No numerical columns found")
            return np.zeros((len(courses_df), 1))
        
        numerical_features = courses_df[available_numerical].fillna(0)
        
        # Handle categorical numerical features
        if 'difficulty_level' in numerical_features.columns:
            difficulty_mapping = {'beginner': 1, 'intermediate': 2, 'advanced': 3, 'expert': 4}
            numerical_features['difficulty_level'] = numerical_features['difficulty_level'].map(
                difficulty_mapping
            ).fillna(2)
        
        # Scale features
        scaler = StandardScaler()
        scaled_features = scaler.fit_transform(numerical_features)
        
        # Store scaler
        self.vectorizers['numerical_scaler'] = scaler
        
        return scaled_features
    
    def extract_categorical_features(self, courses_df: pd.DataFrame) -> np.ndarray:
        """
        Extract categorical features using one-hot encoding
        
        Args:
            courses_df: DataFrame with course information
            
        Returns:
            Categorical feature matrix
        """
        logger.info("Extracting categorical features")
        
        categorical_columns = ['category', 'subcategory', 'level', 'language', 'format']
        available_categorical = [col for col in categorical_columns if col in courses_df.columns]
        
        if not available_categorical:
            logger.warning("No categorical columns found")
            return np.zeros((len(courses_df), 1))
        
        # Fill missing values and convert to string
        categorical_features = courses_df[available_categorical].fillna('unknown').astype(str)
        
        # One-hot encode
        from sklearn.preprocessing import OneHotEncoder
        encoder = OneHotEncoder(sparse=False, handle_unknown='ignore')
        encoded_features = encoder.fit_transform(categorical_features)
        
        # Store encoder
        self.vectorizers['categorical_encoder'] = encoder
        
        return encoded_features
    
    def build_course_features(self, courses_df: pd.DataFrame) -> None:
        """
        Build comprehensive feature matrix for all courses
        
        Args:
            courses_df: DataFrame with course information
        """
        logger.info("Building comprehensive course features")
        
        # Create course mapping
        self.course_mapping = {course_id: idx for idx, course_id in enumerate(courses_df['course_id'])}
        self.reverse_course_mapping = {idx: course_id for course_id, idx in self.course_mapping.items()}
        
        # Extract different types of features
        text_features = self.extract_text_features(courses_df)
        semantic_features = self.extract_semantic_features(courses_df)
        numerical_features = self.extract_numerical_features(courses_df)
        categorical_features = self.extract_categorical_features(courses_df)
        
        # Combine all features
        all_features = np.hstack([
            text_features,
            semantic_features,
            numerical_features,
            categorical_features
        ])
        
        # Store course features and original data
        self.feature_matrices['combined'] = all_features
        self.course_features = courses_df.reset_index(drop=True)
        
        # Calculate similarity matrices
        self._calculate_similarity_matrices()
        
        logger.info(f"Built feature matrix with shape: {all_features.shape}")
    
    def _calculate_similarity_matrices(self):
        """Calculate similarity matrices for different feature types"""
        logger.info("Calculating similarity matrices")
        
        # Combined similarity
        combined_features = self.feature_matrices['combined']
        self.similarity_matrices['combined'] = cosine_similarity(combined_features)
        
        # Text similarity
        if 'tfidf' in self.vectorizers:
            text_features = self.vectorizers['tfidf'].transform(
                self.course_features['processed_text']
            )
            self.similarity_matrices['text'] = cosine_similarity(text_features)
        
        # Semantic similarity
        semantic_features = self.extract_semantic_features(self.course_features)
        self.similarity_matrices['semantic'] = cosine_similarity(semantic_features)
    
    def build_user_profile(self, user_id: str, user_interactions: pd.DataFrame) -> Dict[str, Any]:
        """
        Build user profile based on interaction history
        
        Args:
            user_id: User identifier
            user_interactions: DataFrame with user's course interactions
            
        Returns:
            User profile dictionary
        """
        logger.info(f"Building profile for user {user_id}")
        
        # Filter user interactions
        user_data = user_interactions[user_interactions['user_id'] == user_id]
        
        if user_data.empty:
            return self._create_cold_start_profile(user_id)
        
        # Calculate weighted preferences
        profile = {
            'user_id': user_id,
            'preferred_categories': {},
            'preferred_difficulty': {},
            'preferred_instructors': {},
            'interaction_weights': {},
            'feature_vector': None,
            'built_at': datetime.now().isoformat()
        }
        
        # Category preferences
        if 'category' in user_data.columns:
            category_counts = user_data['category'].value_counts()
            total_interactions = len(user_data)
            profile['preferred_categories'] = {
                cat: count / total_interactions 
                for cat, count in category_counts.items()
            }
        
        # Difficulty preferences
        if 'difficulty_level' in user_data.columns:
            difficulty_counts = user_data['difficulty_level'].value_counts()
            profile['preferred_difficulty'] = {
                diff: count / total_interactions 
                for diff, count in difficulty_counts.items()
            }
        
        # Instructor preferences
        if 'instructor' in user_data.columns:
            instructor_counts = user_data['instructor'].value_counts()
            profile['preferred_instructors'] = {
                inst: count / total_interactions 
                for inst, count in instructor_counts.head(10).items()
            }
        
        # Interaction weights (based on rating, completion, etc.)
        if 'rating' in user_data.columns:
            profile['interaction_weights'] = dict(zip(
                user_data['course_id'],
                user_data['rating'] / user_data['rating'].max()
            ))
        
        # Build feature vector
        profile['feature_vector'] = self._build_user_feature_vector(user_data)
        
        # Store profile
        self.user_profiles[user_id] = profile
        
        return profile
    
    def _create_cold_start_profile(self, user_id: str) -> Dict[str, Any]:
        """Create a profile for new users with no interaction history"""
        return {
            'user_id': user_id,
            'preferred_categories': {},
            'preferred_difficulty': {'beginner': 0.5, 'intermediate': 0.3, 'advanced': 0.2},
            'preferred_instructors': {},
            'interaction_weights': {},
            'feature_vector': np.zeros(self.feature_matrices['combined'].shape[1]),
            'built_at': datetime.now().isoformat(),
            'is_cold_start': True
        }
    
    def _build_user_feature_vector(self, user_data: pd.DataFrame) -> np.ndarray:
        """Build user feature vector from interaction history"""
        user_vector = np.zeros(self.feature_matrices['combined'].shape[1])
        
        for _, interaction in user_data.iterrows():
            course_id = interaction['course_id']
            if course_id in self.course_mapping:
                course_idx = self.course_mapping[course_id]
                weight = interaction.get('rating', 1.0) / 5.0  # Normalize rating
                user_vector += weight * self.feature_matrices['combined'][course_idx]
        
        # Normalize
        if np.linalg.norm(user_vector) > 0:
            user_vector = user_vector / np.linalg.norm(user_vector)
        
        return user_vector
    
    def get_content_based_recommendations(self, user_id: str, n_recommendations: int = 10,
                                       feature_weights: Dict[str, float] = None) -> List[Dict[str, Any]]:
        """
        Get content-based recommendations for a user
        
        Args:
            user_id: User identifier
            n_recommendations: Number of recommendations to return
            feature_weights: Weights for different feature types
            
        Returns:
            List of recommended courses with scores
        """
        if feature_weights is None:
            feature_weights = {
                'combined': 0.4,
                'text': 0.3,
                'semantic': 0.2,
                'numerical': 0.1
            }
        
        cache_key = f"content_rec_{user_id}_{n_recommendations}"
        
        # Check cache
        if self.redis_client:
            cached_result = self.redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        
        # Get user profile
        if user_id not in self.user_profiles:
            logger.warning(f"No profile found for user {user_id}")
            return []
        
        user_profile = self.user_profiles[user_id]
        user_vector = user_profile['feature_vector']
        
        # Calculate similarities
        similarities = {}
        
        # Combined similarity
        if 'combined' in self.similarity_matrices:
            combined_sim = cosine_similarity(
                user_vector.reshape(1, -1),
                self.feature_matrices['combined']
            )[0]
            similarities['combined'] = combined_sim
        
        # Content-based filtering using similar courses
        recommendations = {}
        
        # Get user's highly rated courses
        user_interactions = user_profile.get('interaction_weights', {})
        highly_rated_courses = [
            course_id for course_id, weight in user_interactions.items() 
            if weight >= 0.7  # Rating >= 3.5/5
        ]
        
        # Find similar courses to highly rated ones
        for course_id in highly_rated_courses:
            if course_id in self.course_mapping:
                course_idx = self.course_mapping[course_id]
                
                # Get similar courses
                if 'combined' in self.similarity_matrices:
                    course_similarities = self.similarity_matrices['combined'][course_idx]
                    
                    for similar_idx, similarity_score in enumerate(course_similarities):
                        if similarity_score > self.config['similarity_threshold']:
                            similar_course_id = self.reverse_course_mapping[similar_idx]
                            
                            # Skip if user already interacted with this course
                            if similar_course_id not in user_interactions:
                                if similar_course_id not in recommendations:
                                    recommendations[similar_course_id] = {
                                        'course_id': similar_course_id,
                                        'score': 0,
                                        'explanations': []
                                    }
                                
                                recommendations[similar_course_id]['score'] += similarity_score
                                recommendations[similar_course_id]['explanations'].append(
                                    f"Similar to {course_id} (similarity: {similarity_score:.3f})"
                                )
        
        # Add profile-based recommendations
        if 'combined' in similarities:
            for idx, similarity_score in enumerate(similarities['combined']):
                course_id = self.reverse_course_mapping[idx]
                
                # Skip if user already interacted with this course
                if course_id not in user_interactions:
                    if course_id not in recommendations:
                        recommendations[course_id] = {
                            'course_id': course_id,
                            'score': 0,
                            'explanations': []
                        }
                    
                    recommendations[course_id]['score'] += similarity_score * 0.5
                    recommendations[course_id]['explanations'].append(
                        f"Matches your learning profile (similarity: {similarity_score:.3f})"
                    )
        
        # Sort recommendations
        sorted_recommendations = sorted(
            recommendations.items(), 
            key=lambda x: x[1]['score'], 
            reverse=True
        )
        
        # Format results
        result = []
        for course_id, rec_data in sorted_recommendations[:n_recommendations]:
            # Get course details
            course_idx = self.course_mapping[course_id]
            course_details = self.course_features.iloc[course_idx].to_dict()
            
            result.append({
                'course_id': course_id,
                'score': float(rec_data['score']),
                'algorithm': 'content_based',
                'explanation': '; '.join(rec_data['explanations']),
                'course_details': course_details
            })
        
        # Cache result
        if self.redis_client:
            self.redis_client.setex(
                cache_key, 
                self.config['cache_ttl'], 
                json.dumps(result)
            )
        
        return result
    
    def get_similar_courses(self, course_id: str, n_similar: int = 10) -> List[Dict[str, Any]]:
        """
        Get courses similar to a given course
        
        Args:
            course_id: Course identifier
            n_similar: Number of similar courses to return
            
        Returns:
            List of similar courses with similarity scores
        """
        if course_id not in self.course_mapping:
            return []
        
        cache_key = f"similar_courses_{course_id}_{n_similar}"
        
        # Check cache
        if self.redis_client:
            cached_result = self.redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        
        course_idx = self.course_mapping[course_id]
        
        # Get similarities
        similarities = self.similarity_matrices['combined'][course_idx]
        
        # Get top similar courses (excluding the course itself)
        similar_indices = np.argsort(similarities)[::-1][1:n_similar+1]
        
        result = []
        for similar_idx in similar_indices:
            similar_course_id = self.reverse_course_mapping[similar_idx]
            similarity_score = similarities[similar_idx]
            
            # Get course details
            course_details = self.course_features.iloc[similar_idx].to_dict()
            
            result.append({
                'course_id': similar_course_id,
                'similarity_score': float(similarity_score),
                'algorithm': 'content_similarity',
                'course_details': course_details
            })
        
        # Cache result
        if self.redis_client:
            self.redis_client.setex(
                cache_key, 
                self.config['cache_ttl'], 
                json.dumps(result)
            )
        
        return result
    
    def update_user_profile(self, user_id: str, new_interactions: pd.DataFrame) -> None:
        """
        Update user profile with new interactions
        
        Args:
            user_id: User identifier
            new_interactions: New interaction data
        """
        if user_id in self.user_profiles:
            # Update existing profile
            existing_profile = self.user_profiles[user_id]
            
            # Rebuild profile with all interactions
            # In practice, you'd want to merge with existing data
            logger.info(f"Updating profile for user {user_id}")
        
        # Rebuild profile (simplified approach)
        self.build_user_profile(user_id, new_interactions)
    
    def get_course_explanation(self, user_id: str, course_id: str) -> Dict[str, Any]:
        """
        Generate explanation for why a course is recommended to a user
        
        Args:
            user_id: User identifier
            course_id: Course identifier
            
        Returns:
            Explanation dictionary
        """
        if user_id not in self.user_profiles:
            return {'error': 'User profile not found'}
        
        if course_id not in self.course_mapping:
            return {'error': 'Course not found'}
        
        user_profile = self.user_profiles[user_id]
        course_idx = self.course_mapping[course_id]
        course_details = self.course_features.iloc[course_idx].to_dict()
        
        explanations = []
        
        # Category-based explanation
        if 'preferred_categories' in user_profile:
            course_category = course_details.get('category')
            if course_category in user_profile['preferred_categories']:
                preference_score = user_profile['preferred_categories'][course_category]
                explanations.append(
                    f"You've shown interest in {course_category} courses "
                    f"(preference: {preference_score:.2f})"
                )
        
        # Difficulty-based explanation
        if 'preferred_difficulty' in user_profile:
            course_difficulty = course_details.get('difficulty_level')
            if course_difficulty in user_profile['preferred_difficulty']:
                preference_score = user_profile['preferred_difficulty'][course_difficulty]
                explanations.append(
                    f"This matches your preferred difficulty level: {course_difficulty} "
                    f"(preference: {preference_score:.2f})"
                )
        
        # Instructor-based explanation
        if 'preferred_instructors' in user_profile:
            course_instructor = course_details.get('instructor')
            if course_instructor in user_profile['preferred_instructors']:
                preference_score = user_profile['preferred_instructors'][course_instructor]
                explanations.append(
                    f"You've liked courses by {course_instructor} before "
                    f"(preference: {preference_score:.2f})"
                )
        
        # Content similarity explanation
        user_vector = user_profile['feature_vector']
        course_vector = self.feature_matrices['combined'][course_idx]
        content_similarity = cosine_similarity(
            user_vector.reshape(1, -1),
            course_vector.reshape(1, -1)
        )[0][0]
        
        if content_similarity > 0.3:
            explanations.append(
                f"Course content matches your learning interests "
                f"(similarity: {content_similarity:.3f})"
            )
        
        return {
            'user_id': user_id,
            'course_id': course_id,
            'explanations': explanations,
            'course_details': course_details,
            'overall_score': float(content_similarity),
            'generated_at': datetime.now().isoformat()
        }
    
    def save_models(self, filepath: str) -> None:
        """
        Save trained models and data to disk
        
        Args:
            filepath: Path to save models
        """
        model_data = {
            'vectorizers': self.vectorizers,
            'feature_matrices': self.feature_matrices,
            'similarity_matrices': self.similarity_matrices,
            'course_features': self.course_features,
            'user_profiles': self.user_profiles,
            'course_mapping': self.course_mapping,
            'reverse_course_mapping': self.reverse_course_mapping,
            'config': self.config
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.info(f"Content-based models saved to {filepath}")
    
    def load_models(self, filepath: str) -> None:
        """
        Load trained models and data from disk
        
        Args:
            filepath: Path to load models from
        """
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.vectorizers = model_data['vectorizers']
        self.feature_matrices = model_data['feature_matrices']
        self.similarity_matrices = model_data['similarity_matrices']
        self.course_features = model_data['course_features']
        self.user_profiles = model_data['user_profiles']
        self.course_mapping = model_data['course_mapping']
        self.reverse_course_mapping = model_data['reverse_course_mapping']
        self.config = model_data['config']
        
        logger.info(f"Content-based models loaded from {filepath}")
    
    def evaluate_recommendations(self, test_interactions: pd.DataFrame) -> Dict[str, float]:
        """
        Evaluate recommendation quality
        
        Args:
            test_interactions: Test interaction data
            
        Returns:
            Evaluation metrics
        """
        metrics = {
            'precision_at_k': [],
            'recall_at_k': [],
            'ndcg_at_k': []
        }
        
        k = 10
        
        for user_id in test_interactions['user_id'].unique():
            user_test_data = test_interactions[test_interactions['user_id'] == user_id]
            actual_courses = set(user_test_data['course_id'])
            
            # Get recommendations
            recommendations = self.get_content_based_recommendations(user_id, k)
            recommended_courses = set([rec['course_id'] for rec in recommendations])
            
            # Calculate precision@k
            if recommended_courses:
                precision = len(actual_courses & recommended_courses) / len(recommended_courses)
                metrics['precision_at_k'].append(precision)
            
            # Calculate recall@k
            if actual_courses:
                recall = len(actual_courses & recommended_courses) / len(actual_courses)
                metrics['recall_at_k'].append(recall)
            
            # Calculate NDCG@k (simplified)
            dcg = 0
            idcg = 0
            
            for i, rec in enumerate(recommendations):
                if rec['course_id'] in actual_courses:
                    dcg += 1 / np.log2(i + 2)
            
            for i in range(min(len(actual_courses), k)):
                idcg += 1 / np.log2(i + 2)
            
            if idcg > 0:
                ndcg = dcg / idcg
                metrics['ndcg_at_k'].append(ndcg)
        
        # Calculate averages
        for metric in metrics:
            if metrics[metric]:
                metrics[metric] = np.mean(metrics[metric])
            else:
                metrics[metric] = 0.0
        
        return metrics
