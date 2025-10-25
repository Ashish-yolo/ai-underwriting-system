import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Policies', path: '/policies', icon: '📋' },
    { name: 'Connectors', path: '/connectors', icon: '🔌' },
    { name: 'Manual Review', path: '/manual-review', icon: '👥' },
    { name: 'Analytics', path: '/analytics', icon: '📈' },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-2xl font-bold text-primary-600">
                  AI Underwriting System
                </h1>
              </div>
            </div>

            <div className="flex items-center">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {user?.name} ({user?.role})
                </span>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Side Navigation + Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md min-h-[calc(100vh-4rem)]">
          <nav className="mt-5 px-2">
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  group flex items-center px-4 py-3 text-sm font-medium rounded-md mb-1
                  ${
                    isActive(item.path)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
