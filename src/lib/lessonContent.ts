import { supabase } from "@/integrations/supabase/client";

export type LessonContent = {
  content_text: string | null;
  content_url: string | null;
};

/**
 * Lesson body content is no longer readable directly from the `lessons` table.
 * It is served by the `get-lesson-content` edge function, which checks
 * free-preview status, purchase, or admin role.
 */
export async function fetchLessonContent(lessonId: string): Promise<LessonContent> {
  const { data, error } = await supabase.functions.invoke("get-lesson-content", {
    body: { lessonId },
  });
  if (error) return { content_text: null, content_url: null };
  return {
    content_text: data?.lesson?.content_text ?? null,
    content_url: data?.lesson?.content_url ?? null,
  };
}

export async function attachLessonContent<T extends { id?: string }>(
  lessons: T[]
): Promise<(T & LessonContent)[]> {
  return Promise.all(
    lessons.map(async (lesson) => {
      if (!lesson.id) return { ...lesson, content_text: null, content_url: null };
      const content = await fetchLessonContent(lesson.id);
      return { ...lesson, ...content };
    })
  );
}
