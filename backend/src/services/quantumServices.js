/**
 * Quantum Services Node.js Wrapper
 * Interface to Python quantum services bridge
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class QuantumServices {
  constructor() {
    this.pythonPath = 'python';
    this.bridgePath = path.join(__dirname, 'quantumBridge.py');
    this.cache = new Map();
    this.requestTimeout = 30000; // 30 seconds
  }

  /**
   * Execute quantum service request through Python bridge
   */
  async executeRequest(service, method, params = {}) {
    const cacheKey = `${service}:${method}:${JSON.stringify(params)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
        return cached.result;
      }
    }

    return new Promise((resolve, reject) => {
      const args = [
        this.bridgePath,
        service,
        method,
        JSON.stringify(params)
      ];

      const pythonProcess = spawn(this.pythonPath, args, {
        cwd: path.dirname(this.bridgePath),
        env: {
          ...process.env,
          PYTHONPATH: path.join(__dirname, '..')
        }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Set timeout
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Quantum service request timeout'));
      }, this.requestTimeout);

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code !== 0) {
          console.error('Python process error:', stderr);
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          
          // Cache successful results
          if (result.success) {
            this.cache.set(cacheKey, {
              result,
              timestamp: Date.now()
            });
          }
          
          resolve(result);
        } catch (error) {
          console.error('Error parsing Python output:', error);
          console.error('Raw output:', stdout);
          reject(new Error('Failed to parse quantum service response'));
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        console.error('Python process error:', error);
        reject(error);
      });
    });
  }

  /**
   * Get quantum service status
   */
  async getStatus() {
    try {
      const result = await this.executeRequest('status', 'get_status');
      return result;
    } catch (error) {
      console.error('Error getting quantum service status:', error);
      return {
        success: false,
        error: error.message,
        quantum_available: false
      };
    }
  }

  /**
   * Quantum Algorithms Service
   */
  async getQuantumProviders() {
    return this.executeRequest('quantum_algorithms', 'get_providers');
  }

  async connectQuantumProvider(provider, config) {
    return this.executeRequest('quantum_algorithms', 'connect_provider', {
      provider,
      config
    });
  }

  async executeQuantumCircuit(circuit, shots = 1024, provider = null) {
    return this.executeRequest('quantum_algorithms', 'execute_circuit', {
      circuit,
      shots,
      provider
    });
  }

  /**
   * Quantum Optimization Service
   */
  async getOptimizers() {
    return this.executeRequest('quantum_optimization', 'get_optimizers');
  }

  async solveOptimizationProblem(problem, optimizerName = 'qaoa') {
    return this.executeRequest('quantum_optimization', 'solve_problem', {
      problem,
      optimizer_name: optimizerName
    });
  }

  /**
   * Quantum Machine Learning Service
   */
  async getMLAlgorithms() {
    return this.executeRequest('quantum_ml', 'get_algorithms');
  }

  async createMLModel(modelId, modelType, architecture, numQubits, numLayers, parameters = {}) {
    return this.executeRequest('quantum_ml', 'create_model', {
      model_id: modelId,
      model_type: modelType,
      architecture,
      num_qubits: numQubits,
      num_layers: numLayers,
      parameters
    });
  }

  async trainMLModel(modelId, algorithmName, features, labels) {
    return this.executeRequest('quantum_ml', 'train_model', {
      model_id: modelId,
      algorithm_name: algorithmName,
      features,
      labels
    });
  }

  async predictWithMLModel(modelId, features) {
    return this.executeRequest('quantum_ml', 'predict', {
      model_id: modelId,
      features
    });
  }

  /**
   * Quantum Circuit Design Service
   */
  async getCircuitDesigners() {
    return this.executeRequest('quantum_circuits', 'get_designers');
  }

  async designCircuit(circuitSpec, designerName = 'qiskit') {
    return this.executeRequest('quantum_circuits', 'design_circuit', {
      ...circuitSpec,
      designer_name: designerName
    });
  }

  async optimizeCircuit(circuitId, optimizationLevel = 1) {
    return this.executeRequest('quantum_circuits', 'optimize_circuit', {
      circuit_id: circuitId,
      optimization_level: optimizationLevel
    });
  }

  /**
   * Resource Management Service
   */
  async listResources(resourceType = null, status = null) {
    return this.executeRequest('resource_management', 'list_resources', {
      resource_type: resourceType,
      status
    });
  }

  async getResourceUtilization() {
    return this.executeRequest('resource_management', 'get_utilization');
  }

  async submitQuantumJob(jobData) {
    return this.executeRequest('resource_management', 'submit_job', jobData);
  }

  /**
   * Hybrid Computing Service
   */
  async getHybridStrategies() {
    return this.executeRequest('hybrid_computing', 'get_strategies');
  }

  async executeHybridTask(taskData, strategyName = null) {
    return this.executeRequest('hybrid_computing', 'execute_task', {
      ...taskData,
      strategy_name: strategyName
    });
  }

  /**
   * Error Correction Service
   */
  async getErrorCorrectionCodes() {
    return this.executeRequest('error_correction', 'get_codes');
  }

  async applyErrorCorrection(circuit, codeName, errorModels = null) {
    return this.executeRequest('error_correction', 'apply_error_correction', {
      circuit,
      code_name: codeName,
      error_models: errorModels
    });
  }

  async getErrorCorrectionPerformance() {
    return this.executeRequest('error_correction', 'analyze_performance');
  }

  /**
   * Utility methods
   */
  clearCache() {
    this.cache.clear();
  }

  setRequestTimeout(timeout) {
    this.requestTimeout = timeout;
  }

  setPythonPath(pythonPath) {
    this.pythonPath = pythonPath;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const status = await this.getStatus();
      return {
        healthy: status.success || false,
        quantum_available: status.quantum_available || false,
        services: status.services || {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const quantumServices = new QuantumServices();

// Export both the class and singleton instance
module.exports = {
  QuantumServices,
  quantumServices
};
