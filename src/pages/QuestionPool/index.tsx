import React, { useEffect, useState } from "react";
import { Button, Input, Card, Toast, Textarea, Modal } from "../../components";
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
  const {
    questionPools,
    loadQuestionPools,
    addQuestionPool,
    updateQuestionPool,
    deleteQuestionPool,
    addQuestionToPool,
    deleteQuestionFromPool,
    updateQuestionInPool,
    getQuestionById,
  } = useApp();
  
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
  const [editingPoolId, setEditingPoolId] = useState<string | null>(null);
  const [editingPoolName, setEditingPoolName] = useState("");
  const [poolQuestionDrafts, setPoolQuestionDrafts] = useState<
    Record<string, { text: string; category: string }>
  >({});
  const [openAddQuestionPoolId, setOpenAddQuestionPoolId] = useState<string | null>(
    null
  );
  const [editingQuestion, setEditingQuestion] = useState<{
    poolId: string;
    questionId: string;
    text: string;
    category: string;
  } | null>(null);

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

  const handleSavePool = async () => {
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

    try {
      await addQuestionPool({
        name: poolName,
        questions: questions,
      });

      // Reset form
      setPoolName("");
      setQuestions([]);
      setToastMessage("Question pool created successfully!");
      setShowToast(true);
    } catch (error) {
      setAlertMessage(
        error instanceof Error
          ? error.message
          : "Question pool could not be created."
      );
      setShowAlertToast(true);
    }
  };

  const handleDeletePool = (id: string) => {
    setPoolToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePool = async () => {
    if (poolToDelete) {
      try {
        await deleteQuestionPool(poolToDelete);
        setToastMessage("Question pool deleted");
        setShowToast(true);
        setPoolToDelete(null);
        setDeleteDialogOpen(false);
      } catch (error) {
        setAlertMessage(
          error instanceof Error
            ? error.message
            : "Question pool could not be deleted."
        );
        setShowAlertToast(true);
      }
    }
  };

  const startRenamePool = (poolId: string, currentName: string) => {
    setEditingPoolId(poolId);
    setEditingPoolName(currentName);
  };

  const cancelRenamePool = () => {
    setEditingPoolId(null);
    setEditingPoolName("");
  };

  const saveRenamePool = async () => {
    if (!editingPoolId) return;
    if (!editingPoolName.trim()) {
      setAlertMessage("Pool name cannot be empty.");
      setShowAlertToast(true);
      return;
    }

    try {
      await updateQuestionPool(editingPoolId, { name: editingPoolName.trim() });
      setToastMessage("Question pool updated");
      setShowToast(true);
      cancelRenamePool();
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : "Question pool could not be updated."
      );
      setShowAlertToast(true);
    }
  };

  const updateDraft = (poolId: string, updates: Partial<{ text: string; category: string }>) => {
    setPoolQuestionDrafts((prev) => ({
      ...prev,
      [poolId]: {
        text: prev[poolId]?.text || "",
        category: prev[poolId]?.category || "",
        ...updates,
      },
    }));
  };

  const handleAddQuestionToExistingPool = async (poolId: string) => {
    const draft = poolQuestionDrafts[poolId];
    if (!draft?.text?.trim()) {
      setAlertMessage("Please enter a question to add.");
      setShowAlertToast(true);
      return;
    }

    try {
      await addQuestionToPool(poolId, {
        text: draft.text.trim(),
        category: draft.category.trim() || undefined,
      });
      setPoolQuestionDrafts((prev) => ({
        ...prev,
        [poolId]: { text: "", category: "" },
      }));
      setToastMessage("Question added");
      setShowToast(true);
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : "Question could not be added."
      );
      setShowAlertToast(true);
    }
  };

  const handleDeleteQuestionFromExistingPool = async (
    poolId: string,
    questionId: string
  ) => {
    try {
      await deleteQuestionFromPool(poolId, questionId);
      setToastMessage("Question deleted");
      setShowToast(true);
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : "Question could not be deleted."
      );
      setShowAlertToast(true);
    }
  };

  const handleOpenQuestionEdit = async (poolId: string, questionId: string) => {
    try {
      const question = await getQuestionById(questionId);
      setEditingQuestion({
        poolId,
        questionId,
        text: question.text,
        category: question.category || "",
      });
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : "Question detail could not be loaded."
      );
      setShowAlertToast(true);
    }
  };

  const handleSaveQuestionEdit = async () => {
    if (!editingQuestion) return;
    if (!editingQuestion.text.trim()) {
      setAlertMessage("Question text cannot be empty.");
      setShowAlertToast(true);
      return;
    }

    try {
      await updateQuestionInPool(
        editingQuestion.poolId,
        editingQuestion.questionId,
        {
          text: editingQuestion.text.trim(),
          category: editingQuestion.category.trim() || undefined,
        }
      );
      setEditingQuestion(null);
      setToastMessage("Question updated");
      setShowToast(true);
    } catch (error) {
      setAlertMessage(
        error instanceof Error ? error.message : "Question could not be updated."
      );
      setShowAlertToast(true);
    }
  };

  useEffect(() => {
    loadQuestionPools().catch((error) => {
      setAlertMessage(
        error instanceof Error
          ? error.message
          : "Question pools could not be loaded."
      );
      setShowAlertToast(true);
    });
  }, []);

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

      {editingQuestion && (
        <Modal
          isOpen={!!editingQuestion}
          onClose={() => setEditingQuestion(null)}
          title="Edit Question"
        >
          <div className="space-y-3">
            <Textarea
              label="Question Text"
              value={editingQuestion.text}
              onChange={(e) =>
                setEditingQuestion((prev) =>
                  prev ? { ...prev, text: e.target.value } : prev
                )
              }
              rows={3}
            />
            <Input
              label="Category (Optional)"
              value={editingQuestion.category}
              onChange={(e) =>
                setEditingQuestion((prev) =>
                  prev ? { ...prev, category: e.target.value } : prev
                )
              }
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingQuestion(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveQuestionEdit}>Save</Button>
            </div>
          </div>
        </Modal>
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
                          {editingPoolId === pool.id ? (
                            <div className="space-y-2">
                              <Input
                                value={editingPoolName}
                                onChange={(e) => setEditingPoolName(e.target.value)}
                                placeholder="Pool name"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={saveRenamePool}
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelRenamePool}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <h3 className="text-lg font-semibold text-foreground mb-1">
                              {pool.name}
                            </h3>
                          )}
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
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setOpenAddQuestionPoolId((prev) =>
                            prev === pool.id ? null : pool.id
                          )
                        }
                      >
                        Add Question
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startRenamePool(pool.id, pool.name)}
                      >
                        Rename
                      </Button>
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
                  <div className="space-y-4">
                    {openAddQuestionPoolId === pool.id && (
                      <div className="border border-border rounded-lg p-3 bg-muted/20">
                        <p className="text-sm font-medium text-foreground mb-2">
                          Add Question To This Pool
                        </p>
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Enter question text"
                            value={poolQuestionDrafts[pool.id]?.text || ""}
                            onChange={(e) =>
                              updateDraft(pool.id, { text: e.target.value })
                            }
                            rows={2}
                          />
                          <Input
                            placeholder="Category (optional)"
                            value={poolQuestionDrafts[pool.id]?.category || ""}
                            onChange={(e) =>
                              updateDraft(pool.id, { category: e.target.value })
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddQuestionToExistingPool(pool.id)}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    )}

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
                          <div className="flex-1">
                            <p className="text-sm text-foreground">{q.text}</p>
                            {q.category && (
                              <Badge variant="secondary" className="mt-1">
                                {q.category}
                              </Badge>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenQuestionEdit(pool.id, q.id)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              handleDeleteQuestionFromExistingPool(pool.id, q.id)
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                    </div>
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

