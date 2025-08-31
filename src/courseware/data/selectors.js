import { LOADED } from '@src/constants';

export function sequenceIdsSelector(state) {
  if (state.courseware.courseStatus !== LOADED) {
    return [];
  }
  const courseId = state.courseware.courseId;
  const courseMetadata = state.models.coursewareMeta[courseId];
  
  // Check if we have simplified structure (direct sequences without sections)
  if (courseMetadata && courseMetadata.sequenceIds) {
    return courseMetadata.sequenceIds;
  }
  
  // Fall back to traditional structure
  const { sectionIds = [] } = courseMetadata || {};
  
  if (sectionIds.length === 0) {
    // If no sections, try to get sequences directly from the sequences model
    const sequences = state.models.sequences || {};
    return Object.keys(sequences).filter(sequenceId => 
      sequences[sequenceId] && sequences[sequenceId].courseId === courseId
    );
  }

  return sectionIds
    .flatMap(sectionId => {
      const section = state.models.sections[sectionId];
      return section ? section.sequenceIds : [];
    });
}

export const getSequenceId = state => state.courseware.sequenceId;

export const getCourseOutline = state => state.courseware.courseOutline;

export const getCourseOutlineStatus = state => state.courseware.courseOutlineStatus;

export const getSequenceStatus = state => state.courseware.sequenceStatus;

export const getCoursewareOutlineSidebarSettings = state => state.courseware.coursewareOutlineSidebarSettings;

export const getCourseOutlineShouldUpdate = state => state.courseware.courseOutlineShouldUpdate;
