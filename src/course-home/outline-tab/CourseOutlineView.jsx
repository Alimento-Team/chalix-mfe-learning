import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import classNames from 'classnames';
import { ProgressBar, IconButton } from '@openedx/paragon';
import {
  MenuIcon,
  Favorite as HeartIcon,
  LmsVideocam as LmsVideocamIcon,
  Book as BookIcon,
  HelpOutline as QuestionIcon,
} from '@openedx/paragon/icons';

import { useModel } from '../../generic/model-store';
import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import './CourseOutlineView.scss';

const CourseOutlineView = () => {
  const { courseId } = useSelector(state => state.courseHome);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [sequences, setSequences] = useState({});
  const [loading, setLoading] = useState(false);

  const {
    title,
    originalUserIsStaff,
    isStaff,
  } = useModel('courseHomeMeta', courseId);

  const {
    courseBlocks: {
      courses,
      sections,
      sequences: outlineSequences,
    },
  } = useModel('outline', courseId);

  const rootCourseId = courses && Object.keys(courses)[0];
  const courseSections = rootCourseId ? courses[rootCourseId].sectionIds.map(id => sections[id]).filter(Boolean) : [];

  // Get selected section
  const selectedSection = courseSections[selectedSectionIndex];

  // Fetch sequence details when section changes
  useEffect(() => {
    if (selectedSection && selectedSection.sequenceIds) {
      setLoading(true);
      // Get detailed sequence information for the selected section
      const fetchSequenceDetails = async () => {
        try {
          const sequencePromises = selectedSection.sequenceIds.map(async (sequenceId) => {
            if (outlineSequences[sequenceId]) {
              const sequence = outlineSequences[sequenceId];
              
              // Try to get additional metadata if available
              try {
                const { data } = await getAuthenticatedHttpClient().get(
                  `${getConfig().LMS_BASE_URL}/api/courseware/sequence/${sequenceId}`
                );
                
                return {
                  ...sequence,
                  ...data,
                  type: sequence.icon || 'video', // Default to video if no icon specified
                };
              } catch (error) {
                // If detailed metadata fails, use outline data
                return {
                  ...sequence,
                  type: sequence.icon || 'video',
                };
              }
            }
            return null;
          });

          const sequenceDetails = await Promise.all(sequencePromises);
          const validSequences = sequenceDetails.filter(Boolean);
          
          setSequences(prev => ({
            ...prev,
            [selectedSection.id]: validSequences,
          }));
        } catch (error) {
          console.error('Error fetching sequence details:', error);
          // Fallback to outline sequences
          const fallbackSequences = selectedSection.sequenceIds.map(id => outlineSequences[id]).filter(Boolean);
          setSequences(prev => ({
            ...prev,
            [selectedSection.id]: fallbackSequences,
          }));
        } finally {
          setLoading(false);
        }
      };

      fetchSequenceDetails();
    }
  }, [selectedSection, outlineSequences]);

  // Get progress data from course metadata
  const courseProgress = useModel('outline', courseId);
  const progressData = courseProgress?.courseBlocks;

  // Calculate progress
  const calculateProgress = () => {
    if (!progressData || !courseSections) return { completed: 0, total: 100 };
    
    let totalSections = courseSections.length;
    let completedSections = courseSections.filter(section => section.complete).length;
    
    return {
      completed: completedSections,
      total: totalSections,
      percentage: totalSections > 0 ? (completedSections / totalSections) * 100 : 0,
    };
  };

  const progress = calculateProgress();

  // Map sequence type to icon and display info
  const getContentTypeInfo = (sequence) => {
    // Determine content type based on sequence properties
    let icon = LmsVideocamIcon;
    let type = 'video';
    let subtitle = '';

    if (sequence.icon) {
      switch (sequence.icon) {
        case 'video':
        case 'problem':
          icon = LmsVideocamIcon;
          type = 'video';
          break;
        case 'other':
        default:
          icon = BookIcon;
          type = 'document';
          break;
      }
    }

    // Generate subtitle based on sequence metadata
    if (sequence.effortTime) {
      subtitle = sequence.effortTime;
    } else if (sequence.due) {
      const dueDate = new Date(sequence.due);
      subtitle = dueDate.toLocaleDateString('vi-VN');
    } else {
      subtitle = 'Nội dung học tập';
    }

    return { icon, type, subtitle };
  };

  // Get instructor name from course metadata
  const getInstructorName = () => {
    // This would come from course metadata - for now use a default
    // In a real implementation, this should be added to the course metadata API
    return 'Giảng viên khóa học';
  };

  // Early return if no course data
  if (!courseSections || courseSections.length === 0) {
    return (
      <div className="course-learning-view">
        <div className="course-overview-section">
          <div className="course-overview-card">
            <div className="course-overview-content">
              <h1 className="course-title-main">
                {title || 'Đang tải khóa học...'}
              </h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedSequences = sequences[selectedSection?.id] || [];

  return (
    <div className="course-learning-view">
      {/* Course Overview Header */}
      <div className="course-overview-section">
        <div className="course-overview-card">
          <div className="course-overview-content">
            <h1 className="course-title-main">
              {title || 'KHÓA HỌC TRỰC TUYẾN'}
            </h1>
            <p className="instructor-info">
              Giảng viên: {getInstructorName()}
            </p>
            <div className="course-progress-info">
              <p className="total-hours">
                Tổng số chuyên đề: {courseSections.length}
              </p>
              <div className="progress-container">
                <ProgressBar
                  now={progress.percentage}
                  className="course-progress-bar"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="course-content-layout">
        {/* Left Column - Course Modules/Sections */}
        <div className="course-modules-panel">
          <div className="modules-list">
            {courseSections.map((section, index) => (
              <div
                key={section.id}
                className={classNames('module-item', {
                  active: index === selectedSectionIndex,
                  completed: section.complete,
                })}
                onClick={() => setSelectedSectionIndex(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedSectionIndex(index);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="module-content">
                  <div className="module-icon">
                    <MenuIcon />
                  </div>
                  <div className="module-info">
                    <h3 className="module-title">
                      {section.title}
                    </h3>
                    <p className="module-subtitle">
                      {section.sequenceIds?.length || 0} Nội dung
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Section Details with Sequences */}
        <div className="module-details-panel">
          {selectedSection && (
            <>
              {/* Section Header */}
              <div className="module-header">
                <div className="module-header-content">
                  <div className="module-icon-large">
                    <MenuIcon />
                  </div>
                  <div className="module-header-info">
                    <h2 className="module-detail-title">
                      {selectedSection.title}
                    </h2>
                    <p className="module-content-count">
                      {selectedSection.sequenceIds?.length || 0} Nội dung
                    </p>
                  </div>
                  <div className="module-actions">
                    <IconButton
                      src={HeartIcon}
                      iconAs={HeartIcon}
                      alt="Favorite"
                      className="favorite-button"
                    />
                  </div>
                </div>
              </div>

              {/* Sequences List */}
              <div className="content-list">
                {loading ? (
                  <div className="content-item">
                    <div className="content-item-inner">
                      <div className="content-info">
                        <h4 className="content-title">
                          Đang tải nội dung...
                        </h4>
                      </div>
                    </div>
                  </div>
                ) : selectedSequences.length > 0 ? (
                  selectedSequences.map((sequence) => {
                    const { icon: SequenceIcon, type, subtitle } = getContentTypeInfo(sequence);
                    
                    return (
                      <div key={sequence.id} className="content-item">
                        <div className="content-item-inner">
                          <div className="content-icon">
                            <SequenceIcon />
                          </div>
                          <div className="content-info">
                            <h4 className="content-title">
                              <span className="content-type-label">{sequence.title}</span>
                            </h4>
                            <p className="content-subtitle">
                              {subtitle}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="content-item">
                    <div className="content-item-inner">
                      <div className="content-info">
                        <h4 className="content-title">
                          Chưa có nội dung học tập
                        </h4>
                        <p className="content-subtitle">
                          Nội dung sẽ được cập nhật sớm
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseOutlineView;
