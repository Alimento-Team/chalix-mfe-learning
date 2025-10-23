import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Spinner } from '@openedx/paragon';
import FinalEvaluationQuiz from './FinalEvaluationQuiz';
import FinalEvaluationProject from './FinalEvaluationProject';
import { getFinalEvaluationConfig } from './api';
import { useFinalUnitDetection } from './hooks';

/**
 * Wrapper component that determines whether to show Quiz or Project evaluation
 * based on the evaluation_type from the API
 */
const FinalEvaluation = ({ courseId, sequenceId, unitId }) => {
  const isFinalUnit = useFinalUnitDetection(sequenceId, unitId);
  const [evaluationType, setEvaluationType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log('🎓 FinalEvaluation wrapper rendered:', { 
    courseId, 
    sequenceId, 
    unitId, 
    isFinalUnit,
    evaluationType
  });

  // Early return if not final unit
  if (!isFinalUnit) {
    console.log('🚫 Not rendering FinalEvaluation: not a final unit');
    return null;
  }

  useEffect(() => {
    if (isFinalUnit && courseId) {
      loadEvaluationType();
    }
  }, [isFinalUnit, courseId]);

  const loadEvaluationType = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Loading evaluation type for course:', courseId);
      const config = await getFinalEvaluationConfig(courseId);
      console.log('✅ Evaluation config loaded:', config);
      setEvaluationType(config.evaluation_type);
    } catch (err) {
      console.error('❌ Failed to load evaluation type:', err);
      setError(err);
      // Default to quiz if config fails to load
      setEvaluationType('quiz');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-4">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Render appropriate component based on evaluation type
  if (evaluationType === 'project') {
    console.log('📄 Rendering Project evaluation');
    return <FinalEvaluationProject courseId={courseId} sequenceId={sequenceId} unitId={unitId} />;
  }

  // Default to quiz (includes 'quiz' and null/undefined cases)
  console.log('📝 Rendering Quiz evaluation');
  return <FinalEvaluationQuiz courseId={courseId} sequenceId={sequenceId} unitId={unitId} />;
};

FinalEvaluation.propTypes = {
  courseId: PropTypes.string.isRequired,
  sequenceId: PropTypes.string.isRequired,
  unitId: PropTypes.string.isRequired,
};

export default FinalEvaluation;
