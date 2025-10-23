import { 
  getFinalEvaluationConfig as getFinalEvaluationConfigApi,
  getFinalEvaluationQuiz as getFinalEvaluationQuizApi,
  submitFinalEvaluationQuiz as submitFinalEvaluationQuizApi,
  getFinalEvaluationResult as getFinalEvaluationResultApi,
  submitFinalEvaluationProject as submitFinalEvaluationProjectApi
} from '../../data/api';

// Re-export the functions for consistency
export const getFinalEvaluationConfig = getFinalEvaluationConfigApi;
export const getFinalEvaluationQuiz = getFinalEvaluationQuizApi; 
export const submitFinalEvaluationQuiz = submitFinalEvaluationQuizApi;
export const getFinalEvaluationResult = getFinalEvaluationResultApi;
export const submitFinalEvaluationProject = submitFinalEvaluationProjectApi;