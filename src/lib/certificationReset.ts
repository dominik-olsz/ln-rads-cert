import { supabase } from '@/integrations/supabase/client';

/**
 * Records that an admin reset a student's certification attempts.
 * Any test session the student still has open in a browser tab was started
 * before this timestamp and must be discarded instead of resumed.
 *
 * Pass courseId = null for a reset that covers every course.
 */
export const recordAttemptReset = async (userId: string, courseId: string | null) => {
  const reset_at = new Date().toISOString();

  let update = supabase
    .from('certification_attempt_resets')
    .update({ reset_at })
    .eq('user_id', userId);
  update = courseId ? update.eq('course_id', courseId) : (update.is('course_id', null) as typeof update);

  const { data: updated, error: updateError } = await update.select('id');
  if (updateError) throw updateError;
  if (updated && updated.length > 0) return;

  const { error: insertError } = await supabase
    .from('certification_attempt_resets')
    .insert({ user_id: userId, course_id: courseId, reset_at });
  if (insertError) throw insertError;
};

/**
 * Latest reset timestamp that applies to this student/course
 * (course specific markers and global markers both count).
 */
export const fetchAttemptResetAt = async (
  userId: string,
  courseId: string | null
): Promise<Date | null> => {
  const { data } = await supabase
    .from('certification_attempt_resets')
    .select('course_id, reset_at')
    .eq('user_id', userId);

  const relevant = (data ?? []).filter(
    (row) => row.course_id === null || (courseId ? row.course_id === courseId : true)
  );
  if (relevant.length === 0) return null;

  return relevant
    .map((row) => new Date(row.reset_at))
    .reduce((latest, current) => (current > latest ? current : latest));
};
