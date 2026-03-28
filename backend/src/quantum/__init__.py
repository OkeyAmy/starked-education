"""
Quantum Computing Module for Starked Education Platform
Advanced quantum algorithms for optimization, machine learning, and complex analytics
"""

from .quantum_optimizer import QuantumOptimizer
from .quantum_ml import QuantumMLModels
from .quantum_circuits import QuantumCircuitDesigner
from .quantum_resources import QuantumResourceManager
from .quantum_error_correction import QuantumErrorCorrection
from .hybrid_computing import HybridQuantumClassical
from .quantum_algorithms import QuantumAlgorithms

__all__ = [
    'QuantumOptimizer',
    'QuantumMLModels', 
    'QuantumCircuitDesigner',
    'QuantumResourceManager',
    'QuantumErrorCorrection',
    'HybridQuantumClassical',
    'QuantumAlgorithms'
]

__version__ = '1.0.0'
__author__ = 'Starked Education Quantum Team'
