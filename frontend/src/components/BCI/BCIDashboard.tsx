import React, { useState } from 'react';
import { Brain, Activity, Settings, BarChart3, Navigation, Eye, Target, Zap, Menu, X } from 'lucide-react';
import { CognitiveDashboard } from './CognitiveDashboard';
import { HandsFreeNavigation } from './HandsFreeNavigation';
import { AttentionTracker } from './AttentionTracker';
import { AdaptiveDifficulty } from './AdaptiveDifficulty';
import { NeurofeedbackTraining } from './NeurofeedbackTraining';

type TabType = 'dashboard' | 'navigation' | 'attention' | 'difficulty' | 'training';

interface TabConfig {
  id: TabType;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
}

export const BCIDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const tabs: TabConfig[] = [
    {
      id: 'dashboard',
      name: 'Cognitive Monitor',
      icon: Brain,
      description: 'Real-time cognitive state monitoring and analysis'
    },
    {
      id: 'navigation',
      name: 'Hands-Free Control',
      icon: Navigation,
      description: 'Navigate using brain signals and thoughts'
    },
    {
      id: 'attention',
      name: 'Attention Tracking',
      icon: Eye,
      description: 'Monitor attention and engagement levels'
    },
    {
      id: 'difficulty',
      name: 'Adaptive Learning',
      icon: Target,
      description: 'AI-powered difficulty adjustment'
    },
    {
      id: 'training',
      name: 'Neurofeedback',
      icon: Zap,
      description: 'Train your brain with neurofeedback exercises'
    }
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <CognitiveDashboard />;
      case 'navigation':
        return <HandsFreeNavigation />;
      case 'attention':
        return <AttentionTracker />;
      case 'difficulty':
        return <AdaptiveDifficulty />;
      case 'training':
        return <NeurofeedbackTraining />;
      default:
        return <CognitiveDashboard />;
    }
  };

  const getTabColor = (tabId: TabType): string => {
    if (activeTab === tabId) {
      return 'bg-purple-600 text-white';
    }
    return 'text-gray-700 hover:bg-purple-100 hover:text-purple-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-lg transition-all duration-300 ease-in-out`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-8">
              <div className={`flex items-center space-x-3 ${!isSidebarOpen && 'justify-center'}`}>
                <Brain className="w-8 h-8 text-purple-600" />
                {isSidebarOpen && (
                  <h1 className="text-xl font-bold text-gray-800">BCI System</h1>
                )}
              </div>
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>

            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${getTabColor(tab.id)}`}
                    title={!isSidebarOpen ? tab.name : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {isSidebarOpen && (
                      <div className="text-left">
                        <div className="font-medium">{tab.name}</div>
                        <div className="text-xs opacity-75">{tab.description}</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>

            {isSidebarOpen && (
              <div className="mt-8 p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-800 mb-2">System Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full" />
                    <span className="text-purple-700">BCI Service Active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full" />
                    <span className="text-purple-700">Device Detection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    <span className="text-purple-700">ML Models Ready</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center space-x-3">
                {(() => {
                  const activeTabConfig = tabs.find(tab => tab.id === activeTab);
                  if (!activeTabConfig) return null;
                  const Icon = activeTabConfig.icon;
                  return (
                    <>
                      <Icon className="w-8 h-8 text-purple-600" />
                      <div>
                        <h2 className="text-3xl font-bold text-gray-800">
                          {activeTabConfig.name}
                        </h2>
                        <p className="text-gray-600">
                          {activeTabConfig.description}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="space-y-6">
              {renderActiveTab()}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Bar */}
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 flex items-center space-x-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:bg-purple-100 hover:text-purple-700'
              }`}
              title={tab.name}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
