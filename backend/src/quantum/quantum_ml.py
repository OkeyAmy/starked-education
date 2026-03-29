"""
Quantum Machine Learning Models
Advanced quantum ML algorithms for enhanced learning capabilities
"""

import numpy as np
import logging
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass
from abc import ABC, abstractmethod
import asyncio
from datetime import datetime

# Classical ML imports
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, mean_squared_error, classification_report
from sklearn.model_selection import train_test_split

# Quantum computing imports
try:
    from qiskit import QuantumCircuit
    from qiskit.algorithms import VQE
    from qiskit.primitives import Sampler, Estimator
    from qiskit_machine_learning import NeuralNetworkClassifier, VQC, QuantumKernel
    from qiskit_machine_learning.algorithms import QSVC
    from qiskit_machine_learning.kernels import QuantumKernel
    from qiskit.circuit.library import ZZFeatureMap, ZFeatureMap, RealAmplitudes
    QISKIT_ML_AVAILABLE = True
except ImportError:
    QISKIT_ML_AVAILABLE = False

try:
    import pennylane as qml
    from pennylane import numpy as np_np
    from pennylane.templates import AngleEmbedding, StronglyEntanglingLayers
    PENNYLANE_AVAILABLE = True
except ImportError:
    PENNYLANE_AVAILABLE = False

logger = logging.getLogger(__name__)

@dataclass
class QuantumMLModel:
    """Quantum ML model definition"""
    model_id: str
    model_type: str  # 'classification', 'regression', 'clustering', 'kernel'
    architecture: str  # 'vqc', 'qnn', 'quantum_kernel', 'hybrid'
    num_qubits: int
    num_layers: int
    parameters: Dict[str, Any]
    training_data: Optional[Tuple[np.ndarray, np.ndarray]] = None
    trained: bool = False
    metadata: Dict[str, Any] = None

@dataclass
class QuantumMLResult:
    """Result from quantum ML computation"""
    model_id: str
    predictions: np.ndarray
    probabilities: Optional[np.ndarray] = None
    accuracy: Optional[float] = None
    loss: Optional[float] = None
    training_time: Optional[float] = None
    inference_time: float = 0.0
    quantum_metrics: Dict[str, float] = None
    metadata: Dict[str, Any] = None

class QuantumMLAlgorithm(ABC):
    """Abstract base class for quantum ML algorithms"""
    
    @abstractmethod
    async def train(self, model: QuantumMLModel, X: np.ndarray, y: np.ndarray) -> QuantumMLResult:
        """Train quantum ML model"""
        pass
    
    @abstractmethod
    async def predict(self, model: QuantumMLModel, X: np.ndarray) -> QuantumMLResult:
        """Make predictions with quantum ML model"""
        pass
    
    @abstractmethod
    def get_algorithm_info(self) -> Dict[str, Any]:
        """Get algorithm information"""
        pass

class QuantumNeuralNetwork(QuantumMLAlgorithm):
    """Quantum Neural Network implementation"""
    
    def __init__(self, num_qubits: int = 4, num_layers: int = 2):
        self.num_qubits = num_qubits
        self.num_layers = num_layers
        self.model = None
        self.scaler = StandardScaler()
        
    async def train(self, model: QuantumMLModel, X: np.ndarray, y: np.ndarray) -> QuantumMLResult:
        """Train quantum neural network"""
        start_time = datetime.now()
        
        try:
            if not QISKIT_ML_AVAILABLE:
                raise ImportError("Qiskit ML not available")
            
            # Preprocess data
            X_scaled = self.scaler.fit_transform(X)
            
            # Encode labels if classification
            if model.model_type == 'classification':
                label_encoder = LabelEncoder()
                y_encoded = label_encoder.fit_transform(y)
                model.metadata = {'label_encoder': label_encoder}
            else:
                y_encoded = y
            
            # Create quantum feature map
            feature_map = ZZFeatureMap(feature_dimension=X_scaled.shape[1], 
                                     reps=self.num_layers)
            
            # Create ansatz
            ansatz = RealAmplitudes(num_qubits=self.num_qubits, 
                                 reps=self.num_layers)
            
            # Create quantum neural network
            sampler = Sampler()
            self.model = NeuralNetworkClassifier(
                ansatz=ansatz,
                sampler=sampler,
                optimizer=None,  # Use default optimizer
                loss=None,       # Use default loss
                one_hot=False
            )
            
            # Train model
            self.model.fit(X_scaled, y_encoded)
            
            # Make predictions on training data
            predictions = self.model.predict(X_scaled)
            
            # Calculate metrics
            if model.model_type == 'classification':
                accuracy = accuracy_score(y_encoded, predictions)
                loss = 1 - accuracy
            else:
                accuracy = None
                loss = mean_squared_error(y_encoded, predictions)
            
            training_time = (datetime.now() - start_time).total_seconds()
            
            model.trained = True
            model.training_data = (X_scaled, y_encoded)
            
            return QuantumMLResult(
                model_id=model.model_id,
                predictions=predictions,
                probabilities=None,
                accuracy=accuracy,
                loss=loss,
                training_time=training_time,
                inference_time=0.0,
                quantum_metrics={'quantum_depth': self.num_layers},
                metadata={'algorithm': 'quantum_neural_network'}
            )
            
        except Exception as e:
            logger.error(f"Quantum neural network training failed: {str(e)}")
            raise
    
    async def predict(self, model: QuantumMLModel, X: np.ndarray) -> QuantumMLResult:
        """Make predictions with quantum neural network"""
        if not model.trained or self.model is None:
            raise RuntimeError("Model not trained")
        
        start_time = datetime.now()
        
        try:
            # Preprocess data
            X_scaled = self.scaler.transform(X)
            
            # Make predictions
            predictions = self.model.predict(X_scaled)
            
            # Get probabilities if available
            probabilities = None
            if hasattr(self.model, 'predict_proba'):
                probabilities = self.model.predict_proba(X_scaled)
            
            # Decode labels if classification
            if model.model_type == 'classification' and 'label_encoder' in model.metadata:
                label_encoder = model.metadata['label_encoder']
                predictions = label_encoder.inverse_transform(predictions)
            
            inference_time = (datetime.now() - start_time).total_seconds()
            
            return QuantumMLResult(
                model_id=model.model_id,
                predictions=predictions,
                probabilities=probabilities,
                inference_time=inference_time,
                metadata={'algorithm': 'quantum_neural_network'}
            )
            
        except Exception as e:
            logger.error(f"Quantum neural network prediction failed: {str(e)}")
            raise
    
    def get_algorithm_info(self) -> Dict[str, Any]:
        """Get algorithm information"""
        return {
            "name": "Quantum Neural Network",
            "type": "Quantum ML",
            "suitable_tasks": ["Classification", "Regression"],
            "parameters": {
                "num_qubits": self.num_qubits,
                "num_layers": self.num_layers
            },
            "advantages": ["Quantum feature space", "Non-linear transformations"]
        }

class QuantumKernelSVM(QuantumMLAlgorithm):
    """Quantum Support Vector Machine with quantum kernel"""
    
    def __init__(self, num_qubits: int = 4, feature_map_type: str = 'zz'):
        self.num_qubits = num_qubits
        self.feature_map_type = feature_map_type
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
    
    async def train(self, model: QuantumMLModel, X: np.ndarray, y: np.ndarray) -> QuantumMLResult:
        """Train quantum kernel SVM"""
        start_time = datetime.now()
        
        try:
            if not QISKIT_ML_AVAILABLE:
                raise ImportError("Qiskit ML not available")
            
            # Preprocess data
            X_scaled = self.scaler.fit_transform(X)
            
            # Encode labels
            y_encoded = self.label_encoder.fit_transform(y)
            
            # Create quantum feature map
            if self.feature_map_type == 'zz':
                feature_map = ZZFeatureMap(feature_dimension=X_scaled.shape[1], reps=2)
            elif self.feature_map_type == 'z':
                feature_map = ZFeatureMap(feature_dimension=X_scaled.shape[1], reps=2)
            else:
                feature_map = ZZFeatureMap(feature_dimension=X_scaled.shape[1], reps=2)
            
            # Create quantum kernel
            quantum_kernel = QuantumKernel(
                feature_map=feature_map,
                sampler=Sampler()
            )
            
            # Create QSVC model
            self.model = QSVC(quantum_kernel=quantum_kernel)
            
            # Train model
            self.model.fit(X_scaled, y_encoded)
            
            # Make predictions on training data
            predictions = self.model.predict(X_scaled)
            accuracy = accuracy_score(y_encoded, predictions)
            loss = 1 - accuracy
            
            training_time = (datetime.now() - start_time).total_seconds()
            
            model.trained = True
            model.training_data = (X_scaled, y_encoded)
            
            return QuantumMLResult(
                model_id=model.model_id,
                predictions=predictions,
                probabilities=None,
                accuracy=accuracy,
                loss=loss,
                training_time=training_time,
                inference_time=0.0,
                quantum_metrics={
                    'kernel_type': self.feature_map_type,
                    'num_qubits': self.num_qubits
                },
                metadata={'algorithm': 'quantum_kernel_svm'}
            )
            
        except Exception as e:
            logger.error(f"Quantum kernel SVM training failed: {str(e)}")
            raise
    
    async def predict(self, model: QuantumMLModel, X: np.ndarray) -> QuantumMLResult:
        """Make predictions with quantum kernel SVM"""
        if not model.trained or self.model is None:
            raise RuntimeError("Model not trained")
        
        start_time = datetime.now()
        
        try:
            # Preprocess data
            X_scaled = self.scaler.transform(X)
            
            # Make predictions
            predictions = self.model.predict(X_scaled)
            
            # Get decision function values
            probabilities = None
            if hasattr(self.model, 'decision_function'):
                decision_scores = self.model.decision_function(X_scaled)
                # Convert to probabilities using sigmoid
                probabilities = 1 / (1 + np.exp(-decision_scores))
            
            # Decode labels
            predictions = self.label_encoder.inverse_transform(predictions)
            
            inference_time = (datetime.now() - start_time).total_seconds()
            
            return QuantumMLResult(
                model_id=model.model_id,
                predictions=predictions,
                probabilities=probabilities,
                inference_time=inference_time,
                metadata={'algorithm': 'quantum_kernel_svm'}
            )
            
        except Exception as e:
            logger.error(f"Quantum kernel SVM prediction failed: {str(e)}")
            raise
    
    def get_algorithm_info(self) -> Dict[str, Any]:
        """Get algorithm information"""
        return {
            "name": "Quantum Kernel SVM",
            "type": "Quantum ML",
            "suitable_tasks": ["Classification"],
            "parameters": {
                "num_qubits": self.num_qubits,
                "feature_map": self.feature_map_type
            },
            "advantages": ["Quantum feature mapping", "Kernel trick in quantum space"]
        }

class PennyLaneQuantumML(QuantumMLAlgorithm):
    """PennyLane-based quantum ML models"""
    
    def __init__(self, num_qubits: int = 4, num_layers: int = 2):
        self.num_qubits = num_qubits
        self.num_layers = num_layers
        self.device = None
        self.weights = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        
        if PENNYLANE_AVAILABLE:
            self.device = qml.device("default.qubit", wires=num_qubits)
    
    async def train(self, model: QuantumMLModel, X: np.ndarray, y: np.ndarray) -> QuantumMLResult:
        """Train PennyLane quantum ML model"""
        start_time = datetime.now()
        
        try:
            if not PENNYLANE_AVAILABLE:
                raise ImportError("PennyLane not available")
            
            # Preprocess data
            X_scaled = self.scaler.fit_transform(X)
            
            # Encode labels
            y_encoded = self.label_encoder.fit_transform(y)
            n_classes = len(np.unique(y_encoded))
            
            # Define quantum circuit
            @qml.qnode(self.device)
            def quantum_circuit(weights, x):
                # Encode classical data
                AngleEmbedding(x, wires=range(self.num_qubits))
                
                # Variational layers
                StronglyEntanglingLayers(weights, wires=range(self.num_qubits))
                
                # Measure
                return [qml.expval(qml.PauliZ(i)) for i in range(self.num_qubits)]
            
            # Initialize weights
            weights_shape = (self.num_layers, self.num_qubits, 3)
            self.weights = np_np.random.uniform(0, 2*np.pi, weights_shape)
            
            # Training loop (simplified)
            learning_rate = 0.01
            for epoch in range(100):
                total_loss = 0
                
                for i in range(len(X_scaled)):
                    # Forward pass
                    measurements = quantum_circuit(self.weights, X_scaled[i])
                    
                    # Convert measurements to class prediction
                    if n_classes == 2:
                        pred = 1 if measurements[0] < 0 else 0
                    else:
                        # Multi-class: use measurements to determine class
                        pred = int(np.argmax(measurements[:n_classes]))
                    
                    # Calculate loss
                    loss = 1 if pred != y_encoded[i] else 0
                    total_loss += loss
                    
                    # Gradient descent (simplified)
                    if loss > 0:
                        gradient = np_np.random.uniform(-learning_rate, learning_rate, weights_shape)
                        self.weights = self.weights - gradient
                
                if epoch % 10 == 0:
                    logger.info(f"Epoch {epoch}, Loss: {total_loss / len(X_scaled)}")
            
            # Make predictions on training data
            predictions = []
            for i in range(len(X_scaled)):
                measurements = quantum_circuit(self.weights, X_scaled[i])
                if n_classes == 2:
                    pred = 1 if measurements[0] < 0 else 0
                else:
                    pred = int(np.argmax(measurements[:n_classes]))
                predictions.append(pred)
            
            predictions = np.array(predictions)
            accuracy = accuracy_score(y_encoded, predictions)
            loss = 1 - accuracy
            
            training_time = (datetime.now() - start_time).total_seconds()
            
            model.trained = True
            model.training_data = (X_scaled, y_encoded)
            
            return QuantumMLResult(
                model_id=model.model_id,
                predictions=predictions,
                probabilities=None,
                accuracy=accuracy,
                loss=loss,
                training_time=training_time,
                inference_time=0.0,
                quantum_metrics={
                    'num_qubits': self.num_qubits,
                    'num_layers': self.num_layers
                },
                metadata={'algorithm': 'pennylane_quantum_ml'}
            )
            
        except Exception as e:
            logger.error(f"PennyLane quantum ML training failed: {str(e)}")
            raise
    
    async def predict(self, model: QuantumMLModel, X: np.ndarray) -> QuantumMLResult:
        """Make predictions with PennyLane quantum ML"""
        if not model.trained or self.weights is None:
            raise RuntimeError("Model not trained")
        
        start_time = datetime.now()
        
        try:
            # Preprocess data
            X_scaled = self.scaler.transform(X)
            
            # Define quantum circuit (same as training)
            @qml.qnode(self.device)
            def quantum_circuit(weights, x):
                AngleEmbedding(x, wires=range(self.num_qubits))
                StronglyEntanglingLayers(weights, wires=range(self.num_qubits))
                return [qml.expval(qml.PauliZ(i)) for i in range(self.num_qubits)]
            
            # Make predictions
            predictions = []
            probabilities = []
            
            for i in range(len(X_scaled)):
                measurements = quantum_circuit(self.weights, X_scaled[i])
                
                # Get number of classes from training data
                if model.training_data:
                    n_classes = len(np.unique(model.training_data[1]))
                else:
                    n_classes = 2
                
                if n_classes == 2:
                    pred = 1 if measurements[0] < 0 else 0
                    prob = 1 / (1 + np.exp(-measurements[0]))
                else:
                    pred = int(np.argmax(measurements[:n_classes]))
                    prob = np.exp(measurements[:n_classes]) / np.sum(np.exp(measurements[:n_classes]))
                
                predictions.append(pred)
                probabilities.append(prob)
            
            # Decode labels
            predictions = self.label_encoder.inverse_transform(np.array(predictions))
            probabilities = np.array(probabilities)
            
            inference_time = (datetime.now() - start_time).total_seconds()
            
            return QuantumMLResult(
                model_id=model.model_id,
                predictions=predictions,
                probabilities=probabilities,
                inference_time=inference_time,
                metadata={'algorithm': 'pennylane_quantum_ml'}
            )
            
        except Exception as e:
            logger.error(f"PennyLane quantum ML prediction failed: {str(e)}")
            raise
    
    def get_algorithm_info(self) -> Dict[str, Any]:
        """Get algorithm information"""
        return {
            "name": "PennyLane Quantum ML",
            "type": "Quantum ML",
            "suitable_tasks": ["Classification", "Regression"],
            "parameters": {
                "num_qubits": self.num_qubits,
                "num_layers": self.num_layers
            },
            "advantages": ["Flexible circuits", "Gradient-based optimization"]
        }

class QuantumMLService:
    """Main service for quantum machine learning"""
    
    def __init__(self):
        self.algorithms: Dict[str, QuantumMLAlgorithm] = {}
        self.models: Dict[str, QuantumMLModel] = {}
        self.results_history: List[QuantumMLResult] = []
        
        # Register default algorithms
        if QISKIT_ML_AVAILABLE:
            self.algorithms["qnn"] = QuantumNeuralNetwork()
            self.algorithms["qsvm"] = QuantumKernelSVM()
        
        if PENNYLANE_AVAILABLE:
            self.algorithms["pennylane"] = PennyLaneQuantumML()
    
    def register_algorithm(self, name: str, algorithm: QuantumMLAlgorithm):
        """Register a quantum ML algorithm"""
        self.algorithms[name] = algorithm
        logger.info(f"Registered quantum ML algorithm: {name}")
    
    def create_model(self, model_id: str, model_type: str, architecture: str,
                    num_qubits: int, num_layers: int, 
                    parameters: Dict[str, Any] = None) -> QuantumMLModel:
        """Create a quantum ML model"""
        model = QuantumMLModel(
            model_id=model_id,
            model_type=model_type,
            architecture=architecture,
            num_qubits=num_qubits,
            num_layers=num_layers,
            parameters=parameters or {},
            metadata={}
        )
        
        self.models[model_id] = model
        logger.info(f"Created quantum ML model: {model_id}")
        
        return model
    
    async def train_model(self, model_id: str, algorithm_name: str,
                         X: np.ndarray, y: np.ndarray) -> QuantumMLResult:
        """Train quantum ML model"""
        if model_id not in self.models:
            raise ValueError(f"Model {model_id} not found")
        
        if algorithm_name not in self.algorithms:
            raise ValueError(f"Algorithm {algorithm_name} not available")
        
        model = self.models[model_id]
        algorithm = self.algorithms[algorithm_name]
        
        result = await algorithm.train(model, X, y)
        self.results_history.append(result)
        
        logger.info(f"Trained model {model_id} using {algorithm_name}")
        return result
    
    async def predict(self, model_id: str, X: np.ndarray) -> QuantumMLResult:
        """Make predictions with trained model"""
        if model_id not in self.models:
            raise ValueError(f"Model {model_id} not found")
        
        model = self.models[model_id]
        
        # Find algorithm used for training
        algorithm_name = None
        if model.metadata and 'algorithm' in model.metadata:
            algorithm_map = {
                'quantum_neural_network': 'qnn',
                'quantum_kernel_svm': 'qsvm',
                'pennylane_quantum_ml': 'pennylane'
            }
            algorithm_name = algorithm_map.get(model.metadata['algorithm'])
        
        if algorithm_name is None or algorithm_name not in self.algorithms:
            raise RuntimeError("Cannot determine algorithm for model")
        
        algorithm = self.algorithms[algorithm_name]
        result = await algorithm.predict(model, X)
        
        logger.info(f"Made predictions with model {model_id}")
        return result
    
    def get_available_algorithms(self) -> List[str]:
        """Get list of available algorithms"""
        return list(self.algorithms.keys())
    
    def get_algorithm_info(self, algorithm_name: str) -> Dict[str, Any]:
        """Get information about algorithm"""
        if algorithm_name not in self.algorithms:
            return {}
        
        return self.algorithms[algorithm_name].get_algorithm_info()
    
    def get_model_info(self, model_id: str) -> Dict[str, Any]:
        """Get information about model"""
        if model_id not in self.models:
            return {}
        
        model = self.models[model_id]
        return {
            'model_id': model.model_id,
            'model_type': model.model_type,
            'architecture': model.architecture,
            'num_qubits': model.num_qubits,
            'num_layers': model.num_layers,
            'trained': model.trained,
            'parameters': model.parameters,
            'metadata': model.metadata
        }
    
    def get_results_history(self, limit: int = 100) -> List[QuantumMLResult]:
        """Get quantum ML results history"""
        return self.results_history[-limit:]
    
    def compare_algorithms(self, model_type: str, X: np.ndarray, y: np.ndarray,
                          algorithm_names: List[str]) -> Dict[str, QuantumMLResult]:
        """Compare multiple algorithms on same data"""
        results = {}
        
        for algorithm_name in algorithm_names:
            if algorithm_name in self.algorithms:
                try:
                    # Create temporary model
                    temp_model_id = f"temp_{algorithm_name}_{datetime.now().timestamp()}"
                    model = self.create_model(
                        temp_model_id, model_type, algorithm_name,
                        4, 2  # Default parameters
                    )
                    
                    # Train and evaluate
                    result = asyncio.run(self.train_model(temp_model_id, algorithm_name, X, y))
                    results[algorithm_name] = result
                    
                    # Clean up temporary model
                    del self.models[temp_model_id]
                    
                except Exception as e:
                    logger.error(f"Algorithm {algorithm_name} failed: {str(e)}")
        
        return results

# Initialize quantum ML service
quantum_ml_service = QuantumMLService()
