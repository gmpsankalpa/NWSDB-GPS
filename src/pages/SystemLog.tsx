import { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, limit, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../lib/offices';
import { 
  FileText, 
  Search, 
  Filter, 
  Activity, 
  User, 
  CheckCircle, 
  AlertCircle,
  UserCheck,
  UserX,
  FileCheck,
  Edit,
  Trash2,
  Eye,
  Download,
  Shield,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import toast, { Toaster } from 'react-hot-toast';

interface LogEntry {
  id: string;
  timestamp: Timestamp;
  action: string;
  actionType: 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | 'status_change' | 'export' | 'other';
  userId: string;
  userName: string;
  userRole: string;
  userOffice: string;
  targetId?: string;
  targetType?: 'application' | 'user' | 'review' | 'system';
  details: string;
  metadata?: any;
}

const SystemLog = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [officeFilter, setOfficeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // today, week, month, all
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Only Regional Engineers and Developers can view system logs
    if (user.role !== ROLES.REGIONAL_ENGINEER && user.role !== ROLES.DEVELOPER) {
      toast.error('Access denied: You do not have permission to view system logs');
      return;
    }

    const q = query(
      collection(db, 'systemLogs'),
      orderBy('timestamp', 'desc'),
      limit(500) // Load last 500 log entries
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LogEntry[];
        setLogs(logData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching logs:', error);
        toast.error('Failed to load system logs');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Filter logs based on search and filters
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !log.action.toLowerCase().includes(query) &&
          !log.userName.toLowerCase().includes(query) &&
          !log.details.toLowerCase().includes(query) &&
          !log.userOffice.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Action type filter
      if (actionTypeFilter !== 'all' && log.actionType !== actionTypeFilter) {
        return false;
      }

      // Office filter
      if (officeFilter !== 'all' && log.userOffice !== officeFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const logDate = log.timestamp.toDate();
        const now = new Date();
        const dayInMs = 24 * 60 * 60 * 1000;

        if (dateFilter === 'today') {
          const startOfDay = new Date(now.setHours(0, 0, 0, 0));
          if (logDate < startOfDay) return false;
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * dayInMs);
          if (logDate < weekAgo) return false;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * dayInMs);
          if (logDate < monthAgo) return false;
        }
      }

      return true;
    });
  }, [logs, searchQuery, actionTypeFilter, officeFilter, dateFilter]);

  // Get unique offices for filter
  const offices = useMemo(() => {
    const uniqueOffices = new Set(logs.map(log => log.userOffice));
    return Array.from(uniqueOffices).sort();
  }, [logs]);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create': return <FileCheck className="text-green-600" size={18} />;
      case 'update': return <Edit className="text-blue-600" size={18} />;
      case 'delete': return <Trash2 className="text-red-600" size={18} />;
      case 'view': return <Eye className="text-gray-600" size={18} />;
      case 'login': return <UserCheck className="text-green-600" size={18} />;
      case 'logout': return <UserX className="text-gray-600" size={18} />;
      case 'status_change': return <Activity className="text-orange-600" size={18} />;
      case 'export': return <Download className="text-purple-600" size={18} />;
      default: return <AlertCircle className="text-gray-600" size={18} />;
    }
  };

  const getActionBadgeColor = (actionType: string) => {
    switch (actionType) {
      case 'create': return 'bg-green-100 text-green-700 border-green-200';
      case 'update': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'delete': return 'bg-red-100 text-red-700 border-red-200';
      case 'view': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'login': return 'bg-green-100 text-green-700 border-green-200';
      case 'logout': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'status_change': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'export': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="animate-spin mx-auto mb-4 text-blue-600" size={32} />
            <p className="text-gray-600">Loading system logs...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 sm:p-6 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Activity size={22} className="sm:w-7 sm:h-7 flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">System Activity Log</h1>
          </div>
          <p className="text-slate-300 text-xs sm:text-sm">
            Real-time tracking of all system activities and user actions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 active:scale-[0.98] transition cursor-pointer">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <FileText className="text-blue-600" size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">Total Logs</p>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 truncate">{logs.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 active:scale-[0.98] transition cursor-pointer">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                <CheckCircle className="text-green-600" size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">Creates</p>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 truncate">
                  {logs.filter(l => l.actionType === 'create').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 active:scale-[0.98] transition cursor-pointer">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg flex-shrink-0">
                <Edit className="text-orange-600" size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">Updates</p>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 truncate">
                  {logs.filter(l => l.actionType === 'update' || l.actionType === 'status_change').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 active:scale-[0.98] transition cursor-pointer">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
                <User className="text-purple-600" size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">User Actions</p>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 truncate">
                  {logs.filter(l => l.actionType === 'login' || l.actionType === 'logout').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 flex-shrink-0" size={16} />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>

            {/* Action Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 flex-shrink-0 pointer-events-none" size={16} />
              <select
                value={actionTypeFilter}
                onChange={(e) => setActionTypeFilter(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white text-base"
              >
                <option value="all">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="view">View</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="status_change">Status Change</option>
                <option value="export">Export</option>
              </select>
            </div>

            {/* Office Filter */}
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 flex-shrink-0 pointer-events-none" size={16} />
              <select
                value={officeFilter}
                onChange={(e) => setOfficeFilter(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white text-base"
              >
                <option value="all">All Offices</option>
                {offices.map(office => (
                  <option key={office} value={office}>{office}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 flex-shrink-0 pointer-events-none" size={16} />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white text-base"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchQuery || actionTypeFilter !== 'all' || officeFilter !== 'all' || dateFilter !== 'all') && (
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-gray-600">
                Showing {filteredLogs.length} of {logs.length} logs
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActionTypeFilter('all');
                  setOfficeFilter('all');
                  setDateFilter('all');
                }}
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium active:scale-95 transition"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Log Entries */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Activity className="mx-auto mb-3 sm:mb-4 text-gray-400" size={40} />
              <p className="text-gray-600 font-medium text-sm sm:text-base">No logs found</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 sm:p-4 hover:bg-gray-50 active:bg-gray-100 transition"
                >
                  <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                    {/* Icon */}
                    <div className="mt-0.5 sm:mt-1 flex-shrink-0">
                      {getActionIcon(log.actionType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 sm:gap-4 mb-1 sm:mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-gray-900 text-xs sm:text-sm truncate">{log.userName}</span>
                            <span className={cn(
                              'text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full border font-medium flex-shrink-0',
                              getActionBadgeColor(log.actionType)
                            )}>
                              {log.actionType.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap text-[10px] sm:text-xs text-gray-600 mb-1">
                            <span className="truncate">{log.userOffice}</span>
                            <span className="text-gray-400">•</span>
                            <span className="truncate">{log.userRole}</span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-700 break-words">{log.action}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500 mt-1 break-words">{log.details}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(log.timestamp.toDate())}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1 whitespace-nowrap">
                            {log.timestamp.toDate().toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      {/* Expandable metadata */}
                      {log.metadata && (
                        <div>
                          <button
                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                            className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-1.5 sm:mt-2 active:scale-95 transition"
                          >
                            {expandedLog === log.id ? (
                              <>
                                <ChevronUp size={12} className="sm:w-[14px] sm:h-[14px] flex-shrink-0" />
                                <span>Hide details</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown size={12} className="sm:w-[14px] sm:h-[14px] flex-shrink-0" />
                                <span>Show details</span>
                              </>
                            )}
                          </button>
                          
                          {expandedLog === log.id && (
                            <div className="mt-2 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <pre className="text-[10px] sm:text-xs text-gray-700 whitespace-pre-wrap font-mono break-words overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Note */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-2 sm:gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-xs sm:text-sm font-medium text-blue-900">System Log Information</p>
              <p className="text-[10px] sm:text-xs text-blue-700 mt-1">
                This log shows the last 500 system activities. Logs are stored permanently and can be used for auditing and troubleshooting.
                Only Regional Engineers and Developers have access to view system logs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SystemLog;
