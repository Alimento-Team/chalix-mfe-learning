import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { useModel } from '../../../generic/model-store';
import { getCourseOutline, getCourseOutlineStatus, getCourseOutlineShouldUpdate } from '../../../courseware/data/selectors';
import { getCourseOutlineStructure } from '../../../courseware/data/thunks';
import { LOADED } from '../../../constants';

// Unit type icons as SVG components
const UNIT_TYPE_ICONS = {
  video: () => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
    </svg>
  ),
  problem: () => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
    </svg>
  ),
  html: () => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
    </svg>
  ),
  discussion: () => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>
    </svg>
  ),
  default: () => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
    </svg>
  ),
};

// Helper function to get unit icon
const getUnitIcon = (unitType) => {
  const IconComponent = UNIT_TYPE_ICONS[unitType] || UNIT_TYPE_ICONS.default;
  return <IconComponent />;
};

// Helper function to get unit type label
const getUnitTypeLabel = (unitType) => {
  const labels = {
    video: 'Video',
    problem: 'Problem',
    html: 'Text & Media',
    discussion: 'Discussion',
    default: 'Content'
  };
  return labels[unitType] || labels.default;
};

const CourseLearningLayout = ({
  courseId,
  sequenceId,
  unitId,
  onUnitSelect,
  onSequenceSelect,
  children,
}) => {
  const dispatch = useDispatch();
  
  // Get data from Redux store and models
  const course = useModel('coursewareMeta', courseId);
  const sequence = useModel('sequences', sequenceId);
  const unit = useModel('units', unitId);
  
  // Get course outline from Redux (this contains the structured course data)
  const { sections = {}, sequences = {}, units = {} } = useSelector(getCourseOutline);
  const courseOutlineStatus = useSelector(getCourseOutlineStatus);
  const courseOutlineShouldUpdate = useSelector(getCourseOutlineShouldUpdate);
  
  // Create simplified structure: extract all units from all sections/sequences
  const allUnits = [];
  const courseSections = Object.values(sections).filter(section => 
    course?.sectionIds?.includes(section.id) || section.courseId === courseId
  );
  
  // Flatten all units from all sections and sequences into a single array
  courseSections.forEach(section => {
    if (section.sequenceIds) {
      section.sequenceIds.forEach(seqId => {
        const seq = sequences[seqId];
        if (seq && seq.unitIds) {
          seq.unitIds.forEach(unitId => {
            const unit = units[unitId];
            if (unit) {
              allUnits.push({
                ...unit,
                sequenceId: seqId,
                sectionId: section.id,
                sequenceTitle: seq.title,
                sectionTitle: section.title
              });
            }
          });
        }
      });
    }
  });

  // Get current sequence from Redux data instead of useModel
  const currentSequence = sequences[sequenceId] || sequence;
  
  // Load course outline data if needed
  useEffect(() => {
    if (courseOutlineStatus !== LOADED || courseOutlineShouldUpdate) {
      dispatch(getCourseOutlineStructure(courseId));
    }
  }, [courseId, courseOutlineStatus, courseOutlineShouldUpdate, dispatch]);

  // Debug logging to help diagnose the issue
  useEffect(() => {
    console.log('=== COURSE OUTLINE DEBUG ===');
    console.log('Course ID:', courseId);
    console.log('Course Object:', course);
    console.log('Course Outline Status:', courseOutlineStatus);
    console.log('Sections:', sections);
    console.log('Sequences:', sequences);
    console.log('Units:', units);
    console.log('Course Sections (filtered):', courseSections);
    console.log('===========================');
  }, [courseOutlineStatus, sections, sequences, units, courseSections, courseId, course]);

  // Auto-scroll to course content layout when page loads
  useEffect(() => {
    const scrollToContent = () => {
      const courseContentElement = document.querySelector('[data-course-content]');
      if (courseContentElement) {
        courseContentElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    };

    // Delay scroll to ensure content is rendered
    const timer = setTimeout(scrollToContent, 500);
    return () => clearTimeout(timer);
  }, [courseOutlineStatus, unitId]); // Trigger when course loads or unit changes

  // Show loading state while course outline is being loaded or course data isn't available
  if (courseOutlineStatus !== LOADED || !course) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontFamily: 'Inter, sans-serif',
        fontSize: '16px',
        color: '#666666'
      }}>
        {courseOutlineStatus !== LOADED ? 'Loading course content...' : 'Loading course data...'}
      </div>
    );
  }

  const getUnitIcon = (unitType) => {
    const IconComponent = UNIT_TYPE_ICONS[unitType] || UNIT_TYPE_ICONS.default;
    return <IconComponent />;
  };

  const getUnitTypeLabel = (unitType) => {
    const labels = {
      video: 'Video bài giảng',
      problem: 'Trắc nghiệm',
      html: 'Slide bài giảng',
      discussion: 'Học trực tuyến',
      default: 'Nội dung',
    };
    return labels[unitType] || labels.default;
  };

  const calculateProgress = () => {
    // Simple progress calculation based on completed units from simplified structure
    if (!allUnits.length) return 0;
    
    const completedUnits = allUnits.filter(unit => unit?.complete).length;
    return Math.round((completedUnits / allUnits.length) * 100);
  };

  const progress = calculateProgress();

  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      width: '100%',
      minHeight: '100vh', // Change back to minHeight to show full content
      padding: '0'
    }}>
      {/* Single Unified Container */}
      <div style={{
        maxWidth: '100%',
        margin: '0',
        backgroundColor: '#ffffff',
        borderRadius: '0',
        border: 'none',
        overflow: 'hidden'
      }}>
        {/* Course Header Section */}
        <div style={{
          height: '120px',
          position: 'relative',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e0e0e0',
          padding: '0 29px'
        }}>
          {/* Course Duration */}
          <div style={{
            position: 'absolute',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '500',
            fontSize: '16px',
            left: '29px',
            color: '#000000',
            top: '66px'
          }}>
            {course?.duration ? `Tổng số giờ phải khóa học: ${course.duration}` : 'Course duration not available'}
          </div>
          
          {/* Instructor Info */}
          <div style={{
            position: 'absolute',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '500',
            fontSize: '16px',
            left: '29px',
            color: '#000000',
            top: '38px'
          }}>
            {course?.instructor ? `Giảng viên: ${course.instructor}` : 'Instructor information not available'}
          </div>
          
          {/* Course Title */}
          <div style={{
            position: 'absolute',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '500',
            fontSize: '18px',
            color: '#000000',
            top: '15px',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center'
          }}>
            {course?.title?.toUpperCase()}
          </div>
        </div>

        {/* Two Column Layout */}
        <div 
          data-course-content
          style={{
            display: 'flex',
            height: 'calc(100vh - 120px)' // Just subtract the course header height
          }}>
          {/* Left Panel - Course Outline */}
          <div style={{
            backgroundColor: '#ffffff',
            width: '400px', // Reduced from 547px to 400px
            borderRight: '1px solid #e0e0e0',
            padding: '20px', // Reduced padding from 24px to 20px
            height: '100%',
            overflow: 'auto' // Make left panel scrollable if content is too long
          }}>
            <h3 style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '18px',
              fontWeight: '600',
              color: '#000000',
              margin: '0 0 20px 0',
              borderBottom: '2px solid #00aaed',
              paddingBottom: '10px'
            }}>
              Course Content
            </h3>
            
            {allUnits.length > 0 ? (
              allUnits.map((unit, unitIndex) => {
                const isCurrentUnit = unit.id === unitId;
                
                return (
                  <div 
                    key={unit.id}
                    onClick={() => onUnitSelect(unit.id)}
                    style={{
                      backgroundColor: isCurrentUnit ? '#00aaed' : '#ffffff',
                      minHeight: '80px',
                      margin: '0 0 12px 0',
                      borderRadius: '8px',
                      width: '100%',
                      cursor: 'pointer',
                      border: isCurrentUnit ? '2px solid #00aaed' : '1px solid #e0e0e0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'all 0.2s ease',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {/* Unit Icon */}
                    <div style={{
                      color: isCurrentUnit ? '#ffffff' : '#00aaed',
                      marginRight: '16px',
                      flexShrink: 0,
                      fontSize: '20px'
                    }}>
                      {getUnitIcon(unit.type)}
                    </div>
                    
                    {/* Unit Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: '600',
                        fontSize: '16px',
                        color: isCurrentUnit ? '#ffffff' : '#000000',
                        lineHeight: '1.4',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {unit.title || `Unit ${unitIndex + 1}`}
                      </div>
                      
                      <div style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: '400',
                        fontSize: '14px',
                        color: isCurrentUnit ? 'rgba(255,255,255,0.8)' : '#666666'
                      }}>
                        {getUnitTypeLabel(unit.type)}
                        {unit.complete && (
                          <span style={{ marginLeft: '8px', color: isCurrentUnit ? '#ffffff' : '#4CAF50' }}>
                            ✓ Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ 
                textAlign: 'center', 
                color: '#666666', 
                marginTop: '40px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '16px',
                padding: '40px 20px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px dashed #ddd'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>No Course Content Available</div>
                <div style={{ fontSize: '14px', color: '#999', marginBottom: '16px' }}>
                  Course units will appear here once they are loaded and published
                </div>
                <div style={{ fontSize: '14px', color: '#007bff', marginBottom: '8px' }}>
                  <strong>If you just published content:</strong>
                </div>
                <div style={{ fontSize: '13px', color: '#666', textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
                  • Refresh this page to see published content<br/>
                  • Ensure units are properly created in Course Studio<br/>
                  • Check that units are properly published<br/>
                  • Allow a few minutes for content to propagate to the LMS
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Course Content */}
          <div style={{
            flex: '1',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            height: '100%' // Ensure full height
          }}>
            {/* Unit Header */}
            <div style={{
              backgroundColor: '#00aaed',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              flexShrink: 0 // Prevent header from shrinking
            }}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  marginRight: '12px', 
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {unitId && allUnits.length > 0 ? 
                    getUnitIcon(allUnits.find(u => u.id === unitId)?.type || 'default') : 
                    getUnitIcon('default')
                  }
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '600',
                    fontSize: '16px',
                    color: '#ffffff',
                    lineHeight: '1.4',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {unitId && allUnits.length > 0 
                      ? allUnits.find(u => u.id === unitId)?.title || 'Unit Content'
                      : course?.title || 'Course Content'
                    }
                  </div>
                  <div style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '400',
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.8)',
                    marginTop: '2px'
                  }}>
                    {unitId && allUnits.length > 0 
                      ? getUnitTypeLabel(allUnits.find(u => u.id === unitId)?.type || 'default')
                      : `${allUnits.length} units available`
                    }
                  </div>
                </div>
              </div>
              
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '20px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
            </div>

            {/* Main Content Area - Current Unit - Scrollable */}
            <div style={{
              flex: '1',
              padding: '0 0 0 20px', // Add left padding to prevent content from being hidden
              overflow: 'auto', // Independent scrolling for unit content
              height: 'calc(100% - 60px)', // Subtract header height
              paddingBottom: '60px' // Increase bottom padding to ensure content doesn't touch footer
            }}>
              {/* Render the actual unit content */}
              {unitId && allUnits.length > 0 ? (
                <div style={{
                  minHeight: '100%', // Use minHeight instead of height to allow content to expand
                  width: '100%'
                }}>
                  {/* Render children which should contain the actual unit content */}
                  {children}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#666666', 
                  marginTop: '40px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '16px',
                  padding: '40px 20px'
                }}>
                  {allUnits.length > 0 ? 'Select a unit to view content' : 'No units available'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

CourseLearningLayout.propTypes = {
  courseId: PropTypes.string.isRequired,
  sequenceId: PropTypes.string,
  unitId: PropTypes.string,
  onUnitSelect: PropTypes.func.isRequired,
  onSequenceSelect: PropTypes.func.isRequired,
  children: PropTypes.node,
};

CourseLearningLayout.defaultProps = {
  sequenceId: null,
  unitId: null,
  children: null,
};

export default CourseLearningLayout;
