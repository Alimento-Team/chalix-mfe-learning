import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import classNames from 'classnames';
import { ProgressBar, IconButton } from '@openedx/paragon';
import {
  MenuIcon,
  HeartIcon,
  PlayCircleIcon,
  BookIcon,
  QuestionIcon,
} from '@openedx/paragon/icons';

import { useModel } from '../../generic/model-store';
import './CourseOutlineView.scss';

const CourseOutlineView = () => {
  const { courseId } = useSelector(state => state.courseHome);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const {
    title,
  } = useModel('courseHomeMeta', courseId);

  const {
    courseBlocks: {
      courses,
      sections,
    },
  } = useModel('outline', courseId);

  const rootCourseId = courses && Object.keys(courses)[0];
  const courseSections = rootCourseId ? courses[rootCourseId].sectionIds.map(id => sections[id]).filter(Boolean) : [];

  // Fallback data when no course sections are available
  const fallbackSections = [
    {
      id: 'section-1',
      title: 'Chuyên đề 01: Khái niệm về Nodejs. Cài đặt và setup môi trường chạy project',
      sequenceIds: ['seq-1', 'seq-2'],
      complete: false,
    },
    {
      id: 'section-2',
      title: 'Chuyên đề 02: Khởi tạo project, chạy Nodejs với câu lệnh HelloWorld',
      sequenceIds: ['seq-3', 'seq-4', 'seq-5', 'seq-6'],
      complete: false,
    },
    {
      id: 'section-3',
      title: 'Chuyên đề 03: Tìm hiểu về ExpressJs Framework',
      sequenceIds: ['seq-7', 'seq-8'],
      complete: false,
    },
    {
      id: 'section-4',
      title: 'Chuyên đề 04: Các lệnh Git. Học về kiến thức làm chung dự án',
      sequenceIds: ['seq-9', 'seq-10'],
      complete: false,
    },
    {
      id: 'section-5',
      title: 'Chuyên đề 05: Khái niệm CI/CD',
      sequenceIds: ['seq-11', 'seq-12'],
      complete: false,
    },
    {
      id: 'section-6',
      title: 'Chuyên đề 06: Khái niệm về Nodejs. Cài đặt và setup môi trường chạy project',
      sequenceIds: ['seq-13', 'seq-14'],
      complete: false,
    },
  ];

  // Use actual course sections if available, otherwise use fallback
  const displaySections = courseSections.length > 0 ? courseSections : fallbackSections;

  // Mock data for course content types (this would come from API in real implementation)
  const getContentTypes = () => [
    {
      id: 'online-learning',
      title: 'Học trực tuyến',
      subtitle: '29/10/2025 10:30 | 300 Min',
      icon: PlayCircleIcon,
      type: 'video',
      description: 'đề 01: Khái niệm về Nodejs. Cài đặt và setup môi trường chạy project',
    },
    {
      id: 'video-lectures',
      title: 'Video bài giảng',
      subtitle: '30 Bài giảng',
      icon: PlayCircleIcon,
      type: 'video',
      description: 'đề 01: Khái niệm về Nodejs. Cài đặt và setup môi trường chạy project',
    },
    {
      id: 'lecture-slides',
      title: 'Slide bài giảng',
      subtitle: '15 Bài giảng',
      icon: BookIcon,
      type: 'document',
      description: '',
    },
    {
      id: 'quiz',
      title: 'Trắc nghiệm',
      subtitle: '10 Bài trắc nghiệm',
      icon: QuestionIcon,
      type: 'quiz',
      description: '',
    },
  ];

  const selectedSection = displaySections[selectedModuleIndex];
  const contentTypes = selectedSection ? getContentTypes() : [];

  // Calculate progress (mock calculation)
  const totalHours = 40;
  const completedHours = Math.floor(totalHours * 0.773); // About 77.3% as shown in design
  const progressPercentage = (completedHours / totalHours) * 100;

  const instructorName = 'Nguyễn Văn A'; // This would come from API

  return (
    <div className="course-learning-view">
      {/* Course Overview Header */}
      <div className="course-overview-section">
        <div className="course-overview-card">
          <div className="course-overview-content">
            <h1 className="course-title-main">
              {title || 'KHÓA HỌC LẬP TRÌNH NODEJS TỪ ZERO ĐẾN MASTER'}
            </h1>
            <p className="instructor-info">
              Giảng viên: {instructorName}
            </p>
            <div className="course-progress-info">
              <p className="total-hours">
                Tổng số giờ phải khóa học: {totalHours}h
              </p>
              <div className="progress-container">
                <ProgressBar
                  now={progressPercentage}
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
            {displaySections.map((section, index) => (
              <div
                key={section.id}
                className={classNames('module-item', {
                  active: index === selectedModuleIndex,
                  completed: section.complete,
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
                      {section.title}
                    </h3>
                    <p className="module-subtitle">
                      {section.sequenceIds?.length || 2} Nội dung
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Module Details */}
        <div className="module-details-panel">
          {selectedSection && (
            <>
              {/* Module Header */}
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
                      {selectedSection.sequenceIds?.length || 2} Nội dung
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

              {/* Content List */}
              <div className="content-list">
                {contentTypes.map((content) => (
                  <div key={content.id} className="content-item">
                    <div className="content-item-inner">
                      <div className="content-icon">
                        <content.icon />
                      </div>
                      <div className="content-info">
                        <h4 className="content-title">
                          <span className="content-type-label">{content.title}</span>
                          {content.description && (
                            <span className="content-description">
                              {` ${content.description}`}
                            </span>
                          )}
                        </h4>
                        <p className="content-subtitle">
                          {content.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseOutlineView;
