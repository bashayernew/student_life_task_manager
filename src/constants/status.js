export const STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

export function normalizeStatus(s) {
  if (!s) return STATUS.PENDING;
  const k = String(s).toLowerCase().replace(/\s+/g, '_');
  if (k === 'in_progress') return STATUS.IN_PROGRESS;
  if (k === 'completed') return STATUS.COMPLETED;
  return STATUS.PENDING;
}

