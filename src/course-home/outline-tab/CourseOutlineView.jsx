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
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch simplified course data from the new API
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setLoading(true);
        const response = await getAuthenticatedHttpClient().get(
          `${getConfig().LMS_BASE_URL}/api/course_home/simplified_outline/${courseId}`
        );
        setCourseData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching course data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  // Map content type to icon
  const getContentIcon = (contentType) => {
    switch (contentType) {
      case 'video':
        return LmsVideocamIcon;
      case 'slide':
        return BookIcon;
      case 'questions':
        return QuestionIcon;
      default:
        return LmsVideocamIcon;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="course-learning-view">
        <div className="course-overview-section">
          <div className="course-overview-card">
            <div className="course-overview-content">
              <h1 className="course-title-main">
                Đang tải khóa học...
              </h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="course-learning-view">
        <div className="course-overview-section">
          <div className="course-overview-card">
            <div className="course-overview-content">
              <h1 className="course-title-main">
                Lỗi tải khóa học
              </h1>
              <p className="instructor-info">
                {error}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No course data
  if (!courseData || !courseData.modules) {
    return (
      <div className="course-learning-view">
        <div className="course-overview-section">
          <div className="course-overview-card">
            <div className="course-overview-content">
              <h1 className="course-title-main">
                Không tìm thấy nội dung khóa học
              </h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { course_info: courseInfo, modules } = courseData;
  const selectedModule = modules[selectedModuleIndex];

  return (
    <div className="course-learning-view">
      {/* Course Overview Header */}
      <div className="course-overview-section">
        <div className="course-overview-card">
          <div className="course-overview-content">
            <h1 className="course-title-main">
              {courseInfo.title}
            </h1>
            <p className="instructor-info">
              Giảng viên: {courseInfo.instructor_name}
            </p>
            <div className="course-progress-info">
              <p className="total-hours">
                Tổng số chuyên đề: {courseInfo.total_modules}
              </p>
              <div className="progress-container">
                <ProgressBar
                  now={courseInfo.progress_percentage}
                  className="course-progress-bar"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="course-content-layout">
        {/* Left Column - Course Modules */}
        <div className="course-modules-panel">
          <div className="modules-list">
            {modules.map((module, index) => (
              <div
                key={module.id}
                className={classNames('module-item', {
                  active: index === selectedModuleIndex,
                  completed: module.complete,
                })}
                onClick={() => setSelectedModuleIndex(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedModuleIndex(index);
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
                      {module.title}
                    </h3>
                    <p className="module-subtitle">
                      {module.units_count} Nội dung
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Module Details with Units */}
        <div className="module-details-panel">
          {selectedModule && (
            <>
              {/* Module Header */}
              <div className="module-header">
                <div className="module-header-content">
                  <div className="module-icon-large">
                    <MenuIcon />
                  </div>
                  <div className="module-header-info">
                    <h2 className="module-detail-title">
                      {selectedModule.title}
                    </h2>
                    <p className="module-content-count">
                      {selectedModule.units_count} Nội dung
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

              {/* Units List */}
              <div className="content-list">
                {selectedModule.units && selectedModule.units.length > 0 ? (
                  selectedModule.units.map((unit) => {
                    const UnitIcon = getContentIcon(unit.content_type);
                    
                    return (
                      <div key={unit.id} className="content-item">
                        <div className="content-item-inner">
                          <div className="content-icon">
                            <UnitIcon />
                          </div>
                          <div className="content-info">
                            <h4 className="content-title">
                              <span className="content-type-label">{unit.title}</span>
                            </h4>
                            <p className="content-subtitle">
                              {unit.content_metadata?.subtitle || 'Nội dung học tập'}
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
