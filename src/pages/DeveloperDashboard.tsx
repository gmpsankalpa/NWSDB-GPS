import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { 
  Code, 
  Database, 
  Users, 
  FileText, 
  Activity, 
  MessageSquare,
  TrendingUp,
  Server,
  GitBranch
} from 'lucide-react';
import { ROLES } from '../lib/offices';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const DeveloperDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalApplications: 0,
    totalUsers: 0,
    totalReviews: 0,
    activeUsers: 0,
    blockedUsers: 0,
    pendingApplications: 0,
    connectedApplications: 0,
    rejectedApplications: 0
  });
  const [loading, setLoading] = useState(true);

  // Redirect if not developer
  useEffect(() => {
    if (user && user.role !== ROLES.DEVELOPER) {
      toast.error('Access denied. Developer only.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch all statistics
  useEffect(() => {
    if (!user || user.role !== ROLES.DEVELOPER) return;

    const fetchStats = async () => {
      try {
        // Applications
        const appsSnapshot = await getDocs(collection(db, 'applications'));
        const applications = appsSnapshot.docs.map(doc => doc.data());
        
        // Users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = usersSnapshot.docs.map(doc => doc.data());
        
        // Reviews
        const reviewsSnapshot = await getDocs(collection(db, 'customerReviews'));
        
        setStats({
          totalApplications: applications.length,
          totalUsers: users.length,
          totalReviews: reviewsSnapshot.size,
          activeUsers: users.filter((u: any) => !u.blocked).length,
          blockedUsers: users.filter((u: any) => u.blocked).length,
          pendingApplications: applications.filter((a: any) => 
            !['Connected', 'Rejected'].includes(a.status)
          ).length,
          connectedApplications: applications.filter((a: any) => a.status === 'Connected').length,
          rejectedApplications: applications.filter((a: any) => a.status === 'Rejected').length
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        toast.error('Error loading statistics');
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <Code className="text-blue-600 flex-shrink-0" size={24} />
              <span className="truncate">Developer Dashboard</span>
            </h1>
            <p className="text-gray-600 mt-0.5 sm:mt-1 text-xs sm:text-sm lg:text-base">System monitoring and analytics</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {/* Applications */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6 shadow-lg active:scale-[0.98] transition cursor-pointer">
            <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
              <FileText size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8 flex-shrink-0" />
              <TrendingUp size={16} className="opacity-80 sm:w-5 sm:h-5 flex-shrink-0" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">{stats.totalApplications}</h3>
            <p className="text-blue-100 text-sm sm:text-base">Total Applications</p>
            <div className="mt-2 sm:mt-3 lg:mt-4 pt-2 sm:pt-3 lg:pt-4 border-t border-blue-400 flex justify-between text-xs sm:text-sm gap-2">
              <span className="truncate">Pending: {stats.pendingApplications}</span>
              <span className="truncate">Connected: {stats.connectedApplications}</span>
            </div>
          </div>

          {/* Users */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6 shadow-lg active:scale-[0.98] transition cursor-pointer">
            <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
              <Users size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8 flex-shrink-0" />
              <Activity size={16} className="opacity-80 sm:w-5 sm:h-5 flex-shrink-0" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">{stats.totalUsers}</h3>
            <p className="text-purple-100 text-sm sm:text-base">Total Users</p>
            <div className="mt-2 sm:mt-3 lg:mt-4 pt-2 sm:pt-3 lg:pt-4 border-t border-purple-400 flex justify-between text-xs sm:text-sm gap-2">
              <span className="truncate">Active: {stats.activeUsers}</span>
              <span className="truncate">Blocked: {stats.blockedUsers}</span>
            </div>
          </div>

          {/* Reviews */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6 shadow-lg active:scale-[0.98] transition cursor-pointer">
            <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
              <MessageSquare size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8 flex-shrink-0" />
              <TrendingUp size={16} className="opacity-80 sm:w-5 sm:h-5 flex-shrink-0" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">{stats.totalReviews}</h3>
            <p className="text-green-100 text-sm sm:text-base">Customer Reviews</p>
            <div className="mt-2 sm:mt-3 lg:mt-4 pt-2 sm:pt-3 lg:pt-4 border-t border-green-400 text-xs sm:text-sm">
              Public feedback submissions
            </div>
          </div>

          {/* Database Status */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6 shadow-lg active:scale-[0.98] transition cursor-pointer">
            <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
              <Database size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8 flex-shrink-0" />
              <Server size={16} className="opacity-80 sm:w-5 sm:h-5 flex-shrink-0" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Firebase</h3>
            <p className="text-orange-100 text-sm sm:text-base">Database Status</p>
            <div className="mt-2 sm:mt-3 lg:mt-4 pt-2 sm:pt-3 lg:pt-4 border-t border-orange-400 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse flex-shrink-0"></div>
              <span>Connected & Active</span>
            </div>
          </div>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          {/* Collections Status */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border p-4 sm:p-5 lg:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
              <Database className="text-blue-600 flex-shrink-0" size={16} />
              <span>Firestore Collections</span>
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <FileText size={14} className="text-blue-600 flex-shrink-0 sm:w-[18px] sm:h-[18px]" />
                  <span className="font-medium text-sm sm:text-base truncate">applications</span>
                </div>
                <span className="text-gray-600 text-xs sm:text-sm whitespace-nowrap">{stats.totalApplications} docs</span>
              </div>
              <div className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <Users size={14} className="text-purple-600 flex-shrink-0 sm:w-[18px] sm:h-[18px]" />
                  <span className="font-medium text-sm sm:text-base truncate">users</span>
                </div>
                <span className="text-gray-600 text-xs sm:text-sm whitespace-nowrap">{stats.totalUsers} docs</span>
              </div>
              <div className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <MessageSquare size={14} className="text-green-600 flex-shrink-0 sm:w-[18px] sm:h-[18px]" />
                  <span className="font-medium text-sm sm:text-base truncate">customerReviews</span>
                </div>
                <span className="text-gray-600 text-xs sm:text-sm whitespace-nowrap">{stats.totalReviews} docs</span>
              </div>
            </div>
          </div>

          {/* Quick Access */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border p-4 sm:p-5 lg:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
              <GitBranch className="text-blue-600 flex-shrink-0" size={16} />
              <span>Quick Access</span>
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={() => navigate('/users')}
                className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-purple-50 hover:bg-purple-100 active:scale-[0.98] rounded-lg transition text-left"
              >
                <Users className="text-purple-600 flex-shrink-0" size={16} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm sm:text-base truncate">User Management</p>
                  <p className="text-[10px] sm:text-xs text-gray-600">Manage system users</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/reports')}
                className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-blue-50 hover:bg-blue-100 active:scale-[0.98] rounded-lg transition text-left"
              >
                <FileText className="text-blue-600 flex-shrink-0" size={16} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm sm:text-base truncate">Reports</p>
                  <p className="text-[10px] sm:text-xs text-gray-600">View system reports</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/reviews')}
                className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-green-50 hover:bg-green-100 active:scale-[0.98] rounded-lg transition text-left"
              >
                <MessageSquare className="text-green-600 flex-shrink-0" size={16} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm sm:text-base truncate">Customer Reviews</p>
                  <p className="text-[10px] sm:text-xs text-gray-600">Monitor feedback</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Application Status Breakdown */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border p-4 sm:p-5 lg:p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
            <Activity className="text-blue-600 flex-shrink-0" size={16} />
            <span>Application Status Distribution</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs sm:text-sm text-yellow-700 font-medium mb-0.5 sm:mb-1">Pending</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-900">{stats.pendingApplications}</p>
              <p className="text-[10px] sm:text-xs text-yellow-600 mt-0.5 sm:mt-1">Awaiting processing</p>
            </div>
            <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs sm:text-sm text-green-700 font-medium mb-0.5 sm:mb-1">Connected</p>
              <p className="text-xl sm:text-2xl font-bold text-green-900">{stats.connectedApplications}</p>
              <p className="text-[10px] sm:text-xs text-green-600 mt-0.5 sm:mt-1">Successfully completed</p>
            </div>
            <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs sm:text-sm text-red-700 font-medium mb-0.5 sm:mb-1">Rejected</p>
              <p className="text-xl sm:text-2xl font-bold text-red-900">{stats.rejectedApplications}</p>
              <p className="text-[10px] sm:text-xs text-red-600 mt-0.5 sm:mt-1">Declined applications</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DeveloperDashboard;
