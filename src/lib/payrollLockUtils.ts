import { useState, useEffect } from 'react';
import { supabase } from './supabase';

/**
 * Checks whether payroll for a given date (and optional estateId or taskType) is Confirmed & Locked.
 */
export async function checkIsPayrollLocked(
  dateStr: string,
  estateId?: string | null,
  taskType?: string | null
): Promise<boolean> {
  if (!dateStr) return false;

  try {
    let query = supabase
      .from('payroll_batches')
      .select('id, status')
      .eq('batch_date', dateStr)
      .eq('status', 'confirmed');

    if (estateId) {
      query = query.or(`estate_id.eq.${estateId},estate_id.is.null`);
    }
    if (taskType) {
      query = query.eq('task_type', taskType);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error checking payroll lock status:', error);
      return false;
    }

    return (data && data.length > 0) || false;
  } catch (err) {
    console.error('Failed to check payroll lock status:', err);
    return false;
  }
}

/**
 * React hook to subscribe to payroll lock status for a specific date and estate.
 */
export function usePayrollLock(dateStr: string, estateId?: string | null, taskType?: string | null) {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchStatus() {
      if (!dateStr) {
        if (isMounted) {
          setIsLocked(false);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const locked = await checkIsPayrollLocked(dateStr, estateId, taskType);
      if (isMounted) {
        setIsLocked(locked);
        setLoading(false);
      }
    }

    fetchStatus();
    return () => {
      isMounted = false;
    };
  }, [dateStr, estateId, taskType]);

  return { isLocked, loading };
}
