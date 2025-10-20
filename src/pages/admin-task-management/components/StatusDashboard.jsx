import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import DepartmentFilter from '../../../components/ui/DepartmentFilter';
import NotificationBadge from '../../../components/ui/NotificationBadge';

const StatusDashboard = ({ tasks = [], selectedDepartments = [], onDepartmentChange = () => {} }) => {
  const [refreshTime, setRefreshTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Calculate task statistics
  const getTaskStats = () => {
    const filteredTasks = selectedDepartments?.length === 0 
      ? tasks 
      : tasks?.filter(task => selectedDepartments?.includes(task?.department));

    const now = new Date();
    
    const stats = {
      total: filteredTasks?.length,
      pending: filteredTasks?.filter(task => task?.status === 'pending')?.length,
      inProgress: filteredTasks?.filter(task => task?.status === 'in-progress')?.length,
      completed: filteredTasks?.filter(task => task?.status === 'completed')?.length,
      overdue: filteredTasks?.filter(task => {
        const dueDate = new Date(task.dueDateTime);
        return dueDate < now && task?.status !== 'completed';
      })?.length,
      dueToday: filteredTasks?.filter(task => {
        const dueDate = new Date(task.dueDateTime);
        const today = new Date();
        return dueDate?.toDateString() === today?.toDateString() && task?.status !== 'completed';
      })?.length,
      highPriority: filteredTasks?.filter(task => 
        ['high', 'urgent']?.includes(task?.priority) && task?.status !== 'completed'
      )?.length
    };

    return stats;
  };

  const stats = getTaskStats();

  // Department-wise breakdown
  const getDepartmentStats = () => {
    const departments = {};
    
    tasks?.forEach(task => {
      if (!departments?.[task?.department]) {
        departments[task.department] = {
          total: 0,
          completed: 0,
          overdue: 0
        };
      }
      
      departments[task.department].total++;
      
      if (task?.status === 'completed') {
        departments[task.department].completed++;
      }
      
      const dueDate = new Date(task.dueDateTime);
      const now = new Date();
      if (dueDate < now && task?.status !== 'completed') {
        departments[task.department].overdue++;
      }
    });

    return departments;
  };

  const departmentStats = getDepartmentStats();

  const StatCard = ({ title, value, icon, color = 'text-foreground', bgColor = 'bg-muted/30', badge = null, trend = null }) => (
    <div className={`${bgColor} border border-border rounded-lg p-4 transition-micro hover:shadow-elevation hover-lift`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color?.includes('error') ? 'bg-error/10' : color?.includes('success') ? 'bg-success/10' : color?.includes('warning') ? 'bg-warning/10' : 'bg-accent/10'}`}>
          <Icon name={icon} size={16} className={color} />
        </div>
        {badge && (
          <NotificationBadge 
            count={badge} 
            variant={color?.includes('error') ? 'default' : color?.includes('warning') ? 'warning' : 'accent'} 
            size="sm"
          />
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
        {trend && (
          <div className="flex items-center space-x-1 text-xs">
            <Icon name={trend?.direction === 'up' ? 'TrendingUp' : 'TrendingDown'} size={12} className={trend?.direction === 'up' ? 'text-success' : 'text-error'} />
            <span className={trend?.direction === 'up' ? 'text-success' : 'text-error'}>
              {trend?.value}% from yesterday
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const formatLastUpdate = () => {
    return refreshTime?.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Task Overview</h2>
          <p className="text-sm text-muted-foreground">
            Real-time status monitoring • Last updated: {formatLastUpdate()}
          </p>
        </div>
        <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-micro hover-lift focus-ring">
          <Icon name="RefreshCw" size={16} />
        </button>
      </div>
      {/* Department Filter */}
      <DepartmentFilter
        selectedDepartments={selectedDepartments}
        onChange={onDepartmentChange}
        userRole="admin"
      />
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tasks"
          value={stats?.total}
          icon="CheckSquare"
          color="text-accent"
          bgColor="bg-card"
        />
        
        <StatCard
          title="Overdue"
          value={stats?.overdue}
          icon="AlertTriangle"
          color="text-error"
          bgColor="bg-card"
          badge={stats?.overdue > 0 ? stats?.overdue : null}
          trend={{ direction: 'down', value: 12 }}
        />
        
        <StatCard
          title="Due Today"
          value={stats?.dueToday}
          icon="Clock"
          color="text-warning"
          bgColor="bg-card"
          badge={stats?.dueToday > 0 ? stats?.dueToday : null}
        />
        
        <StatCard
          title="Completed"
          value={stats?.completed}
          icon="CheckCircle"
          color="text-success"
          bgColor="bg-card"
          trend={{ direction: 'up', value: 8 }}
        />
      </div>
      {/* Status Breakdown */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-medium text-foreground mb-4">Status Distribution</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="Clock" size={16} className="text-warning" />
              <span className="text-sm font-medium text-foreground">Pending</span>
            </div>
            <span className="text-lg font-bold text-warning">{stats?.pending}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="Play" size={16} className="text-accent" />
              <span className="text-sm font-medium text-foreground">In Progress</span>
            </div>
            <span className="text-lg font-bold text-accent">{stats?.inProgress}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="CheckCircle" size={16} className="text-success" />
              <span className="text-sm font-medium text-foreground">Completed</span>
            </div>
            <span className="text-lg font-bold text-success">{stats?.completed}</span>
          </div>
        </div>
      </div>
      {/* Department Performance */}
      {Object.keys(departmentStats)?.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-lg font-medium text-foreground mb-4">Department Performance</h3>
          
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {Object.entries(departmentStats)?.map(([dept, data]) => {
              const completionRate = data?.total > 0 ? Math.round((data?.completed / data?.total) * 100) : 0;
              
              return (
                <div key={dept} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-micro">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground capitalize">
                        {dept?.replace('-', ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {completionRate}% complete
                      </span>
                    </div>
                    
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-accent h-2 rounded-full transition-all duration-300"
                        style={{ width: `${completionRate}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                      <span>{data?.completed}/{data?.total} tasks</span>
                      {data?.overdue > 0 && (
                        <span className="text-error font-medium">
                          {data?.overdue} overdue
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Quick Actions */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Quick Actions</h3>
        
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center space-x-2 p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-micro">
            <Icon name="Download" size={14} />
            <span>Export Report</span>
          </button>
          
          <button className="flex items-center space-x-2 p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-micro">
            <Icon name="Bell" size={14} />
            <span>Send Reminders</span>
          </button>
          
          <button className="flex items-center space-x-2 p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-micro">
            <Icon name="Calendar" size={14} />
            <span>Schedule Review</span>
          </button>
          
          <button className="flex items-center space-x-2 p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-micro">
            <Icon name="Settings" size={14} />
            <span>Manage Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusDashboard;