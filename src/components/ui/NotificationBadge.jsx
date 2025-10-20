import React, { useState, useEffect } from 'react';
import Icon from '../AppIcon';

const NotificationBadge = ({ 
  count = 0, 
  maxCount = 99, 
  showZero = false, 
  variant = 'default',
  size = 'default',
  position = 'top-right',
  pulse = false,
  onClick = null,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    setDisplayCount(count > maxCount ? maxCount : count);
    setIsVisible(count > 0 || showZero);
  }, [count, maxCount, showZero]);

  const getVariantStyles = (variant) => {
    const variants = {
      default: 'bg-error text-error-foreground',
      success: 'bg-success text-success-foreground',
      warning: 'bg-warning text-warning-foreground',
      accent: 'bg-accent text-accent-foreground',
      muted: 'bg-muted text-muted-foreground'
    };
    return variants?.[variant] || variants?.default;
  };

  const getSizeStyles = (size) => {
    const sizes = {
      sm: 'min-w-[16px] h-4 text-xs',
      default: 'min-w-[20px] h-5 text-xs',
      lg: 'min-w-[24px] h-6 text-sm'
    };
    return sizes?.[size] || sizes?.default;
  };

  const getPositionStyles = (position) => {
    const positions = {
      'top-right': '-top-1 -right-1',
      'top-left': '-top-1 -left-1',
      'bottom-right': '-bottom-1 -right-1',
      'bottom-left': '-bottom-1 -left-1',
      'center': 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
    };
    return positions?.[position] || positions?.['top-right'];
  };

  const formatCount = (count) => {
    if (count > maxCount) {
      return `${maxCount}+`;
    }
    return count?.toString();
  };

  const handleClick = (e) => {
    e?.stopPropagation();
    if (onClick) {
      onClick(count);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <span
      className={`
        absolute inline-flex items-center justify-center
        px-1 rounded-full font-medium transition-micro
        ${getVariantStyles(variant)}
        ${getSizeStyles(size)}
        ${getPositionStyles(position)}
        ${pulse ? 'animate-bounce-gentle' : ''}
        ${onClick ? 'cursor-pointer hover:scale-110 focus-ring' : ''}
        ${className}
      `}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e?.key === 'Enter' && handleClick(e) : undefined}
      title={`${count} notification${count !== 1 ? 's' : ''}`}
    >
      {displayCount === 0 && showZero ? (
        <Icon name="Dot" size={8} />
      ) : (
        formatCount(displayCount)
      )}
    </span>
  );
};

// Notification Badge with Icon wrapper component
export const NotificationIcon = ({ 
  iconName = 'Bell', 
  iconSize = 20, 
  badgeProps = {},
  className = '',
  ...props 
}) => {
  return (
    <div className={`relative inline-block ${className}`} {...props}>
      <Icon name={iconName} size={iconSize} />
      <NotificationBadge {...badgeProps} />
    </div>
  );
};

// Notification List Item component for detailed notifications
export const NotificationItem = ({ 
  title, 
  message, 
  timestamp, 
  type = 'info', 
  isRead = false, 
  onRead = null,
  onDismiss = null,
  className = ''
}) => {
  const getTypeIcon = (type) => {
    const icons = {
      info: 'Info',
      success: 'CheckCircle',
      warning: 'AlertTriangle',
      error: 'AlertCircle',
      task: 'CheckSquare',
      message: 'MessageSquare'
    };
    return icons?.[type] || icons?.info;
  };

  const getTypeColor = (type) => {
    const colors = {
      info: 'text-accent',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-error',
      task: 'text-primary',
      message: 'text-muted-foreground'
    };
    return colors?.[type] || colors?.info;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date?.toLocaleDateString();
  };

  return (
    <div
      className={`
        flex items-start space-x-3 p-4 border-b border-border last:border-b-0
        ${isRead ? 'bg-background' : 'bg-muted/30'}
        hover:bg-muted/50 transition-micro
        ${className}
      `}
    >
      {/* Type Icon */}
      <div className={`flex-shrink-0 mt-0.5 ${getTypeColor(type)}`}>
        <Icon name={getTypeIcon(type)} size={16} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className={`text-sm font-medium ${isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
              {title}
            </h4>
            {message && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {message}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              {formatTimestamp(timestamp)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 ml-2">
            {!isRead && onRead && (
              <button
                onClick={() => onRead()}
                className="p-1 text-muted-foreground hover:text-foreground transition-micro hover-lift focus-ring rounded"
                title="Mark as read"
              >
                <Icon name="Check" size={14} />
              </button>
            )}
            {onDismiss && (
              <button
                onClick={() => onDismiss()}
                className="p-1 text-muted-foreground hover:text-error transition-micro hover-lift focus-ring rounded"
                title="Dismiss"
              >
                <Icon name="X" size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Unread Indicator */}
      {!isRead && (
        <div className="flex-shrink-0 w-2 h-2 bg-accent rounded-full mt-2"></div>
      )}
    </div>
  );
};

export default NotificationBadge;