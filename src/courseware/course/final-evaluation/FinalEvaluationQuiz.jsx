import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import { 
  Button, 
  Card, 
  Alert, 
  Spinner, 
  StandardModal,
  Form,
  ProgressBar
} from '@openedx/paragon';
import { CheckCircle } from '@openedx/paragon/icons';
import { 
  getFinalEvaluationConfig, 
  getFinalEvaluationQuiz, 
  submitFinalEvaluationQuiz,
  getFinalEvaluationResult 
} from './api';
import messages from './messages';
import { useFinalUnitDetection } from './hooks';

const FinalEvaluationQuiz = ({ courseId, sequenceId, unitId }) => {
  const intl = useIntl();
  const isFinalUnit = useFinalUnitDetection(sequenceId, unitId);
  
  const [evaluationConfig, setEvaluationConfig] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasExistingResult, setHasExistingResult] = useState(false);

  // Always log component render
  console.log('🎯 FinalEvaluationQuiz rendered with props:', { 
    courseId, 
    sequenceId, 
    unitId, 
    isFinalUnit,
    timestamp: new Date().toISOString()
  });

  // Early return if not final unit
  if (!isFinalUnit) {
    console.log('🚫 Not rendering FinalEvaluationQuiz: not a final unit');
    return null;
  }

  useEffect(() => {
    console.log('🔄 FinalEvaluationQuiz useEffect triggered:', { isFinalUnit, courseId });
    if (isFinalUnit && courseId) {
      console.log('✅ Loading final evaluation config for course:', courseId);
      loadConfig();
    } else {
      console.log('❌ Not loading config:', { isFinalUnit, courseId });
    }
  }, [isFinalUnit, courseId]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Loading final evaluation config...');
      const config = await getFinalEvaluationConfig(courseId);
      console.log('✅ Config loaded:', config);
      setEvaluationConfig(config);
    } catch (err) {
      console.error('❌ Failed to load config:', err);
      setError('Failed to load final evaluation configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const quiz = await getFinalEvaluationQuiz(courseId);
      setQuizData(quiz);
      setShowQuiz(true);
      // Initialize answers object
      const initialAnswers = {};
      quiz.questions?.forEach(question => {
        initialAnswers[question.id] = [];
      });
      setAnswers(initialAnswers);
    } catch (err) {
      setError(err?.response?.data?.message || intl.formatMessage(messages.quizLoadError));
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, choiceId, isMultiple) => {
    setAnswers(prev => {
      const newAnswers = { ...prev };
      if (isMultiple) {
        const currentAnswers = newAnswers[questionId] || [];
        if (currentAnswers.includes(choiceId)) {
          newAnswers[questionId] = currentAnswers.filter(id => id !== choiceId);
        } else {
          newAnswers[questionId] = [...currentAnswers, choiceId];
        }
      } else {
        newAnswers[questionId] = [choiceId];
      }
      return newAnswers;
    });
  };

  const handleSubmitAttempt = () => {
    // Check if all questions are answered
    const unansweredQuestions = quizData.questions?.filter(question => 
      !answers[question.id] || answers[question.id].length === 0
    );

    if (unansweredQuestions?.length > 0) {
      setError(intl.formatMessage(messages.incompleteAnswers));
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setShowConfirmModal(false);
    
    try {
      const submissionResult = await submitFinalEvaluationQuiz(courseId, answers);
      setResult(submissionResult);
      setShowQuiz(false);
    } catch (err) {
      setError(err?.response?.data?.message || intl.formatMessage(messages.submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  // Debug logging
  console.log('FinalEvaluationQuiz debug:', {
    courseId,
    loading,
    error,
    evaluationConfig,
    showQuiz,
    result,
    hasExistingResult
  });

  // For testing - always show something if we get here
  if (!evaluationConfig && !loading && !error) {
    return (
      <Card className="mt-4 p-4 text-center bg-warning">
        <h3>🚧 Final Evaluation (Testing Mode)</h3>
        <p>This is shown because you're at the final unit. API endpoints are being set up.</p>
        <p>Course ID: {courseId}</p>
      </Card>
    );
  }

  // Don't show anything if no evaluation configured or not quiz type
  if (!evaluationConfig || evaluationConfig.evaluation_type !== 'quiz') {
    return null;
  }

  if (loading && !showQuiz) {
    return (
      <div className="d-flex justify-content-center align-items-center py-4">
        <Spinner animation="border" variant="primary" />
        <span className="ml-2">{intl.formatMessage(messages.loading)}</span>
      </div>
    );
  }

  if (error && !showQuiz) {
    return (
      <Alert variant="danger" className="mt-3">
        {error}
      </Alert>
    );
  }

  // Show final results if quiz is completed
  if (result || hasExistingResult) {
    const finalResult = result || {};
    const score = Math.round(finalResult.score || 0);
    const totalQuestions = finalResult.total_questions || quizData?.questions?.length || 0;
    const correctAnswers = finalResult.correct_answers || 0;

    return (
      <Card className="mt-4 p-4">
        <div className="text-center">
          <CheckCircle className="text-success mb-3" size="lg" />
          <h3>{intl.formatMessage(messages.quizCompleted)}</h3>
          
          <div className="mt-4">
            <div className="row justify-content-center">
              <div className="col-md-6">
                <Card className="p-3 mb-3" style={{ backgroundColor: '#f8f9fa' }}>
                  <h4 className={`text-${getScoreColor(score)} mb-0`}>
                    {intl.formatMessage(messages.finalScore)}: {score}%
                  </h4>
                </Card>
                
                <Card className="p-3" style={{ backgroundColor: '#f8f9fa' }}>
                  <div className="text-muted">
                    {intl.formatMessage(messages.correctAnswers)}: {correctAnswers}/{totalQuestions}
                  </div>
                  <ProgressBar 
                    now={score} 
                    variant={getScoreColor(score)}
                    className="mt-2"
                  />
                </Card>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-muted">
              {intl.formatMessage(messages.quizCompletedMessage)}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Show quiz interface
  if (showQuiz && quizData) {
    return (
      <div className="mt-4">
        <Card className="p-4">
          <h3 className="mb-4">{intl.formatMessage(messages.finalEvaluationTitle)}</h3>
          
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <Form>
            {quizData.questions?.map((question, index) => {
              const isMultiple = question.question_type === 'multiple_choice_multiple_answer';
              const questionAnswers = answers[question.id] || [];

              return (
                <Card key={question.id} className="mb-4 p-3">
                  <div className="mb-3">
                    <strong>
                      {index + 1}. {question.question_text}
                    </strong>
                    {isMultiple && (
                      <small className="text-muted d-block mt-1">
                        {intl.formatMessage(messages.multipleChoiceNote)}
                      </small>
                    )}
                  </div>
                  
                  <div className="pl-3">
                    {question.choices?.map(choice => (
                      <Form.Check
                        key={choice.id}
                        type={isMultiple ? 'checkbox' : 'radio'}
                        name={`question_${question.id}`}
                        id={`choice_${question.id}_${choice.id}`}
                        label={choice.choice_text}
                        checked={questionAnswers.includes(choice.id)}
                        onChange={() => handleAnswerChange(question.id, choice.id, isMultiple)}
                        className="mb-2"
                      />
                    ))}
                  </div>
                </Card>
              );
            })}
          </Form>

          <div className="text-center mt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmitAttempt}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="mr-2" />
                  {intl.formatMessage(messages.submitting)}
                </>
              ) : (
                intl.formatMessage(messages.submitQuiz)
              )}
            </Button>
          </div>
        </Card>

        {/* Confirmation Modal */}
        <StandardModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title={intl.formatMessage(messages.confirmSubmissionTitle)}
        >
          <StandardModal.Header>
            <StandardModal.Title>{intl.formatMessage(messages.confirmSubmissionTitle)}</StandardModal.Title>
          </StandardModal.Header>
          <StandardModal.Body>
            <p>{intl.formatMessage(messages.confirmSubmissionMessage)}</p>
          </StandardModal.Body>
          <StandardModal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowConfirmModal(false)}
            >
              {intl.formatMessage(messages.cancel)}
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmSubmit}
            >
              {intl.formatMessage(messages.confirmSubmit)}
            </Button>
          </StandardModal.Footer>
        </StandardModal>
      </div>
    );
  }

  // Show start quiz button
  return (
    <Card className="mt-4 p-4 text-center">
      <h3 className="mb-3">{intl.formatMessage(messages.finalEvaluationTitle)}</h3>
      <p className="text-muted mb-4">
        {intl.formatMessage(messages.finalEvaluationDescription)}
      </p>
      
      <Button
        variant="primary"
        size="lg"
        onClick={handleStartQuiz}
        disabled={loading}
      >
        {loading ? (
          <>
            <Spinner animation="border" size="sm" className="mr-2" />
            {intl.formatMessage(messages.loading)}
          </>
        ) : (
          intl.formatMessage(messages.startQuiz)
        )}
      </Button>
    </Card>
  );
};

FinalEvaluationQuiz.propTypes = {
  courseId: PropTypes.string.isRequired,
};

export default FinalEvaluationQuiz;