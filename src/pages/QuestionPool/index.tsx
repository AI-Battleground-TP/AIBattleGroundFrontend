import React, { useState } from "react";
import { Button, Input, Card, Toast, Textarea } from "../../components";
import { Badge } from "../../components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { useApp } from "../../context/AppContext";
import { parseQuestionsCSV, downloadQuestionsCSVTemplate } from "../../utils/csvParser";
import type { Question } from "../../types";

export const QuestionPool: React.FC = () => {
  const { questionPools, addQuestionPool, deleteQuestionPool } = useApp();
  
  // Form state
  const [poolName, setPoolName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentCategory, setCurrentCategory] = useState("");
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showAlertToast, setShowAlertToast] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  
  // View state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [poolToDelete, setPoolToDelete] = useState<string | null>(null);

  const handleAddQuestion = () => {
    if (!currentQuestion.trim()) {
      setAlertMessage("Please enter a question");
      setShowAlertToast(true);
      return;
    }

    const newQuestion: Question = {
      id: `q-${Date.now()}-${Math.random()}`,
      text: currentQuestion,
      category: currentCategory.trim() || undefined,
    };

    setQuestions([...questions, newQuestion]);
    setCurrentQuestion("");
    setCurrentCategory("");
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const parsedQuestions = await parseQuestionsCSV(file);
        const newQuestions: Question[] = parsedQuestions.map((pq, idx) => ({
          id: `q-${Date.now()}-${idx}`,
          text: pq.text,
          category: pq.category,
        }));
        setQuestions([...questions, ...newQuestions]);
        setToastMessage(`Added ${newQuestions.length} questions from CSV`);
        setShowToast(true);
      } catch (error) {
        console.error("Error parsing CSV:", error);
        setAlertMessage("Error parsing CSV file. Please check the format.");
        setShowAlertToast(true);
      }
    }
  };

  const handleSavePool = () => {
    if (!poolName.trim()) {
      setAlertMessage("Please enter a pool name");
      setShowAlertToast(true);
      return;
    }

    if (questions.length === 0) {
      setAlertMessage("Please add at least one question");
      setShowAlertToast(true);
      return;
    }

    addQuestionPool({
      name: poolName,
      questions: questions,
    });

    // Reset form
    setPoolName("");
    setQuestions([]);
    setToastMessage("Question pool created successfully!");
    setShowToast(true);
  };

  const handleDeletePool = (id: string) => {
    setPoolToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePool = () => {
    if (poolToDelete) {
      deleteQuestionPool(poolToDelete);
      setToastMessage("Question pool deleted");
      setShowToast(true);
      setPoolToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      {showToast && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
      {showAlertToast && (
        <Toast
          message={alertMessage}
          type="error"
          onClose={() => setShowAlertToast(false)}
        />
      )}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question Pool</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question pool? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePool}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Question Pools</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage collections of questions for model experiments
          </p>
        </div>
      </div>

      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          <strong>💡 How it works:</strong> Create question pools that you can reuse
          across different model experiments. Add questions manually or upload them
          from a CSV file. Each question can optionally have a category.
        </p>
      </div>

      {/* Create New Pool */}
      <Card title="Create New Question Pool">
        <div className="space-y-4">
          <Input
            label="Pool Name"
            placeholder="e.g., General Knowledge Questions, Technical Q&A"
            value={poolName}
            onChange={(e) => setPoolName(e.target.value)}
          />

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Add Questions
            </h3>

            {/* Manual Entry */}
            <div className="space-y-3 mb-4">
              <Textarea
                label="Question Text"
                placeholder="Enter your question"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                rows={2}
              />
              <Input
                label="Category (Optional)"
                placeholder="e.g., Science, Technology, Sports"
                value={currentCategory}
                onChange={(e) => setCurrentCategory(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddQuestion}
              >
                + Add Question
              </Button>
            </div>

            {/* CSV Upload */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Or Upload CSV
              </label>
              <div className="flex items-center space-x-6">
                <div className="flex-1 border-2 border-dashed border-input rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="cursor-pointer text-primary hover:underline font-medium"
                  >
                    Click to upload CSV file
                  </label>
                  <p className="text-sm text-muted-foreground mt-2">
                    CSV format: question, category (optional)
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-sm font-medium text-foreground mb-2">Sample Format</p>
                  <img
                    src="/question_pool_csv.png"
                    alt="CSV Sample Format"
                    className="h-24 w-auto border rounded shadow-sm"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={downloadQuestionsCSVTemplate}
                className="mt-2 text-primary hover:underline"
              >
                Download sample CSV template
              </Button>
            </div>
          </div>

          {/* Questions List */}
          {questions.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-foreground mb-3">
                Questions in this pool ({questions.length})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="flex items-start justify-between p-3 bg-muted/30 rounded-lg border border-border"
                  >
                    <div className="flex-1">
                      <div className="flex items-start space-x-2">
                        <span className="text-sm font-semibold text-muted-foreground mt-1">
                          {idx + 1}.
                        </span>
                        <div>
                          <p className="text-sm text-foreground">{q.text}</p>
                          {q.category && (
                            <Badge variant="secondary" className="mt-1">
                              {q.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveQuestion(q.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <Button
              onClick={handleSavePool}
              className="w-full"
              disabled={!poolName.trim() || questions.length === 0}
            >
              Save Question Pool
            </Button>
          </div>
        </div>
      </Card>

      {/* Existing Pools */}
      <Card title={`Your Question Pools (${questionPools.length})`}>
        {questionPools.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No question pools yet. Create your first pool above!</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-3">
            {questionPools.map((pool) => (
              <AccordionItem key={pool.id} value={pool.id} className="border border-border rounded-lg overflow-hidden">
                <div className="p-4 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-foreground mb-1">
                            {pool.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {pool.questions.length} question{pool.questions.length !== 1 ? 's' : ''}
                            {" • "}
                            Created {new Date(pool.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </AccordionTrigger>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeletePool(pool.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
                <AccordionContent className="p-4">
                  <div className="space-y-2">
                    {pool.questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-3 bg-muted/30 rounded-lg border border-border"
                      >
                        <div className="flex items-start space-x-2">
                          <span className="text-sm font-semibold text-muted-foreground">
                            {idx + 1}.
                          </span>
                          <div>
                            <p className="text-sm text-foreground">{q.text}</p>
                            {q.category && (
                              <Badge variant="secondary" className="mt-1">
                                {q.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Card>
    </div>
  );
};

