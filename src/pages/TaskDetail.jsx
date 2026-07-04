import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { taskService } from '../utils/taskService';
import ProtectedRoute from '../components/ProtectedRoute';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { getStatusBadgeClass, getPriorityBadgeClass, isOverdue, formatDateTime, getTaskAssigneeSummary } from '../utils/statusUtils';
import Icon from '../components/AppIcon';
import AppPageHeader from '../components/AppPageHeader';

function formatCommentAudience(comment) {
  if (!comment?.recipients?.length || comment.audience === 'everyone') {
    return 'Everyone';
  }
  return comment.recipients.map((recipient) => recipient.full_name || recipient.email).join(', ');
}

const TaskDetail = () => {
  const { id } = useParams();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [userStatus, setUserStatus] = useState('pending');
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [followUpUserId, setFollowUpUserId] = useState(null);
  const [followUpText, setFollowUpText] = useState('');
  const [followUpComment, setFollowUpComment] = useState('');
  const [reopenComment, setReopenComment] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [commentAudience, setCommentAudience] = useState('everyone');
  const [commentRecipients, setCommentRecipients] = useState([]);

  const userAssignment = useMemo(() => {
    return task?.task_assignees?.find((a) => a.user_id === userProfile?.id) || null;
  }, [task, userProfile?.id]);

  const isAssignee = Boolean(userAssignment);
  const isAdmin = userProfile?.role === 'admin';
  const isManager = userProfile?.role === 'manager';
  const canPostAsLead = isAdmin || isManager;

  const assigneeOptions = useMemo(() => {
    return (task?.task_assignees || []).map((assignee) => ({
      value: assignee.user_id,
      label: assignee.user?.full_name || assignee.user?.email || 'Unknown',
    }));
  }, [task?.task_assignees]);

  const renderCommentAudienceFields = () => (
    canPostAsLead && (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Send comment to
          </label>
          <Select
            value={commentAudience}
            onChange={setCommentAudience}
            options={[
              { value: 'everyone', label: 'Everyone on this task' },
              { value: 'specific', label: 'Specific team members' },
            ]}
            className="w-full md:w-72"
          />
        </div>
        {commentAudience === 'specific' && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Select team members
            </label>
            <Select
              multiple
              searchable
              value={commentRecipients}
              onChange={setCommentRecipients}
              options={assigneeOptions}
              placeholder="Choose one or more people on this task"
              className="w-full"
            />
          </div>
        )}
      </div>
    )
  );

  const canReplyToComment = (comment) => {
    if (canPostAsLead) return true;
    if (!isAssignee) return false;
    return comment.user?.role === 'admin' || comment.user?.role === 'manager';
  };

  const renderReplyForm = (commentId) => (
    replyTo === commentId && (
      <form onSubmit={(e) => handleReply(e, commentId)} className="mt-3 ml-4 space-y-2">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={2}
          placeholder="Write a reply..."
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={submittingComment || !replyText.trim()}>
            Send Reply
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setReplyTo(null);
              setReplyText('');
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    )
  );

  useEffect(() => {
    loadTask();
  }, [id, userProfile?.id]);

  const loadTask = async () => {
    setLoading(true);
    const { data, error } = await taskService.getTask(id);
    if (!error && data) {
      setTask(data);
      setComments(data.comments || []);
      const assignees = data.task_assignees || [];
      const userAssignment = assignees.find((a) => a.user_id === userProfile?.id);
      if (userAssignment) {
        setUserStatus(userAssignment.status);
      }
    }
    setLoading(false);
  };

  const handleStatusChange = async (newStatus) => {
    if (!task || !userProfile) return;

    setUpdating(true);
    const { error } = await taskService.updateTaskStatus(
      task.id,
      userProfile.id,
      newStatus,
      newStatus === 'completed' ? newComment : ''
    );
    if (!error) {
      setUserStatus(newStatus);
      setNewComment('');
      await loadTask();
    }
    setUpdating(false);
  };

  const handleAddComment = async (e) => {
    e?.preventDefault();
    if (!task?.id || !newComment.trim()) return;

    if (canPostAsLead && commentAudience === 'specific' && commentRecipients.length === 0) {
      setCommentError('Select at least one team member, or choose Everyone.');
      return;
    }

    setSubmittingComment(true);
    setCommentError('');
    const recipientIds = canPostAsLead && commentAudience === 'specific' ? commentRecipients : null;
    const { error } = await taskService.addTaskComment(task.id, {
      body: newComment.trim(),
      recipientIds,
    });
    if (error) {
      setCommentError(error.message || 'Failed to add comment');
    } else {
      setNewComment('');
      setCommentAudience('everyone');
      setCommentRecipients([]);
      await loadTask();
    }
    setSubmittingComment(false);
  };

  const handleReply = async (e, parentId) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSubmittingComment(true);
    setCommentError('');
    const { error } = await taskService.addTaskComment(task.id, {
      body: replyText.trim(),
      parentId,
    });
    if (error) {
      setCommentError(error.message || 'Failed to add reply');
    } else {
      setReplyTo(null);
      setReplyText('');
      await loadTask();
    }
    setSubmittingComment(false);
  };

  const handleReopenAssignee = async (assigneeId) => {
    setSubmittingAction(true);
    setActionError('');
    setActionSuccess('');
    const { error } = await taskService.reopenAssignee(task.id, assigneeId, reopenComment.trim());
    if (error) {
      setActionError(error.message || 'Failed to reopen task for this member');
    } else {
      setActionSuccess('Task reopened for this team member.');
      setReopenComment('');
      await loadTask();
    }
    setSubmittingAction(false);
  };

  const handleFollowUp = async (e, assigneeId) => {
    e.preventDefault();
    if (!followUpText.trim() && !followUpComment.trim()) return;

    setSubmittingAction(true);
    setActionError('');
    setActionSuccess('');
    const { error } = await taskService.followUpAssignee(task.id, {
      userId: assigneeId,
      personalDescription: followUpText.trim(),
      comment: followUpComment.trim(),
    });
    if (error) {
      setActionError(error.message || 'Failed to assign follow-up work');
    } else {
      setActionSuccess('Follow-up assigned to this team member.');
      setFollowUpUserId(null);
      setFollowUpText('');
      setFollowUpComment('');
      await loadTask();
    }
    setSubmittingAction(false);
  };

  const assigneeSummary = task ? (task.assignee_summary || getTaskAssigneeSummary(task)) : null;

  const topLevelComments = comments.filter((comment) => !comment.parent_id);
  const repliesByParent = comments.reduce((acc, comment) => {
    if (comment.parent_id) {
      if (!acc[comment.parent_id]) acc[comment.parent_id] = [];
      acc[comment.parent_id].push(comment);
    }
    return acc;
  }, {});

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="ktech-spinner"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!task) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Task not found</h1>
            <Button onClick={() => navigate('/tasks')}>Back to Tasks</Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const overdue = isOverdue(task.due_at);

  return (
    <ProtectedRoute>
      <div className="ktech-page-shell">
        <AppPageHeader title="Task Details" backTo="/tasks" backLabel="Back to Tasks" />

        <main className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
          <div className="ktech-card p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">{task.title}</h1>
              {canPostAsLead && assigneeSummary && assigneeSummary.total > 0 && (
                <div className="mb-3 rounded-lg border border-border bg-muted/60 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    Overall task status:{' '}
                    {assigneeSummary.overall_status === 'completed'
                      ? 'Completed'
                      : assigneeSummary.overall_status === 'partial'
                        ? `Pending (${assigneeSummary.completed}/${assigneeSummary.total} members completed)`
                        : 'Pending'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The task stays pending until every assigned team member marks their part complete.
                  </p>
                </div>
              )}
              <div className="flex items-center gap-4 flex-wrap">
                <span className={`px-3 py-1 text-sm font-medium rounded border ${getStatusBadgeClass(userStatus)}`}>
                  {(isAssignee ? userStatus : task.status || 'pending').replace('_', ' ')}
                </span>
                <span className={`px-3 py-1 text-sm font-medium rounded border ${getPriorityBadgeClass(task.priority)}`}>
                  {task.priority === 'normal' ? 'medium' : (task.priority || 'medium')}
                </span>
                {overdue && (
                  <span className="px-3 py-1 text-sm font-medium rounded bg-error/15 text-error border border-error/30 flex items-center gap-2">
                    <Icon name="AlertCircle" size={16} />
                    Overdue
                  </span>
                )}
              </div>
            </div>

            {task.description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">General Description</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {userAssignment?.personal_description && (
              <div className="mb-6 bg-accent/10 border border-accent/20 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-2">Personal Instructions For You</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {userAssignment.personal_description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Department</h3>
                <p className="text-foreground">{task.department?.name || 'No department'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Created By</h3>
                <p className="text-foreground">
                  {task.created_by?.full_name || task.created_by?.email || 'Unknown'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Due Date</h3>
                <p className={overdue ? 'text-error font-medium' : 'text-foreground'}>
                  {formatDateTime(task.due_at)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Created At</h3>
                <p className="text-foreground">{formatDateTime(task.created_at)}</p>
              </div>
            </div>

            {isAssignee && (
              <div className="border-t border-border pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Update Your Status
                  </label>
                  <Select
                    value={userStatus}
                    onChange={(value) => handleStatusChange(value)}
                    disabled={updating}
                    options={[
                      { value: 'pending', label: 'Pending' },
                      { value: 'completed', label: 'Completed' },
                    ]}
                    className="w-full md:w-64"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Add a comment
                  </label>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    placeholder="Share progress, questions, or notes about this task"
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {renderCommentAudienceFields()}
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleAddComment}
                      disabled={submittingComment || !newComment.trim()}
                    >
                      {submittingComment ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {task.task_assignees && task.task_assignees.length > 0 && (
              <div className="border-t border-border pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">Assignees</h3>
                {(actionError || actionSuccess) && (
                  <div className={`mb-4 rounded-lg p-3 ${actionError ? 'bg-error/10 border border-error/30' : 'bg-success/10 border border-success/30'}`}>
                    <p className={`text-sm ${actionError ? 'text-error' : 'text-success'}`}>
                      {actionError || actionSuccess}
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  {task.task_assignees.map((assignee) => (
                    <div key={assignee.user_id} className="bg-muted rounded p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-foreground font-medium">
                            {assignee.user?.full_name || assignee.user?.email || 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground">{assignee.user?.role}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadgeClass(assignee.status)}`}>
                          {assignee.status.replace('_', ' ')}
                        </span>
                      </div>
                      {assignee.personal_description && (
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                          <span className="font-medium text-foreground">
                            {isAssignee && assignee.user_id === userProfile?.id ? 'Personal instructions for you: ' : 'Personal note: '}
                          </span>
                          {assignee.personal_description}
                        </p>
                      )}

                      {canPostAsLead && assignee.user?.role === 'staff' && (
                        <div className="mt-3 pt-3 border-t border-border space-y-3">
                          {assignee.status === 'completed' && (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">
                                Reopen this member&apos;s part if the work still needs changes.
                              </p>
                              <textarea
                                value={reopenComment}
                                onChange={(e) => setReopenComment(e.target.value)}
                                rows={2}
                                placeholder="Optional comment explaining why it is being reopened"
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={submittingAction}
                                onClick={() => handleReopenAssignee(assignee.user_id)}
                              >
                                Reopen for this member
                              </Button>
                            </div>
                          )}

                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setFollowUpUserId(followUpUserId === assignee.user_id ? null : assignee.user_id);
                                setFollowUpText('');
                                setFollowUpComment('');
                                setActionError('');
                                setActionSuccess('');
                              }}
                              className="text-secondary hover:text-primary underline text-xs"
                            >
                              {followUpUserId === assignee.user_id ? 'Cancel follow-up' : 'Add follow-up for this member'}
                            </button>
                          </div>

                          {followUpUserId === assignee.user_id && (
                            <form onSubmit={(e) => handleFollowUp(e, assignee.user_id)} className="space-y-2">
                              <textarea
                                value={followUpText}
                                onChange={(e) => setFollowUpText(e.target.value)}
                                rows={2}
                                placeholder="Follow-up instructions for this team member"
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <textarea
                                value={followUpComment}
                                onChange={(e) => setFollowUpComment(e.target.value)}
                                rows={2}
                                placeholder="Comment about this follow-up (optional)"
                                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <Button type="submit" size="sm" disabled={submittingAction}>
                                Assign follow-up
                              </Button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="ktech-card p-4 sm:p-6">
            <h2 className="text-xl font-bold mb-4">Comments</h2>

            {commentError && (
              <div className="mb-4 bg-error/10 border border-error/30 rounded-lg p-3">
                <p className="text-sm text-error">{commentError}</p>
              </div>
            )}

            {topLevelComments.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-4">No comments yet.</p>
            ) : (
              <div className="space-y-4 mb-6">
                {topLevelComments.map((comment) => (
                  <div key={comment.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {comment.user?.full_name || comment.user?.email || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(comment.created_at)}
                        </p>
                        {!comment.parent_id && (
                          <p className="text-xs text-secondary mt-0.5">
                            For: {formatCommentAudience(comment)}
                          </p>
                        )}
                      </div>
                      {canReplyToComment(comment) && (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyTo(replyTo === comment.id ? null : comment.id);
                            setReplyText('');
                          }}
                          className="text-secondary hover:text-primary underline text-xs"
                        >
                          Reply
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{comment.body}</p>

                    {(repliesByParent[comment.id] || []).map((reply) => (
                      <div key={reply.id} className="mt-3 ml-4 pl-4 border-l-2 border-accent/30">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {reply.user?.full_name || reply.user?.email || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(reply.created_at)}
                            </p>
                          </div>
                          {canReplyToComment(reply) && (
                            <button
                              type="button"
                              onClick={() => {
                                setReplyTo(replyTo === reply.id ? null : reply.id);
                                setReplyText('');
                              }}
                              className="text-secondary hover:text-primary underline text-xs"
                            >
                              Reply
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{reply.body}</p>
                        {renderReplyForm(reply.id)}
                      </div>
                    ))}

                    {renderReplyForm(comment.id)}
                  </div>
                ))}
              </div>
            )}

            {!isAssignee && canPostAsLead && (
              <form onSubmit={handleAddComment} className="space-y-3 border-t border-border pt-4">
                <label className="block text-sm font-medium text-muted-foreground">
                  Add a comment or update
                </label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  placeholder="Respond to the team about this task"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {renderCommentAudienceFields()}
                <Button type="submit" disabled={submittingComment || !newComment.trim()}>
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </Button>
              </form>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default TaskDetail;
