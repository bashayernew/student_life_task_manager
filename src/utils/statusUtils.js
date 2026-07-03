export const statusColors = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  partial: 'bg-accent/15 text-secondary border-accent/40',
  in_progress: 'bg-accent/15 text-secondary border-accent/40',
  completed: 'bg-success/15 text-success border-success/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

export const priorityColors = {
  high: 'bg-error/15 text-error border-error/30',
  medium: 'bg-warning/15 text-warning border-warning/30',
  low: 'bg-success/15 text-success border-success/30',
  normal: 'bg-muted text-muted-foreground border-border',
};

export const getStatusBadgeClass = (status) => {
  return statusColors[status] || statusColors.pending;
};

export const getPriorityBadgeClass = (priority) => {
  const normalizedPriority = priority === 'normal' ? 'medium' : priority;
  return priorityColors[normalizedPriority] || priorityColors.medium;
};

export const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date();
  return due < now;
};

export const formatDate = (dateString) => {
  if (!dateString) return 'No due date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return 'No date';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function getTaskAssigneeSummary(task) {
  const assignees = task?.task_assignees || [];
  const total = assignees.length;
  const completed = assignees.filter((a) => (a.status || 'pending') === 'completed').length;
  const pending = total - completed;

  let overall_status = 'pending';
  if (total === 0) {
    overall_status = 'pending';
  } else if (completed === total) {
    overall_status = 'completed';
  } else if (completed > 0) {
    overall_status = 'partial';
  }

  return { total, completed, pending, overall_status };
}

export function getTaskDisplayStatusForUser(task, userProfile) {
  const assignees = task?.task_assignees || [];
  const userAssignment = assignees.find(
    (a) => a.user_id === userProfile?.id || a.user?.id === userProfile?.id
  );
  const summary = getTaskAssigneeSummary(task);

  if (userProfile?.role === 'admin' || userProfile?.role === 'manager') {
    if (summary.overall_status === 'completed') {
      return { badgeStatus: 'completed', label: 'Completed', summary };
    }
    if (summary.overall_status === 'partial') {
      return {
        badgeStatus: 'pending',
        label: `Pending (${summary.completed}/${summary.total} done)`,
        summary,
      };
    }
    return { badgeStatus: 'pending', label: 'Pending', summary };
  }

  const status = userAssignment?.status || 'pending';
  return {
    badgeStatus: status,
    label: status.replace('_', ' '),
    summary,
  };
}
