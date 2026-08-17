import { supabase } from "@/integrations/supabase/client";

export type LessonContent = {
  content_text: string | null;
  content_url: string | null;
  /** Raw Polish translation, used by the admin editor. */
  content_text_pl?: string | null;
};

/**
 * Lesson body content is no longer readable directly from the `lessons` table.
 * It is served by the `get-lesson-content` edge function, which checks
 * free-preview status, purchase, or admin role.
 *
 * IMPORTANT: this throws on failure. A failed load must never be mistaken for
 * "this lesson has no content" — admin saves rewrite lessons from state, so
 * swallowing the error silently wipes real content.
 */
export async function fetchLessonContent(lessonId: string): Promise<LessonContent> {
  const { data, error } = await supabase.functions.invoke("get-lesson-content", {
    body: { lessonId },
  });
  if (error) {
    throw new Error(`Failed to load lesson content (${lessonId}): ${error.message}`);
  }
  if (!data?.lesson) {
    throw new Error(`Lesson content unavailable (${lessonId})`);
  }
  return {
    content_text: data.lesson.content_text ?? null,
    content_url: data.lesson.content_url ?? null,
    content_text_pl: data.lesson.content_text_pl ?? null,
  };
}

export async function attachLessonContent<T extends { id?: string }>(
  lessons: T[]
): Promise<(T & LessonContent)[]> {
  return Promise.all(
    lessons.map(async (lesson) => {
      if (!lesson.id) return { ...lesson, content_text: null, content_url: null, content_text_pl: null };
      const content = await fetchLessonContent(lesson.id);
      return { ...lesson, ...content };
    })
  );
}

