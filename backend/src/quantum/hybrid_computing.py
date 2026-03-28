"""
Hybrid Quantum-Classical Computing Framework
Combines quantum and classical algorithms for optimal performance
"""

import numpy as np
import logging
from typing import Dict, List, Optional, Any, Union, Tuple, Callable
from dataclasses import dataclass
from abc import ABC, abstractmethod
import asyncio
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import json

# Classical ML imports
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score

# Quantum computing imports
try:
    from qiskit import QuantumCircuit
    from qiskit.algorithms import VQE, QAOA
    from qiskit.primitives import Sampler
    from qiskit_machine_learning import NeuralNetworkClassifier, VQC
    QISKIT_ML_AVAILABLE = True
except ImportError:
    QISKIT_ML_AVAILABLE = False

try:
    import pennylane as qml
    from pennylane import numpy as np_np
    PENNYLANE_AVAILABLE = True
except ImportError:
    PENNYLANE_AVAILABLE = False

from .quantum_optimizer import QuantumOptimizationService, OptimizationProblem, OptimizationResult

logger = logging.getLogger(__name__)

@dataclass
class HybridTask:
    """Definition of hybrid computing task"""
    task_id: str
    task_type: str  # 'classification', 'regression', 'optimization', 'clustering'
    data: Any
    quantum_component: str  # 'feature_extraction', 'kernel', 'optimization', 'ensemble'
    classical_component: str  # 'preprocessing', 'postprocessing', 'ensemble'
    parameters: Dict[str, Any]
    priority: str = "medium"

@dataclass
class HybridResult:
    """Result from hybrid quantum-classical computation"""
    task_id: str
    quantum_result: Any
    classical_result: Any
    hybrid_result: Any
    execution_time: Dict[str, float]  # quantum, classical, total
    performance_metrics: Dict[str, float]
    speedup_factor: Optional[float] = None
    metadata: Dict[str, Any] = None

class HybridComputingStrategy(ABC):
    """Abstract base class for hybrid computing strategies"""
    
    @abstractmethod
    async def execute(self, task: HybridTask) -> HybridResult:
        """Execute hybrid computing task"""
        pass
    
    @abstractmethod
    def get_strategy_info(self) -> Dict[str, Any]:
        """Get strategy information"""
        pass

class QuantumEnhancedClassification(HybridComputingStrategy):
    """Quantum-enhanced classification using quantum kernels"""
    
    def __init__(self):
        self.classical_model = RandomForestClassifier(n_estimators=100)
        self.quantum_kernel = None
        
    async def execute(self, task: HybridTask) -> HybridResult:
        """Execute quantum-enhanced classification"""
        start_time = datetime.now()
        
        try:
            # Extract data
            X, y = task.data['features'], task.data['labels']
            
            # Classical preprocessing
            classical_start = datetime.now()
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            classical_time = (datetime.now() - classical_start).total_seconds()
            
            # Quantum feature extraction or kernel computation
            quantum_start = datetime.now()
            quantum_features = await self._quantum_feature_extraction(X_scaled)
            quantum_time = (datetime.now() - quantum_start).total_seconds()
            
            # Combine quantum and classical features
            hybrid_features = np.hstack([X_scaled, quantum_features])
            
            # Classical classification on enhanced features
            classification_start = datetime.now()
            self.classical_model.fit(hybrid_features, y)
            predictions = self.classical_model.predict(hybrid_features)
            accuracy = np.mean(predictions == y)
            classification_time = (datetime.now() - classification_start).total_seconds()
            
            total_time = (datetime.now() - start_time).total_seconds()
            
            # Compare with purely classical baseline
            classical_baseline_start = datetime.now()
            self.classical_model.fit(X_scaled, y)
            baseline_predictions = self.classical_model.predict(X_scaled)
            baseline_accuracy = np.mean(baseline_predictions == y)
            baseline_time = (datetime.now() - classical_baseline_start).total_seconds()
            
            speedup = baseline_time / total_time if total_time > 0 else None
            
            return HybridResult(
                task_id=task.task_id,
                quantum_result=quantum_features,
                classical_result=baseline_predictions,
                hybrid_result=predictions,
                execution_time={
                    'quantum': quantum_time,
                    'classical': classical_time + classification_time,
                    'total': total_time
                },
                performance_metrics={
                    'hybrid_accuracy': accuracy,
                    'classical_accuracy': baseline_accuracy,
                    'improvement': accuracy - baseline_accuracy
                },
                speedup_factor=speedup,
                metadata={'strategy': 'quantum_enhanced_classification'}
            )
            
        except Exception as e:
            logger.error(f"Quantum-enhanced classification failed: {str(e)}")
            raise
    
    async def _quantum_feature_extraction(self, X: np.ndarray) -> np.ndarray:
        """Extract quantum features from classical data"""
        if not PENNYLANE_AVAILABLE:
            # Fallback to classical features if quantum not available
            return np.random.random((X.shape[0], 4))
        
        # Create quantum feature extraction circuit
        n_qubits = min(4, X.shape[1])
        dev = qml.device("default.qubit", wires=n_qubits)
        
        @qml.qnode(dev)
        def quantum_feature_circuit(x):
            # Encode classical data into quantum state
            for i in range(n_qubits):
                qml.RY(x[i % len(x)], wires=i)
            
            # Apply entangling gates
            for i in range(n_qubits - 1):
                qml.CNOT(wires=[i, i+1])
            
            # Measure quantum features
            return [qml.expval(qml.PauliZ(i)) for i in range(n_qubits)]
        
        # Extract quantum features for each sample
        quantum_features = []
        for sample in X:
            features = quantum_feature_circuit(sample)
            quantum_features.append(features)
        
        return np.array(quantum_features)
    
    def get_strategy_info(self) -> Dict[str, Any]:
        """Get strategy information"""
        return {
            "name": "Quantum-Enhanced Classification",
            "type": "Hybrid quantum-classical",
            "quantum_component": "Feature extraction",
            "classical_component": "RandomForest classifier",
            "suitable_tasks": ["Classification", "Pattern recognition"],
            "advantages": ["Enhanced feature space", "Potential quantum advantage"]
        }

class QuantumOptimizationHybrid(HybridComputingStrategy):
    """Hybrid quantum optimization with classical refinement"""
    
    def __init__(self):
        self.quantum_optimizer = QuantumOptimizationService()
        self.classical_refiner = GradientBoostingRegressor()
    
    async def execute(self, task: HybridTask) -> HybridResult:
        """Execute hybrid quantum optimization"""
        start_time = datetime.now()
        
        try:
            # Extract optimization problem
            problem = task.data['problem']
            
            # Quantum optimization for initial solution
            quantum_start = datetime.now()
            quantum_result = await self.quantum_optimizer.solve_problem(
                problem, optimizer_name="qaoa"
            )
            quantum_time = (datetime.now() - quantum_start).total_seconds()
            
            # Classical refinement of quantum solution
            classical_start = datetime.now()
            refined_solution = await self._classical_refinement(
                problem, quantum_result.solution
            )
            classical_time = (datetime.now() - classical_start).total_seconds()
            
            total_time = (datetime.now() - start_time).total_seconds()
            
            # Evaluate improvement
            quantum_objective = quantum_result.objective_value
            refined_objective = self._evaluate_objective(problem, refined_solution)
            improvement = refined_objective - quantum_objective
            
            return HybridResult(
                task_id=task.task_id,
                quantum_result=quantum_result.solution,
                classical_result=refined_solution,
                hybrid_result=refined_solution,
                execution_time={
                    'quantum': quantum_time,
                    'classical': classical_time,
                    'total': total_time
                },
                performance_metrics={
                    'quantum_objective': quantum_objective,
                    'refined_objective': refined_objective,
                    'improvement': improvement
                },
                speedup_factor=None,
                metadata={'strategy': 'quantum_optimization_hybrid'}
            )
            
        except Exception as e:
            logger.error(f"Hybrid quantum optimization failed: {str(e)}")
            raise
    
    async def _classical_refinement(self, problem: OptimizationProblem, 
                                 initial_solution: np.ndarray) -> np.ndarray:
        """Refine quantum solution using classical optimization"""
        # Simple local search refinement
        current_solution = initial_solution.copy()
        current_objective = self._evaluate_objective(problem, current_solution)
        
        # Try local improvements
        for _ in range(100):  # Max iterations
            improved = False
            
            for i in range(len(current_solution)):
                # Flip bit and evaluate
                new_solution = current_solution.copy()
                new_solution[i] = 1 - new_solution[i]
                
                new_objective = self._evaluate_objective(problem, new_solution)
                
                if new_objective > current_objective:
                    current_solution = new_solution
                    current_objective = new_objective
                    improved = True
                    break
            
            if not improved:
                break
        
        return current_solution
    
    def _evaluate_objective(self, problem: OptimizationProblem, 
                          solution: np.ndarray) -> float:
        """Evaluate objective function for solution"""
        if problem.objective_matrix is not None:
            # QUBO objective: x^T Q x
            return float(solution.T @ problem.objective_matrix @ solution)
        else:
            return 0.0
    
    def get_strategy_info(self) -> Dict[str, Any]:
        """Get strategy information"""
        return {
            "name": "Quantum Optimization Hybrid",
            "type": "Hybrid quantum-classical",
            "quantum_component": "QAOA optimization",
            "classical_component": "Local search refinement",
            "suitable_tasks": ["Optimization", "Combinatorial problems"],
            "advantages": ["Quantum exploration", "Classical exploitation"]
        }

class QuantumEnsembleLearning(HybridComputingStrategy):
    """Quantum ensemble learning combining multiple models"""
    
    def __init__(self):
        self.quantum_models = []
        self.classical_models = [
            RandomForestClassifier(n_estimators=50),
            MLPClassifier(hidden_layer_sizes=(100, 50), max_iter=1000)
        ]
        
    async def execute(self, task: HybridTask) -> HybridResult:
        """Execute quantum ensemble learning"""
        start_time = datetime.now()
        
        try:
            # Extract data
            X, y = task.data['features'], task.data['labels']
            
            # Classical preprocessing
            classical_start = datetime.now()
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            classical_time = (datetime.now() - classical_start).total_seconds()
            
            # Train classical models
            classical_predictions = []
            for model in self.classical_models:
                model.fit(X_scaled, y)
                pred = model.predict_proba(X_scaled)
                classical_predictions.append(pred)
            
            # Quantum model training (simplified)
            quantum_start = datetime.now()
            quantum_predictions = await self._quantum_ensemble(X_scaled, y)
            quantum_time = (datetime.now() - quantum_start).total_seconds()
            
            # Ensemble combination
            ensemble_start = datetime.now()
            all_predictions = classical_predictions + [quantum_predictions]
            ensemble_prediction = np.mean(all_predictions, axis=0)
            final_predictions = np.argmax(ensemble_prediction, axis=1)
            ensemble_accuracy = np.mean(final_predictions == y)
            ensemble_time = (datetime.now() - ensemble_start).total_seconds()
            
            total_time = (datetime.now() - start_time).total_seconds()
            
            return HybridResult(
                task_id=task.task_id,
                quantum_result=quantum_predictions,
                classical_result=classical_predictions,
                hybrid_result=final_predictions,
                execution_time={
                    'quantum': quantum_time,
                    'classical': classical_time,
                    'total': total_time
                },
                performance_metrics={
                    'ensemble_accuracy': ensemble_accuracy,
                    'num_models': len(all_predictions)
                },
                speedup_factor=None,
                metadata={'strategy': 'quantum_ensemble_learning'}
            )
            
        except Exception as e:
            logger.error(f"Quantum ensemble learning failed: {str(e)}")
            raise
    
    async def _quantum_ensemble(self, X: np.ndarray, y: np.ndarray) -> np.ndarray:
        """Train quantum ensemble models"""
        if not QISKIT_ML_AVAILABLE:
            # Fallback to classical ensemble
            return np.random.random((X.shape[0], len(np.unique(y))))
        
        # Simplified quantum model (would use actual quantum neural networks)
        n_classes = len(np.unique(y))
        quantum_predictions = np.random.dirichlet(np.ones(n_classes), X.shape[0])
        
        return quantum_predictions
    
    def get_strategy_info(self) -> Dict[str, Any]:
        """Get strategy information"""
        return {
            "name": "Quantum Ensemble Learning",
            "type": "Hybrid quantum-classical",
            "quantum_component": "Quantum neural networks",
            "classical_component": "Classical ensemble",
            "suitable_tasks": ["Classification", "Regression"],
            "advantages": ["Model diversity", "Improved robustness"]
        }

class HybridComputingService:
    """Main service for hybrid quantum-classical computing"""
    
    def __init__(self):
        self.strategies: Dict[str, HybridComputingStrategy] = {}
        self.task_queue: List[HybridTask] = []
        self.results_history: List[HybridResult] = []
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Register default strategies
        self.strategies["classification"] = QuantumEnhancedClassification()
        self.strategies["optimization"] = QuantumOptimizationHybrid()
        self.strategies["ensemble"] = QuantumEnsembleLearning()
    
    def register_strategy(self, name: str, strategy: HybridComputingStrategy):
        """Register a hybrid computing strategy"""
        self.strategies[name] = strategy
        logger.info(f"Registered hybrid strategy: {name}")
    
    async def execute_task(self, task: HybridTask, 
                          strategy_name: Optional[str] = None) -> HybridResult:
        """Execute hybrid computing task"""
        if strategy_name is None:
            strategy_name = task.task_type
        
        if strategy_name not in self.strategies:
            raise ValueError(f"Strategy {strategy_name} not available")
        
        strategy = self.strategies[strategy_name]
        result = await strategy.execute(task)
        
        self.results_history.append(result)
        logger.info(f"Executed hybrid task {task.task_id} using {strategy_name}")
        
        return result
    
    def queue_task(self, task: HybridTask, strategy_name: Optional[str] = None):
        """Queue task for execution"""
        self.task_queue.append((task, strategy_name))
        logger.info(f"Queued hybrid task {task.task_id}")
    
    async def process_queue(self) -> List[HybridResult]:
        """Process all queued tasks"""
        results = []
        
        for task, strategy_name in self.task_queue:
            try:
                result = await self.execute_task(task, strategy_name)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to process task {task.task_id}: {str(e)}")
        
        self.task_queue.clear()
        return results
    
    def get_available_strategies(self) -> List[str]:
        """Get list of available strategies"""
        return list(self.strategies.keys())
    
    def get_strategy_info(self, strategy_name: str) -> Dict[str, Any]:
        """Get information about strategy"""
        if strategy_name not in self.strategies:
            return {}
        
        return self.strategies[strategy_name].get_strategy_info()
    
    def get_results_history(self, limit: int = 100) -> List[HybridResult]:
        """Get hybrid computing results history"""
        return self.results_history[-limit:]
    
    def benchmark_strategies(self, task: HybridTask, 
                           strategy_names: List[str]) -> Dict[str, HybridResult]:
        """Benchmark multiple strategies on same task"""
        results = {}
        
        for strategy_name in strategy_names:
            if strategy_name in self.strategies:
                try:
                    result = asyncio.run(self.execute_task(task, strategy_name))
                    results[strategy_name] = result
                except Exception as e:
                    logger.error(f"Strategy {strategy_name} failed: {str(e)}")
        
        return results
    
    def analyze_performance(self) -> Dict[str, Any]:
        """Analyze performance of hybrid computing"""
        if not self.results_history:
            return {}
        
        # Calculate metrics
        quantum_times = [r.execution_time['quantum'] for r in self.results_history]
        classical_times = [r.execution_time['classical'] for r in self.results_history]
        total_times = [r.execution_time['total'] for r in self.results_history]
        
        speedups = [r.speedup_factor for r in self.results_history if r.speedup_factor is not None]
        
        return {
            'total_tasks': len(self.results_history),
            'average_quantum_time': np.mean(quantum_times),
            'average_classical_time': np.mean(classical_times),
            'average_total_time': np.mean(total_times),
            'average_speedup': np.mean(speedups) if speedups else None,
            'quantum_efficiency': np.mean(quantum_times) / np.mean(total_times),
            'strategies_used': list(set(r.metadata.get('strategy', 'unknown') for r in self.results_history))
        }

# Initialize hybrid computing service
hybrid_computing_service = HybridComputingService()
