"""
Quantum Computing Resource Management
Advanced resource allocation and scheduling for quantum hardware
"""

import numpy as np
import logging
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass
from abc import ABC, abstractmethod
import asyncio
from datetime import datetime, timedelta
from enum import Enum
import json

logger = logging.getLogger(__name__)

class QuantumResourceType(Enum):
    """Types of quantum resources"""
    QUBIT = "qubit"
    QUANTUM_GATE = "quantum_gate"
    QUANTUM_CHANNEL = "quantum_channel"
    QUANTUM_MEMORY = "quantum_memory"
    QUANTUM_PROCESSOR = "quantum_processor"
    QUANTUM_SIMULATOR = "quantum_simulator"

class ResourceStatus(Enum):
    """Resource status"""
    AVAILABLE = "available"
    BUSY = "busy"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"
    RESERVED = "reserved"

@dataclass
class QuantumResource:
    """Definition of quantum resource"""
    resource_id: str
    resource_type: QuantumResourceType
    name: str
    capacity: int
    performance_metrics: Dict[str, float]
    location: str
    provider: str
    status: ResourceStatus
    cost_per_hour: float
    specifications: Dict[str, Any]
    availability_schedule: Dict[str, Any]
    metadata: Dict[str, Any] = None

@dataclass
class QuantumJob:
    """Quantum computing job"""
    job_id: str
    user_id: str
    priority: int  # 1-10, where 10 is highest
    resource_requirements: Dict[str, Any]
    estimated_duration: float  # in hours
    deadline: Optional[datetime]
    circuit: Any  # Quantum circuit
    parameters: Dict[str, Any]
    status: str = "pending"
    created_at: datetime = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    assigned_resources: List[str] = None

@dataclass
class ResourceAllocation:
    """Resource allocation result"""
    allocation_id: str
    job_id: str
    allocated_resources: List[QuantumResource]
    start_time: datetime
    end_time: datetime
    total_cost: float
    utilization_score: float
    optimization_metrics: Dict[str, float]

class ResourceScheduler(ABC):
    """Abstract base class for resource schedulers"""
    
    @abstractmethod
    async def schedule_job(self, job: QuantumJob, 
                         available_resources: List[QuantumResource]) -> ResourceAllocation:
        """Schedule job on available resources"""
        pass
    
    @abstractmethod
    def get_scheduler_info(self) -> Dict[str, Any]:
        """Get scheduler information"""
        pass

class PriorityBasedScheduler(ResourceScheduler):
    """Priority-based resource scheduler"""
    
    def __init__(self):
        self.algorithm_name = "priority_based"
    
    async def schedule_job(self, job: QuantumJob, 
                         available_resources: List[QuantumResource]) -> ResourceAllocation:
        """Schedule job based on priority and resource availability"""
        try:
            # Filter available resources
            suitable_resources = self._filter_suitable_resources(job, available_resources)
            
            if not suitable_resources:
                raise ValueError("No suitable resources available")
            
            # Sort by priority and performance
            sorted_resources = sorted(suitable_resources, 
                                    key=lambda r: self._calculate_resource_score(r, job),
                                    reverse=True)
            
            # Select best resources
            allocated_resources = self._select_resources(job, sorted_resources)
            
            # Calculate timing
            start_time = self._calculate_start_time(job, allocated_resources)
            end_time = start_time + timedelta(hours=job.estimated_duration)
            
            # Calculate cost
            total_cost = sum(r.cost_per_hour * job.estimated_duration for r in allocated_resources)
            
            # Calculate utilization
            utilization_score = self._calculate_utilization(allocated_resources, job)
            
            return ResourceAllocation(
                allocation_id=f"alloc_{job.job_id}_{datetime.now().timestamp()}",
                job_id=job.job_id,
                allocated_resources=allocated_resources,
                start_time=start_time,
                end_time=end_time,
                total_cost=total_cost,
                utilization_score=utilization_score,
                optimization_metrics={
                    'priority_score': job.priority,
                    'resource_efficiency': self._calculate_efficiency(allocated_resources),
                    'cost_efficiency': total_cost / (job.estimated_duration + 0.001)
                }
            )
            
        except Exception as e:
            logger.error(f"Priority-based scheduling failed: {str(e)}")
            raise
    
    def _filter_suitable_resources(self, job: QuantumJob, 
                                resources: List[QuantumResource]) -> List[QuantumResource]:
        """Filter resources suitable for the job"""
        suitable = []
        
        for resource in resources:
            if resource.status != ResourceStatus.AVAILABLE:
                continue
            
            # Check resource type compatibility
            if resource.resource_type == QuantumResourceType.QUANTUM_PROCESSOR:
                required_qubits = job.resource_requirements.get('num_qubits', 1)
                if resource.capacity >= required_qubits:
                    suitable.append(resource)
            elif resource.resource_type == QuantumResourceType.QUANTUM_SIMULATOR:
                # Simulators are generally suitable
                suitable.append(resource)
        
        return suitable
    
    def _calculate_resource_score(self, resource: QuantumResource, job: QuantumJob) -> float:
        """Calculate resource suitability score"""
        score = 0.0
        
        # Performance score
        performance = resource.performance_metrics.get('fidelity', 0.0)
        score += performance * 0.4
        
        # Cost efficiency (lower cost is better)
        max_cost = 100.0  # Normalize cost
        cost_score = 1.0 - (resource.cost_per_hour / max_cost)
        score += cost_score * 0.3
        
        # Capacity utilization
        required_qubits = job.resource_requirements.get('num_qubits', 1)
        capacity_score = 1.0 - (required_qubits / resource.capacity)
        score += capacity_score * 0.2
        
        # Availability
        availability = resource.performance_metrics.get('availability', 0.0)
        score += availability * 0.1
        
        return score
    
    def _select_resources(self, job: QuantumJob, 
                         sorted_resources: List[QuantumResource]) -> List[QuantumResource]:
        """Select resources for the job"""
        allocated = []
        
        # For simplicity, allocate one primary resource
        if sorted_resources:
            allocated.append(sorted_resources[0])
        
        # Add additional resources if needed
        required_resources = job.resource_requirements.get('additional_resources', 0)
        for i in range(min(required_resources, len(sorted_resources) - 1)):
            allocated.append(sorted_resources[i + 1])
        
        return allocated
    
    def _calculate_start_time(self, job: QuantumJob, 
                            resources: List[QuantumResource]) -> datetime:
        """Calculate optimal start time"""
        # For now, start immediately
        # In practice, would check resource availability schedule
        return datetime.now()
    
    def _calculate_utilization(self, resources: List[QuantumResource], 
                             job: QuantumJob) -> float:
        """Calculate resource utilization score"""
        if not resources:
            return 0.0
        
        total_capacity = sum(r.capacity for r in resources)
        required_capacity = job.resource_requirements.get('num_qubits', 1)
        
        return min(required_capacity / total_capacity, 1.0)
    
    def _calculate_efficiency(self, resources: List[QuantumResource]) -> float:
        """Calculate resource efficiency"""
        if not resources:
            return 0.0
        
        avg_fidelity = np.mean([r.performance_metrics.get('fidelity', 0.0) for r in resources])
        avg_availability = np.mean([r.performance_metrics.get('availability', 0.0) for r in resources])
        
        return (avg_fidelity + avg_availability) / 2
    
    def get_scheduler_info(self) -> Dict[str, Any]:
        """Get scheduler information"""
        return {
            "name": "Priority-Based Scheduler",
            "algorithm": "Priority scoring with performance metrics",
            "optimization_criteria": ["priority", "performance", "cost", "availability"],
            "suitable_for": ["Small to medium jobs", "Priority-sensitive workloads"]
        }

class LoadBalancingScheduler(ResourceScheduler):
    """Load-balancing resource scheduler"""
    
    def __init__(self):
        self.algorithm_name = "load_balancing"
    
    async def schedule_job(self, job: QuantumJob, 
                         available_resources: List[QuantumResource]) -> ResourceAllocation:
        """Schedule job with load balancing"""
        try:
            # Calculate current load on each resource
            resource_loads = self._calculate_resource_loads(available_resources)
            
            # Filter suitable resources
            suitable_resources = self._filter_suitable_resources(job, available_resources)
            
            if not suitable_resources:
                raise ValueError("No suitable resources available")
            
            # Sort by load (prefer less loaded resources)
            sorted_resources = sorted(suitable_resources,
                                    key=lambda r: resource_loads.get(r.resource_id, 0))
            
            # Select resources to balance load
            allocated_resources = self._select_balanced_resources(job, sorted_resources, resource_loads)
            
            # Calculate timing and cost
            start_time = self._calculate_start_time(job, allocated_resources)
            end_time = start_time + timedelta(hours=job.estimated_duration)
            total_cost = sum(r.cost_per_hour * job.estimated_duration for r in allocated_resources)
            utilization_score = self._calculate_utilization(allocated_resources, job)
            
            return ResourceAllocation(
                allocation_id=f"lb_alloc_{job.job_id}_{datetime.now().timestamp()}",
                job_id=job.job_id,
                allocated_resources=allocated_resources,
                start_time=start_time,
                end_time=end_time,
                total_cost=total_cost,
                utilization_score=utilization_score,
                optimization_metrics={
                    'load_balance_score': self._calculate_load_balance(resource_loads),
                    'resource_efficiency': self._calculate_efficiency(allocated_resources),
                    'cost_efficiency': total_cost / (job.estimated_duration + 0.001)
                }
            )
            
        except Exception as e:
            logger.error(f"Load-balancing scheduling failed: {str(e)}")
            raise
    
    def _calculate_resource_loads(self, resources: List[QuantumResource]) -> Dict[str, float]:
        """Calculate current load on each resource"""
        loads = {}
        
        for resource in resources:
            # Simplified load calculation
            # In practice, would track actual job assignments
            base_load = resource.performance_metrics.get('current_load', 0.0)
            availability_factor = 1.0 - resource.performance_metrics.get('availability', 0.0)
            
            loads[resource.resource_id] = base_load + availability_factor
        
        return loads
    
    def _filter_suitable_resources(self, job: QuantumJob, 
                                resources: List[QuantumResource]) -> List[QuantumResource]:
        """Filter suitable resources (same as priority scheduler)"""
        return PriorityBasedScheduler()._filter_suitable_resources(job, resources)
    
    def _select_balanced_resources(self, job: QuantumJob, 
                                 sorted_resources: List[QuantumResource],
                                 loads: Dict[str, float]) -> List[QuantumResource]:
        """Select resources to balance load"""
        allocated = []
        
        # Select least loaded suitable resource
        if sorted_resources:
            allocated.append(sorted_resources[0])
        
        return allocated
    
    def _calculate_start_time(self, job: QuantumJob, 
                            resources: List[QuantumResource]) -> datetime:
        """Calculate start time considering load"""
        return datetime.now()
    
    def _calculate_utilization(self, resources: List[QuantumResource], 
                             job: QuantumJob) -> float:
        """Calculate utilization score"""
        return PriorityBasedScheduler()._calculate_utilization(resources, job)
    
    def _calculate_efficiency(self, resources: List[QuantumResource]) -> float:
        """Calculate efficiency"""
        return PriorityBasedScheduler()._calculate_efficiency(resources)
    
    def _calculate_load_balance(self, loads: Dict[str, float]) -> float:
        """Calculate load balance score"""
        if not loads:
            return 0.0
        
        load_values = list(loads.values())
        mean_load = np.mean(load_values)
        std_load = np.std(load_values)
        
        # Lower standard deviation means better balance
        balance_score = 1.0 - (std_load / (mean_load + 0.001))
        return max(0.0, balance_score)
    
    def get_scheduler_info(self) -> Dict[str, Any]:
        """Get scheduler information"""
        return {
            "name": "Load-Balancing Scheduler",
            "algorithm": "Load-aware resource allocation",
            "optimization_criteria": ["load balance", "resource utilization", "fairness"],
            "suitable_for": ["High-throughput workloads", "Resource sharing"]
        }

class QuantumResourceManager:
    """Main quantum resource manager"""
    
    def __init__(self):
        self.resources: Dict[str, QuantumResource] = {}
        self.jobs: Dict[str, QuantumJob] = {}
        self.allocations: Dict[str, ResourceAllocation] = {}
        self.schedulers: Dict[str, ResourceScheduler] = {}
        self.resource_usage_history: List[Dict[str, Any]] = []
        
        # Register default schedulers
        self.schedulers["priority"] = PriorityBasedScheduler()
        self.schedulers["load_balancing"] = LoadBalancingScheduler()
        
        # Initialize with some default resources
        self._initialize_default_resources()
    
    def _initialize_default_resources(self):
        """Initialize default quantum resources"""
        # IBM Quantum resources
        self.add_resource(QuantumResource(
            resource_id="ibmq_quito",
            resource_type=QuantumResourceType.QUANTUM_PROCESSOR,
            name="IBM Quito",
            capacity=5,
            performance_metrics={"fidelity": 0.95, "availability": 0.85, "current_load": 0.3},
            location="New York",
            provider="IBM",
            status=ResourceStatus.AVAILABLE,
            cost_per_hour=50.0,
            specifications={"gate_set": ["u1", "u2", "u3", "cx"], "topology": "linear"},
            availability_schedule={}
        ))
        
        # Google Quantum resources
        self.add_resource(QuantumResource(
            resource_id="google_sycamore",
            resource_type=QuantumResourceType.QUANTUM_PROCESSOR,
            name="Sycamore",
            capacity=54,
            performance_metrics={"fidelity": 0.98, "availability": 0.90, "current_load": 0.5},
            location="California",
            provider="Google",
            status=ResourceStatus.AVAILABLE,
            cost_per_hour=100.0,
            specifications={"gate_set": ["h", "x", "y", "z", "rx", "ry", "rz", "cx"], "topology": "grid"},
            availability_schedule={}
        ))
        
        # Quantum simulators
        self.add_resource(QuantumResource(
            resource_id="simulator_32q",
            resource_type=QuantumResourceType.QUANTUM_SIMULATOR,
            name="32-Qubit Simulator",
            capacity=32,
            performance_metrics={"fidelity": 1.0, "availability": 1.0, "current_load": 0.1},
            location="Cloud",
            provider="Local",
            status=ResourceStatus.AVAILABLE,
            cost_per_hour=5.0,
            specifications={"perfect_simulation": True},
            availability_schedule={}
        ))
    
    def add_resource(self, resource: QuantumResource):
        """Add quantum resource"""
        self.resources[resource.resource_id] = resource
        logger.info(f"Added quantum resource: {resource.resource_id}")
    
    def remove_resource(self, resource_id: str):
        """Remove quantum resource"""
        if resource_id in self.resources:
            del self.resources[resource_id]
            logger.info(f"Removed quantum resource: {resource_id}")
    
    def register_scheduler(self, name: str, scheduler: ResourceScheduler):
        """Register resource scheduler"""
        self.schedulers[name] = scheduler
        logger.info(f"Registered scheduler: {name}")
    
    def submit_job(self, job: QuantumJob) -> str:
        """Submit quantum job"""
        job.created_at = datetime.now()
        self.jobs[job.job_id] = job
        logger.info(f"Submitted quantum job: {job.job_id}")
        return job.job_id
    
    async def schedule_job(self, job_id: str, scheduler_name: str = "priority") -> ResourceAllocation:
        """Schedule job using specified scheduler"""
        if job_id not in self.jobs:
            raise ValueError(f"Job {job_id} not found")
        
        if scheduler_name not in self.schedulers:
            raise ValueError(f"Scheduler {scheduler_name} not available")
        
        job = self.jobs[job_id]
        scheduler = self.schedulers[scheduler_name]
        available_resources = [r for r in self.resources.values() if r.status == ResourceStatus.AVAILABLE]
        
        allocation = await scheduler.schedule_job(job, available_resources)
        
        # Update job status
        job.status = "scheduled"
        job.started_at = allocation.start_time
        job.assigned_resources = [r.resource_id for r in allocation.allocated_resources]
        
        # Update resource status
        for resource in allocation.allocated_resources:
            resource.status = ResourceStatus.BUSY
        
        self.allocations[allocation.allocation_id] = allocation
        
        logger.info(f"Scheduled job {job_id} using {scheduler_name}")
        return allocation
    
    def complete_job(self, job_id: str):
        """Mark job as completed"""
        if job_id not in self.jobs:
            raise ValueError(f"Job {job_id} not found")
        
        job = self.jobs[job_id]
        job.status = "completed"
        job.completed_at = datetime.now()
        
        # Release resources
        if job.assigned_resources:
            for resource_id in job.assigned_resources:
                if resource_id in self.resources:
                    self.resources[resource_id].status = ResourceStatus.AVAILABLE
        
        logger.info(f"Completed job: {job_id}")
    
    def get_resource_info(self, resource_id: str) -> Dict[str, Any]:
        """Get resource information"""
        if resource_id not in self.resources:
            return {}
        
        resource = self.resources[resource_id]
        return {
            'resource_id': resource.resource_id,
            'resource_type': resource.resource_type.value,
            'name': resource.name,
            'capacity': resource.capacity,
            'status': resource.status.value,
            'provider': resource.provider,
            'location': resource.location,
            'cost_per_hour': resource.cost_per_hour,
            'performance_metrics': resource.performance_metrics,
            'specifications': resource.specifications
        }
    
    def get_job_info(self, job_id: str) -> Dict[str, Any]:
        """Get job information"""
        if job_id not in self.jobs:
            return {}
        
        job = self.jobs[job_id]
        return {
            'job_id': job.job_id,
            'user_id': job.user_id,
            'priority': job.priority,
            'status': job.status,
            'created_at': job.created_at.isoformat() if job.created_at else None,
            'started_at': job.started_at.isoformat() if job.started_at else None,
            'completed_at': job.completed_at.isoformat() if job.completed_at else None,
            'estimated_duration': job.estimated_duration,
            'assigned_resources': job.assigned_resources,
            'resource_requirements': job.resource_requirements
        }
    
    def get_allocation_info(self, allocation_id: str) -> Dict[str, Any]:
        """Get allocation information"""
        if allocation_id not in self.allocations:
            return {}
        
        allocation = self.allocations[allocation_id]
        return {
            'allocation_id': allocation.allocation_id,
            'job_id': allocation.job_id,
            'allocated_resources': [r.resource_id for r in allocation.allocated_resources],
            'start_time': allocation.start_time.isoformat(),
            'end_time': allocation.end_time.isoformat(),
            'total_cost': allocation.total_cost,
            'utilization_score': allocation.utilization_score,
            'optimization_metrics': allocation.optimization_metrics
        }
    
    def list_resources(self, resource_type: Optional[QuantumResourceType] = None,
                       status: Optional[ResourceStatus] = None) -> List[Dict[str, Any]]:
        """List resources with optional filtering"""
        resources = []
        
        for resource in self.resources.values():
            if resource_type and resource.resource_type != resource_type:
                continue
            if status and resource.status != status:
                continue
            
            resources.append(self.get_resource_info(resource.resource_id))
        
        return resources
    
    def list_jobs(self, status: Optional[str] = None, 
                  user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List jobs with optional filtering"""
        jobs = []
        
        for job in self.jobs.values():
            if status and job.status != status:
                continue
            if user_id and job.user_id != user_id:
                continue
            
            jobs.append(self.get_job_info(job.job_id))
        
        return jobs
    
    def get_resource_utilization(self) -> Dict[str, Any]:
        """Get overall resource utilization statistics"""
        total_resources = len(self.resources)
        available_resources = sum(1 for r in self.resources.values() if r.status == ResourceStatus.AVAILABLE)
        busy_resources = sum(1 for r in self.resources.values() if r.status == ResourceStatus.BUSY)
        
        total_capacity = sum(r.capacity for r in self.resources.values())
        used_capacity = sum(r.capacity for r in self.resources.values() if r.status == ResourceStatus.BUSY)
        
        return {
            'total_resources': total_resources,
            'available_resources': available_resources,
            'busy_resources': busy_resources,
            'utilization_rate': used_capacity / total_capacity if total_capacity > 0 else 0,
            'total_capacity': total_capacity,
            'used_capacity': used_capacity
        }
    
    def get_scheduler_info(self, scheduler_name: str) -> Dict[str, Any]:
        """Get scheduler information"""
        if scheduler_name not in self.schedulers:
            return {}
        
        return self.schedulers[scheduler_name].get_scheduler_info()
    
    def get_available_schedulers(self) -> List[str]:
        """Get list of available schedulers"""
        return list(self.schedulers.keys())

# Initialize quantum resource manager
quantum_resource_manager = QuantumResourceManager()
