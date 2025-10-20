import React from 'react';
import Icon from '../AppIcon';

const TaskStatusIndicator = ({ 
  status = 'pending', 
  priority = 'medium', 
  dueDate = null, 
  showLabel = true, 
  size = 'default',
  interactive = false,
  onClick = null 
}) => {
  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        color: 'bg-warning text-warning-foreground',
        icon: 'Clock',
        label: 'Pending'
      },
      'in-progress': {
        color: 'bg-accent text-accent-foreground',
        icon: 'Play',
        label: 'In Progress'
      },
      completed: {
        color: 'bg-success text-success-foreground',
        icon: 'CheckCircle',
        label: 'Completed'
      },
      overdue: {
        color: 'bg-error text-error-foreground',
        icon: 'AlertTriangle',
        label: 'Overdue'
      },
      cancelled: {
        color: 'bg-muted text-muted-foreground',
        icon: 'X',
        label: 'Cancelled'
      }
    };
    return configs?.[status] || configs?.pending;
  };

  const getPriorityConfig = (priority) => {
    const configs = {
      low: {
        color: 'border-l-success',
        icon: 'ArrowDown',
        label: 'Low Priority'
      },
      medium: {
        color: 'border-l-warning',
        icon: 'Minus',
        label: 'Medium Priority'
      },
      high: {
        color: 'border-l-error',
        icon: 'ArrowUp',
        label: 'High Priority'
      },
      urgent: {
        color: 'border-l-error animate-pulse-subtle',
        icon: 'Zap',
        label: 'Urgent'
      }
    };
    return configs?.[priority] || configs?.medium;
  };

  const isOverdue = () => {
    if (!dueDate) return false;
    const now = new Date();
    const due = new Date(dueDate);
    return due < now && status !== 'completed';
  };

  const statusConfig = getStatusConfig(isOverdue() ? 'overdue' : status);
  const priorityConfig = getPriorityConfig(priority);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    default: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 12,
    default: 14,
    lg: 16
  };

  const formatDueDate = (date) => {
    if (!date) return null;
    const due = new Date(date);
    const now = new Date();
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return due?.toLocaleDateString();
    }
  };

  const handleClick = () => {
    if (interactive && onClick) {
      onClick(status);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Priority Indicator */}
      <div className={`w-1 h-6 rounded-full ${priorityConfig?.color}`} title={priorityConfig?.label}></div>
      {/* Status Badge */}
      <div
        className={`
          inline-flex items-center space-x-1.5 rounded-full font-medium transition-micro
          ${statusConfig?.color} ${sizeClasses?.[size]}
          ${interactive ? 'cursor-pointer hover:shadow-elevation hover-lift focus-ring' : ''}
          ${isOverdue() ? 'animate-bounce-gentle' : ''}
        `}
        onClick={handleClick}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={interactive ? (e) => e?.key === 'Enter' && handleClick() : undefined}
      >
        <Icon name={statusConfig?.icon} size={iconSizes?.[size]} />
        {showLabel && <span>{statusConfig?.label}</span>}
      </div>
      {/* Due Date */}
      {dueDate && (
        <div className={`
          text-xs font-mono px-2 py-1 rounded border
          ${isOverdue() 
            ? 'text-error border-error bg-error/10' :'text-muted-foreground border-border bg-muted/50'
          }
        `}>
          {formatDueDate(dueDate)}
        </div>
      )}
    </div>
  );
};

export default TaskStatusIndicator;