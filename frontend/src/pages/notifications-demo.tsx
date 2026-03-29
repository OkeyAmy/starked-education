import React from 'react';
import { NotificationCenter } from '../components/Notifications';
import { WalletConnector } from '../components/Wallet/WalletConnector';
import { TransactionDemo } from '../components/Wallet/TransactionDemo';

const NotificationsDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 py-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-indigo-100 shadow-lg">
                S
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
                StarkEd
              </h1>
            </div>
            
            <div className="flex items-center gap-6">
              <WalletConnector />
              <div className="h-6 w-px bg-gray-200" />
              <NotificationCenter />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-6 bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
            Wallet Integration & Notification Demo
          </h2>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Welcome to the StarkEd frontend demo. Use the connect button in the 
            top right to link your Stellar wallet and try out the new 
            notification system.
          </p>

          <TransactionDemo />

          {/* Demo Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto mt-20">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300 group">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-600 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                <span className="text-blue-600 font-bold text-3xl transition-colors">🔔</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Real-time</h3>
              <p className="text-gray-500 leading-relaxed">
                Stay updated with instant push notifications for all activities
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300 group">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-green-600 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                <span className="text-green-600 font-bold text-3xl transition-colors">📂</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Categorized</h3>
              <p className="text-gray-500 leading-relaxed">
                Smart filtering for courses, messages, and system alerts
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300 group">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-600 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                <span className="text-purple-600 font-bold text-3xl transition-colors">⚙️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Customized</h3>
              <p className="text-gray-500 leading-relaxed">
                Personalized settings to manage your notification flow
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300 group">
              <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-yellow-600 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                <span className="text-yellow-600 font-bold text-3xl transition-colors">📱</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Responsive</h3>
              <p className="text-gray-500 leading-relaxed">
                Optimized experience across desktop and mobile devices
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

          {/* Instructions */}
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="font-semibold text-blue-900 mb-3">How to Test:</h3>
            <ul className="text-left text-sm text-blue-800 space-y-2">
              <li>• Click the bell icon to open the notification center</li>
              <li>• Wait for automatic demo notifications (every 10 seconds)</li>
              <li>• Try filtering by different categories</li>
              <li>• Mark notifications as read or remove them</li>
              <li>• Open preferences to customize notification settings</li>
              <li>• Test quiet hours functionality</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotificationsDemo;
