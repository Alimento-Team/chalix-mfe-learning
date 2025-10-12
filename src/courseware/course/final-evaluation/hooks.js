import { useSelector } from 'react-redux';
import { useModel } from '../../../generic/model-store';
import { sequenceIdsSelector } from '../../data';

/**
 * Hook to determine if current unit is the final unit in the course
 * @param {string} currentSequenceId - Current sequence ID
 * @param {string} currentUnitId - Current unit ID
 * @returns {boolean} True if this is the final unit in the course
 */
export function useFinalUnitDetection(currentSequenceId, currentUnitId) {
  const sequenceIds = useSelector(sequenceIdsSelector);
  const sequence = useModel('sequences', currentSequenceId);
  const unit = useModel('units', currentUnitId);
  const courseId = useSelector(state => state.courseware.courseId);
  const courseStatus = useSelector(state => state.courseware.courseStatus);
  const sequenceStatus = useSelector(state => state.courseware.sequenceStatus);

  // Always add debug logging
  console.log('🔍 Final unit detection - Current state:', {
    currentSequenceId,
    currentUnitId,
    courseStatus,
    sequenceStatus,
    sequenceExists: !!sequence,
    unitExists: !!unit,
    sequenceDisplayName: sequence?.displayName,
    unitDisplayName: unit?.displayName
  });

  // If we don't have the necessary data, return false
  if (courseStatus !== 'loaded' || sequenceStatus !== 'loaded' || !currentSequenceId || !currentUnitId) {
    console.log('❌ Final unit detection failed: Missing required data');
    return false;
  }

  // Check by sequence display name first (most reliable)
  if (sequence?.displayName && sequence.displayName.includes('Kiểm tra cuối khóa')) {
    console.log('✅ Final evaluation detected by sequence name:', sequence.displayName);
    return true;
  }

  // Check by unit display name as fallback
  if (unit?.displayName && unit.displayName.includes('Kiểm tra cuối khóa')) {
    console.log('✅ Final evaluation detected by unit name:', unit.displayName);
    return true;
  }

  // Handle case where sequenceIds is undefined or empty
  if (!sequenceIds || !Array.isArray(sequenceIds) || sequenceIds.length === 0) {
    console.log('❌ Final unit detection failed: No sequence IDs available');
    return false;
  }

  // Handle case where sequence model doesn't exist
  if (!sequence || !sequence.unitIds || !Array.isArray(sequence.unitIds)) {
    console.log('❌ Final unit detection failed: Sequence model not available');
    return false;
  }

  const sequenceIndex = sequenceIds.indexOf(currentSequenceId);
  const unitIndex = sequence.unitIds.indexOf(currentUnitId);

  // Check if this is the last sequence
  const isLastSequence = sequenceIndex === sequenceIds.length - 1;
  // Check if this is the last unit in the sequence
  const isLastUnitInSequence = unitIndex === sequence.unitIds.length - 1;

  // Debug logging
  console.log('📊 Final unit detection by position:', {
    sequenceIndex,
    totalSequences: sequenceIds.length,
    unitIndex,
    totalUnits: sequence.unitIds.length,
    isLastSequence,
    isLastUnitInSequence,
    sequenceDisplayName: sequence.displayName,
    unitDisplayName: unit?.displayName
  });

  const isFinalByPosition = isLastSequence && isLastUnitInSequence;
  
  if (isFinalByPosition) {
    console.log('✅ Final unit detected by position!');
  } else {
    console.log('❌ Not final unit by position');
  }

  // Final unit is the last unit in the last sequence
  return isFinalByPosition;
}