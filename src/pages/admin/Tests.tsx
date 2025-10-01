import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import TestQuestionDialog from '@/components/admin/TestQuestionDialog';

interface TestQuestion {
  id: string;
  course_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  difficulty: string;
  explanation?: string;
  courses: {
    title: string;
  };
}

const AdminTests = () => {
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<TestQuestion | null>(null);
  const { toast } = useToast();

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('test_questions')
        .select('*, courses(title)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch test questions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const { error } = await supabase
        .from('test_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Question deleted successfully',
      });

      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete question',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Test Management</h1>
          <Button onClick={() => {
            setSelectedQuestion(null);
            setDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Answer</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell className="max-w-md truncate">
                      {question.question_text}
                    </TableCell>
                    <TableCell>{question.courses?.title}</TableCell>
                    <TableCell className="capitalize">{question.difficulty}</TableCell>
                    <TableCell>{question.correct_answer}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedQuestion(question);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteQuestion(question.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <TestQuestionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          question={selectedQuestion}
          onSuccess={fetchQuestions}
        />
      </main>
    </div>
  );
};

export default AdminTests;
