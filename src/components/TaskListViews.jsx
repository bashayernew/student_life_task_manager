import React from 'react';
import Icon from './AppIcon';
import {
  getStatusBadgeClass,
  getPriorityBadgeClass,
  isOverdue,
  formatDate,
  getTaskDisplayStatusForUser,
} from '../utils/statusUtils';

export function TaskListMobileCard({ task, userProfile, isLead, onClick }) {
  const displayStatus = getTaskDisplayStatusForUser(task, userProfile);
  const overdue = isOverdue(task.due_at);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground break-words">{task.title}</p>
          {task.description ? (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          ) : null}
        </div>
        <span
          className={`shrink-0 px-2 py-1 text-xs font-medium rounded border ${getPriorityBadgeClass(task.priority)}`}
        >
          {task.priority === 'normal' ? 'medium' : (task.priority || 'medium')}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadgeClass(displayStatus.badgeStatus)}`}
        >
          {displayStatus.label}
        </span>
        <span className="text-xs text-muted-foreground break-words">
          {task.department?.name || 'No department'}
        </span>
      </div>

      {isLead && displayStatus.summary?.total > 1 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {displayStatus.summary.completed}/{displayStatus.summary.total} members completed
        </p>
      ) : null}

      <div className={`mt-2 flex items-center text-xs ${overdue ? 'text-error font-medium' : 'text-muted-foreground'}`}>
        Due {formatDate(task.due_at)}
        {overdue ? <Icon name="AlertCircle" size={14} className="ml-1 shrink-0" /> : null}
      </div>
    </button>
  );
}

export function TaskListDesktopTable({ tasks, userProfile, isLead, onRowClick, emptyMessage = 'No tasks found' }) {
  return (
    <div className="ktech-responsive-table-wrap">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Department
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Priority
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Due Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tasks.length === 0 ? (
            <tr>
              <td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            tasks.map((task) => {
              const displayStatus = getTaskDisplayStatusForUser(task, userProfile);
              const overdue = isOverdue(task.due_at);
              return (
                <tr
                  key={task.id}
                  onClick={() => onRowClick(task.id)}
                  className="hover:bg-muted cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground break-words">{task.title}</div>
                    {task.description ? (
                      <div className="text-sm text-muted-foreground truncate max-w-xs">{task.description}</div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {task.department?.name || 'No department'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadgeClass(
                          displayStatus.badgeStatus
                        )}`}
                      >
                        {displayStatus.label}
                      </span>
                      {isLead && displayStatus.summary?.total > 1 ? (
                        <p className="text-xs text-muted-foreground">
                          {displayStatus.summary.completed}/{displayStatus.summary.total} members completed
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityBadgeClass(task.priority)}`}
                    >
                      {task.priority === 'normal' ? 'medium' : (task.priority || 'medium')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${overdue ? 'text-error font-medium' : 'text-muted-foreground'}`}>
                      {formatDate(task.due_at)}
                      {overdue ? (
                        <span className="ml-2 text-error">
                          <Icon name="AlertCircle" size={14} />
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
