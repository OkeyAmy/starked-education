"""
Collaborative Filtering Recommendation Engine
Implements user-based and item-based collaborative filtering algorithms
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional, Any
from scipy.sparse import csr_matrix
from scipy.spatial.distance import cosine
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
from sklearn.neighbors import NearestNeighbors
import pickle
import logging
from datetime import datetime, timedelta
import redis
import json

# Recommendation libraries
from surprise import Dataset, Reader, KNNBasic, KNNWithMeans, SVD, NMF
from surprise.model_selection import train_test_split, cross_val_score
from surprise.accuracy import rmse, mae
import implicit
from lightfm import LightFM
from lightfm.data import Dataset as LightFMDataset

logger = logging.getLogger(__name__)

class CollaborativeFilteringEngine:
    """
    Advanced collaborative filtering engine with multiple algorithms
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {
            'user_based_k': 20,
            'item_based_k': 20,
            'svd_components': 50,
            'implicit_factors': 100,
            'lightfm_components': 100,
            'lightfm_loss': 'warp',
            'redis_host': 'localhost',
            'redis_port': 6379,
            'cache_ttl': 3600
        }
        
        self.models = {}
        self.user_item_matrix = None
        self.user_similarity_matrix = None
        self.item_similarity_matrix = None
        self.user_mapping = {}
        self.item_mapping = {}
        self.reverse_user_mapping = {}
        self.reverse_item_mapping = {}
        
        # Initialize Redis for caching
        try:
            self.redis_client = redis.Redis(
                host=self.config['redis_host'],
                port=self.config['redis_port'],
                decode_responses=True
            )
            self.redis_client.ping()
            logger.info("Redis connection established for collaborative filtering")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
            self.redis_client = None
    
    def prepare_data(self, interactions_df: pd.DataFrame) -> None:
        """
        Prepare interaction data for collaborative filtering
        
        Args:
            interactions_df: DataFrame with columns [user_id, item_id, rating, timestamp]
        """
        logger.info("Preparing collaborative filtering data")
        
        # Create user and item mappings
        unique_users = interactions_df['user_id'].unique()
        unique_items = interactions_df['item_id'].unique()
        
        self.user_mapping = {user: idx for idx, user in enumerate(unique_users)}
        self.item_mapping = {item: idx for idx, item in enumerate(unique_items)}
        self.reverse_user_mapping = {idx: user for user, idx in self.user_mapping.items()}
        self.reverse_item_mapping = {idx: item for item, idx in self.item_mapping.items()}
        
        # Map IDs to indices
        interactions_df['user_idx'] = interactions_df['user_id'].map(self.user_mapping)
        interactions_df['item_idx'] = interactions_df['item_id'].map(self.item_mapping)
        
        # Create user-item interaction matrix
        n_users = len(unique_users)
        n_items = len(unique_items)
        
        self.user_item_matrix = np.zeros((n_users, n_items))
        
        for _, row in interactions_df.iterrows():
            self.user_item_matrix[row['user_idx'], row['item_idx']] = row['rating']
        
        logger.info(f"Created user-item matrix: {n_users} users, {n_items} items")
    
    def train_user_based_cf(self, interactions_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Train user-based collaborative filtering model
        
        Args:
            interactions_df: DataFrame with user-item interactions
            
        Returns:
            Training metrics and model info
        """
        logger.info("Training user-based collaborative filtering")
        
        # Prepare data for Surprise library
        reader = Reader(rating_scale=(1, 5))
        data = Dataset.load_from_df(
            interactions_df[['user_id', 'item_id', 'rating']], 
            reader
        )
        
        # Split data
        trainset, testset = train_test_split(data, test_size=0.2, random_state=42)
        
        # Train KNN model
        sim_options = {
            'name': 'cosine',
            'user_based': True,
            'min_support': 5
        }
        
        model = KNNWithMeans(
            k=self.config['user_based_k'],
            sim_options=sim_options,
            verbose=False
        )
        
        model.fit(trainset)
        
        # Evaluate
        predictions = model.test(testset)
        rmse_score = rmse(predictions)
        mae_score = mae(predictions)
        
        # Store model
        self.models['user_based'] = model
        
        # Calculate user similarity matrix
        self.user_similarity_matrix = model.sim
        
        metrics = {
            'model_type': 'user_based_cf',
            'rmse': rmse_score,
            'mae': mae_score,
            'k': self.config['user_based_k'],
            'training_time': datetime.now().isoformat()
        }
        
        logger.info(f"User-based CF trained - RMSE: {rmse_score:.4f}, MAE: {mae_score:.4f}")
        return metrics
    
    def train_item_based_cf(self, interactions_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Train item-based collaborative filtering model
        
        Args:
            interactions_df: DataFrame with user-item interactions
            
        Returns:
            Training metrics and model info
        """
        logger.info("Training item-based collaborative filtering")
        
        # Prepare data for Surprise library
        reader = Reader(rating_scale=(1, 5))
        data = Dataset.load_from_df(
            interactions_df[['user_id', 'item_id', 'rating']], 
            reader
        )
        
        # Split data
        trainset, testset = train_test_split(data, test_size=0.2, random_state=42)
        
        # Train KNN model
        sim_options = {
            'name': 'cosine',
            'user_based': False,
            'min_support': 5
        }
        
        model = KNNWithMeans(
            k=self.config['item_based_k'],
            sim_options=sim_options,
            verbose=False
        )
        
        model.fit(trainset)
        
        # Evaluate
        predictions = model.test(testset)
        rmse_score = rmse(predictions)
        mae_score = mae(predictions)
        
        # Store model
        self.models['item_based'] = model
        
        # Calculate item similarity matrix
        self.item_similarity_matrix = model.sim
        
        metrics = {
            'model_type': 'item_based_cf',
            'rmse': rmse_score,
            'mae': mae_score,
            'k': self.config['item_based_k'],
            'training_time': datetime.now().isoformat()
        }
        
        logger.info(f"Item-based CF trained - RMSE: {rmse_score:.4f}, MAE: {mae_score:.4f}")
        return metrics
    
    def train_matrix_factorization(self, interactions_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Train matrix factorization model (SVD)
        
        Args:
            interactions_df: DataFrame with user-item interactions
            
        Returns:
            Training metrics and model info
        """
        logger.info("Training matrix factorization (SVD)")
        
        # Prepare data for Surprise library
        reader = Reader(rating_scale=(1, 5))
        data = Dataset.load_from_df(
            interactions_df[['user_id', 'item_id', 'rating']], 
            reader
        )
        
        # Split data
        trainset, testset = train_test_split(data, test_size=0.2, random_state=42)
        
        # Train SVD model
        model = SVD(
            n_factors=self.config['svd_components'],
            n_epochs=20,
            lr_all=0.005,
            reg_all=0.02,
            random_state=42
        )
        
        model.fit(trainset)
        
        # Evaluate
        predictions = model.test(testset)
        rmse_score = rmse(predictions)
        mae_score = mae(predictions)
        
        # Store model
        self.models['matrix_factorization'] = model
        
        metrics = {
            'model_type': 'matrix_factorization',
            'rmse': rmse_score,
            'mae': mae_score,
            'n_factors': self.config['svd_components'],
            'training_time': datetime.now().isoformat()
        }
        
        logger.info(f"SVD trained - RMSE: {rmse_score:.4f}, MAE: {mae_score:.4f}")
        return metrics
    
    def train_implicit_cf(self, interactions_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Train implicit collaborative filtering model
        
        Args:
            interactions_df: DataFrame with user-item interactions
            
        Returns:
            Training metrics and model info
        """
        logger.info("Training implicit collaborative filtering")
        
        # Create implicit feedback matrix
        # Convert ratings to implicit feedback (e.g., rating >= 4)
        implicit_interactions = interactions_df[interactions_df['rating'] >= 4]
        
        # Create user-item matrix for implicit library
        user_item_matrix = csr_matrix((
            np.ones(len(implicit_interactions)),
            (
                implicit_interactions['user_id'].map(self.user_mapping),
                implicit_interactions['item_id'].map(self.item_mapping)
            )
        ))
        
        # Train implicit ALS model
        model = implicit.als.AlternatingLeastSquares(
            factors=self.config['implicit_factors'],
            regularization=0.01,
            iterations=15,
            random_state=42
        )
        
        model.fit(user_item_matrix)
        
        # Store model
        self.models['implicit'] = model
        
        metrics = {
            'model_type': 'implicit_cf',
            'factors': self.config['implicit_factors'],
            'n_interactions': len(implicit_interactions),
            'training_time': datetime.now().isoformat()
        }
        
        logger.info(f"Implicit CF trained with {len(implicit_interactions)} interactions")
        return metrics
    
    def train_lightfm(self, interactions_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Train LightFM model (hybrid collaborative filtering)
        
        Args:
            interactions_df: DataFrame with user-item interactions
            
        Returns:
            Training metrics and model info
        """
        logger.info("Training LightFM model")
        
        # Prepare data for LightFM
        dataset = LightFMDataset()
        dataset.fit(
            users=interactions_df['user_id'].unique(),
            items=interactions_df['item_id'].unique()
        )
        
        # Build interactions
        (interactions, weights) = dataset.build_interactions(
            zip(interactions_df['user_id'], interactions_df['item_id'], interactions_df['rating'])
        )
        
        # Train LightFM model
        model = LightFM(
            no_components=self.config['lightfm_components'],
            loss=self.config['lightfm_loss'],
            learning_rate=0.05,
            random_state=42
        )
        
        model.fit(
            interactions,
            epochs=20,
            num_threads=4
        )
        
        # Store model
        self.models['lightfm'] = model
        
        # Calculate precision@k
        from lightfm.evaluation import precision_at_k
        precision = precision_at_k(model, interactions, k=10).mean()
        
        metrics = {
            'model_type': 'lightfm',
            'components': self.config['lightfm_components'],
            'loss': self.config['lightfm_loss'],
            'precision_at_10': precision,
            'training_time': datetime.now().isoformat()
        }
        
        logger.info(f"LightFM trained - Precision@10: {precision:.4f}")
        return metrics
    
    def get_user_based_recommendations(self, user_id: str, n_recommendations: int = 10) -> List[Dict[str, Any]]:
        """
        Get recommendations using user-based collaborative filtering
        
        Args:
            user_id: User identifier
            n_recommendations: Number of recommendations to return
            
        Returns:
            List of recommended items with scores
        """
        if 'user_based' not in self.models:
            raise ValueError("User-based model not trained")
        
        cache_key = f"user_based_rec_{user_id}_{n_recommendations}"
        
        # Check cache
        if self.redis_client:
            cached_result = self.redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        
        model = self.models['user_based']
        
        # Get items the user hasn't rated
        user_idx = self.user_mapping.get(user_id)
        if user_idx is None:
            return []
        
        # Get similar users
        user_similarities = self.user_similarity_matrix[user_idx]
        similar_users = np.argsort(user_similarities)[::-1][1:21]  # Top 20 similar users
        
        # Calculate recommendations
        recommendations = {}
        user_ratings = self.user_item_matrix[user_idx]
        
        for similar_user in similar_users:
            similarity_score = user_similarities[similar_user]
            similar_user_ratings = self.user_item_matrix[similar_user]
            
            for item_idx, rating in enumerate(similar_user_ratings):
                if rating > 0 and user_ratings[item_idx] == 0:  # User hasn't rated this item
                    if item_idx not in recommendations:
                        recommendations[item_idx] = 0
                    recommendations[item_idx] += similarity_score * rating
        
        # Sort and get top recommendations
        sorted_recommendations = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
        top_recommendations = sorted_recommendations[:n_recommendations]
        
        # Format results
        result = []
        for item_idx, score in top_recommendations:
            item_id = self.reverse_item_mapping[item_idx]
            result.append({
                'item_id': item_id,
                'score': float(score),
                'algorithm': 'user_based_cf',
                'explanation': f"Recommended because similar users liked this item"
            })
        
        # Cache result
        if self.redis_client:
            self.redis_client.setex(
                cache_key, 
                self.config['cache_ttl'], 
                json.dumps(result)
            )
        
        return result
    
    def get_item_based_recommendations(self, user_id: str, n_recommendations: int = 10) -> List[Dict[str, Any]]:
        """
        Get recommendations using item-based collaborative filtering
        
        Args:
            user_id: User identifier
            n_recommendations: Number of recommendations to return
            
        Returns:
            List of recommended items with scores
        """
        if 'item_based' not in self.models:
            raise ValueError("Item-based model not trained")
        
        cache_key = f"item_based_rec_{user_id}_{n_recommendations}"
        
        # Check cache
        if self.redis_client:
            cached_result = self.redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        
        user_idx = self.user_mapping.get(user_id)
        if user_idx is None:
            return []
        
        user_ratings = self.user_item_matrix[user_idx]
        recommendations = {}
        
        # For each item the user has rated positively
        for item_idx, rating in enumerate(user_ratings):
            if rating > 0:
                # Get similar items
                item_similarities = self.item_similarity_matrix[item_idx]
                similar_items = np.argsort(item_similarities)[::-1][1:21]  # Top 20 similar items
                
                for similar_item in similar_items:
                    if user_ratings[similar_item] == 0:  # User hasn't rated this item
                        similarity_score = item_similarities[similar_item]
                        if similar_item not in recommendations:
                            recommendations[similar_item] = 0
                        recommendations[similar_item] += similarity_score * rating
        
        # Sort and get top recommendations
        sorted_recommendations = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
        top_recommendations = sorted_recommendations[:n_recommendations]
        
        # Format results
        result = []
        for item_idx, score in top_recommendations:
            item_id = self.reverse_item_mapping[item_idx]
            result.append({
                'item_id': item_id,
                'score': float(score),
                'algorithm': 'item_based_cf',
                'explanation': f"Recommended because it's similar to items you liked"
            })
        
        # Cache result
        if self.redis_client:
            self.redis_client.setex(
                cache_key, 
                self.config['cache_ttl'], 
                json.dumps(result)
            )
        
        return result
    
    def get_matrix_factorization_recommendations(self, user_id: str, n_recommendations: int = 10) -> List[Dict[str, Any]]:
        """
        Get recommendations using matrix factorization
        
        Args:
            user_id: User identifier
            n_recommendations: Number of recommendations to return
            
        Returns:
            List of recommended items with scores
        """
        if 'matrix_factorization' not in self.models:
            raise ValueError("Matrix factorization model not trained")
        
        cache_key = f"mf_rec_{user_id}_{n_recommendations}"
        
        # Check cache
        if self.redis_client:
            cached_result = self.redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        
        model = self.models['matrix_factorization']
        user_idx = self.user_mapping.get(user_id)
        
        if user_idx is None:
            return []
        
        user_ratings = self.user_item_matrix[user_idx]
        recommendations = []
        
        # Predict ratings for all items the user hasn't rated
        for item_idx in range(len(self.item_mapping)):
            if user_ratings[item_idx] == 0:  # User hasn't rated this item
                item_id = self.reverse_item_mapping[item_idx]
                try:
                    prediction = model.predict(user_id, item_id)
                    recommendations.append({
                        'item_id': item_id,
                        'score': prediction.est,
                        'algorithm': 'matrix_factorization',
                        'explanation': f"Predicted rating: {prediction.est:.2f} based on your preferences"
                    })
                except:
                    continue
        
        # Sort and get top recommendations
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        top_recommendations = recommendations[:n_recommendations]
        
        # Cache result
        if self.redis_client:
            self.redis_client.setex(
                cache_key, 
                self.config['cache_ttl'], 
                json.dumps(top_recommendations)
            )
        
        return top_recommendations
    
    def get_implicit_recommendations(self, user_id: str, n_recommendations: int = 10) -> List[Dict[str, Any]]:
        """
        Get recommendations using implicit collaborative filtering
        
        Args:
            user_id: User identifier
            n_recommendations: Number of recommendations to return
            
        Returns:
            List of recommended items with scores
        """
        if 'implicit' not in self.models:
            raise ValueError("Implicit model not trained")
        
        cache_key = f"implicit_rec_{user_id}_{n_recommendations}"
        
        # Check cache
        if self.redis_client:
            cached_result = self.redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        
        model = self.models['implicit']
        user_idx = self.user_mapping.get(user_id)
        
        if user_idx is None:
            return []
        
        # Get recommendations
        recommendations, scores = model.recommend(
            user_idx, 
            self.user_item_matrix[user_idx], 
            N=n_recommendations
        )
        
        # Format results
        result = []
        for item_idx, score in zip(recommendations, scores):
            item_id = self.reverse_item_mapping[item_idx]
            result.append({
                'item_id': item_id,
                'score': float(score),
                'algorithm': 'implicit_cf',
                'explanation': f"Recommended based on similar users' implicit preferences"
            })
        
        # Cache result
        if self.redis_client:
            self.redis_client.setex(
                cache_key, 
                self.config['cache_ttl'], 
                json.dumps(result)
            )
        
        return result
    
    def get_lightfm_recommendations(self, user_id: str, n_recommendations: int = 10) -> List[Dict[str, Any]]:
        """
        Get recommendations using LightFM
        
        Args:
            user_id: User identifier
            n_recommendations: Number of recommendations to return
            
        Returns:
            List of recommended items with scores
        """
        if 'lightfm' not in self.models:
            raise ValueError("LightFM model not trained")
        
        cache_key = f"lightfm_rec_{user_id}_{n_recommendations}"
        
        # Check cache
        if self.redis_client:
            cached_result = self.redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        
        model = self.models['lightfm']
        user_idx = self.user_mapping.get(user_id)
        
        if user_idx is None:
            return []
        
        # Get recommendations
        scores = model.predict(user_idx, np.arange(len(self.item_mapping)))
        
        # Get items the user hasn't interacted with
        user_ratings = self.user_item_matrix[user_idx]
        recommendations = []
        
        for item_idx, score in enumerate(scores):
            if user_ratings[item_idx] == 0:  # User hasn't rated this item
                item_id = self.reverse_item_mapping[item_idx]
                recommendations.append({
                    'item_id': item_id,
                    'score': float(score),
                    'algorithm': 'lightfm',
                    'explanation': f"Recommended using hybrid collaborative filtering approach"
                })
        
        # Sort and get top recommendations
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        top_recommendations = recommendations[:n_recommendations]
        
        # Cache result
        if self.redis_client:
            self.redis_client.setex(
                cache_key, 
                self.config['cache_ttl'], 
                json.dumps(top_recommendations)
            )
        
        return top_recommendations
    
    def get_hybrid_recommendations(self, user_id: str, n_recommendations: int = 10, 
                                 weights: Dict[str, float] = None) -> List[Dict[str, Any]]:
        """
        Get hybrid recommendations combining multiple algorithms
        
        Args:
            user_id: User identifier
            n_recommendations: Number of recommendations to return
            weights: Weights for different algorithms
            
        Returns:
            List of recommended items with combined scores
        """
        if weights is None:
            weights = {
                'user_based': 0.2,
                'item_based': 0.2,
                'matrix_factorization': 0.3,
                'implicit': 0.2,
                'lightfm': 0.1
            }
        
        # Get recommendations from all algorithms
        all_recommendations = {}
        
        if 'user_based' in self.models:
            user_recs = self.get_user_based_recommendations(user_id, n_recommendations * 2)
            for rec in user_recs:
                item_id = rec['item_id']
                if item_id not in all_recommendations:
                    all_recommendations[item_id] = {
                        'item_id': item_id,
                        'scores': {},
                        'explanations': []
                    }
                all_recommendations[item_id]['scores']['user_based'] = rec['score']
                all_recommendations[item_id]['explanations'].append(rec['explanation'])
        
        if 'item_based' in self.models:
            item_recs = self.get_item_based_recommendations(user_id, n_recommendations * 2)
            for rec in item_recs:
                item_id = rec['item_id']
                if item_id not in all_recommendations:
                    all_recommendations[item_id] = {
                        'item_id': item_id,
                        'scores': {},
                        'explanations': []
                    }
                all_recommendations[item_id]['scores']['item_based'] = rec['score']
                all_recommendations[item_id]['explanations'].append(rec['explanation'])
        
        if 'matrix_factorization' in self.models:
            mf_recs = self.get_matrix_factorization_recommendations(user_id, n_recommendations * 2)
            for rec in mf_recs:
                item_id = rec['item_id']
                if item_id not in all_recommendations:
                    all_recommendations[item_id] = {
                        'item_id': item_id,
                        'scores': {},
                        'explanations': []
                    }
                all_recommendations[item_id]['scores']['matrix_factorization'] = rec['score']
                all_recommendations[item_id]['explanations'].append(rec['explanation'])
        
        if 'implicit' in self.models:
            implicit_recs = self.get_implicit_recommendations(user_id, n_recommendations * 2)
            for rec in implicit_recs:
                item_id = rec['item_id']
                if item_id not in all_recommendations:
                    all_recommendations[item_id] = {
                        'item_id': item_id,
                        'scores': {},
                        'explanations': []
                    }
                all_recommendations[item_id]['scores']['implicit'] = rec['score']
                all_recommendations[item_id]['explanations'].append(rec['explanation'])
        
        if 'lightfm' in self.models:
            lightfm_recs = self.get_lightfm_recommendations(user_id, n_recommendations * 2)
            for rec in lightfm_recs:
                item_id = rec['item_id']
                if item_id not in all_recommendations:
                    all_recommendations[item_id] = {
                        'item_id': item_id,
                        'scores': {},
                        'explanations': []
                    }
                all_recommendations[item_id]['scores']['lightfm'] = rec['score']
                all_recommendations[item_id]['explanations'].append(rec['explanation'])
        
        # Calculate weighted scores
        hybrid_recommendations = []
        for item_id, data in all_recommendations.items():
            combined_score = 0
            total_weight = 0
            
            for algorithm, score in data['scores'].items():
                if algorithm in weights:
                    combined_score += weights[algorithm] * score
                    total_weight += weights[algorithm]
            
            if total_weight > 0:
                combined_score /= total_weight
                
                hybrid_recommendations.append({
                    'item_id': item_id,
                    'score': combined_score,
                    'algorithm': 'hybrid',
                    'explanation': f"Hybrid recommendation (algorithms used: {', '.join(data['scores'].keys())})",
                    'individual_scores': data['scores'],
                    'explanations': data['explanations']
                })
        
        # Sort and get top recommendations
        hybrid_recommendations.sort(key=lambda x: x['score'], reverse=True)
        top_recommendations = hybrid_recommendations[:n_recommendations]
        
        return top_recommendations
    
    def save_models(self, filepath: str) -> None:
        """
        Save trained models to disk
        
        Args:
            filepath: Path to save models
        """
        model_data = {
            'models': self.models,
            'user_mapping': self.user_mapping,
            'item_mapping': self.item_mapping,
            'reverse_user_mapping': self.reverse_user_mapping,
            'reverse_item_mapping': self.reverse_item_mapping,
            'config': self.config
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        logger.info(f"Models saved to {filepath}")
    
    def load_models(self, filepath: str) -> None:
        """
        Load trained models from disk
        
        Args:
            filepath: Path to load models from
        """
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.models = model_data['models']
        self.user_mapping = model_data['user_mapping']
        self.item_mapping = model_data['item_mapping']
        self.reverse_user_mapping = model_data['reverse_user_mapping']
        self.reverse_item_mapping = model_data['reverse_item_mapping']
        self.config = model_data['config']
        
        logger.info(f"Models loaded from {filepath}")
    
    def evaluate_models(self, test_df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        """
        Evaluate all trained models
        
        Args:
            test_df: Test data for evaluation
            
        Returns:
            Dictionary of evaluation metrics for each model
        """
        results = {}
        
        for model_name, model in self.models.items():
            if model_name in ['user_based', 'item_based', 'matrix_factorization']:
                # Use Surprise evaluation
                reader = Reader(rating_scale=(1, 5))
                data = Dataset.load_from_df(
                    test_df[['user_id', 'item_id', 'rating']], 
                    reader
                )
                
                _, testset = train_test_split(data, test_size=1.0, random_state=42)
                predictions = model.test(testset)
                
                results[model_name] = {
                    'rmse': rmse(predictions),
                    'mae': mae(predictions)
                }
        
        return results
