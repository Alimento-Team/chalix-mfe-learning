import React, { useState, useEffect, useRef, useMemo } from 'react';
import { isCourseStarted } from '../../utils/courseStatus';
import { useSelector } from 'react-redux';
import classNames from 'classnames';
import { ProgressBar, IconButton, AlertModal } from '@openedx/paragon';
import {
  MenuIcon,
  Favorite as HeartIcon,
  LmsVideocam as LmsVideocamIcon,
  Book as BookIcon,
  HelpOutline as QuestionIcon,
} from '@openedx/paragon/icons';

import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import urls from '../../data/services/lms/urls';
import './CourseOutlineView.scss';
import ReviewWidget from './widgets/ReviewWidget';
import { getOutlineTabData, getCourseHomeCourseMetadata } from '../data/api';
import { 
  getUnitMedia, 
  getUnitVerticalData, 
  getVerticalData,
  getCourseVerticalChildren,
  isUnitBlock, 
  isSequentialBlock, 
  getSequentialChildren,
  getCourseAggregate,
} from './data/unitContentApi';
import MediaListModal from './components/MediaListModal';
import QuizRenderer from './components/QuizRenderer';
import FileViewer from './components/FileViewer';


const CourseOutlineView = () => {
  // All hooks must be at the top level, before any conditional returns
  const { courseId } = useSelector(state => state.courseHome);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const layoutRef = useRef(null);
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  // Selected unit index and object (must be at top level for React hooks)
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(0);
  // For modal content selection (video/slide/quiz)
  const [modalType, setModalType] = useState(null); // 'video' | 'slide' | 'questions' | null
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null); // { type, id, title, url }
  const [showQuizListInline, setShowQuizListInline] = useState(false);
  // State for real content lists (must be before any logic)
  const [videoList, setVideoList] = useState([]);
  const [slideList, setSlideList] = useState([]);
  const [quizList, setQuizList] = useState([]);

  // Fetch course data preferring the LMS aggregate endpoint, with fallbacks
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setLoading(true);
        let data = null;

        // 1) Try new LMS aggregate endpoint
        try {
          const agg = await getCourseAggregate(courseId);
          // Map aggregate payload to UI-friendly structure used below
          const modules = (agg.topics || []).map(section => ({
            id: section.id,
            title: section.displayName || section.title || 'Chuyên đề',
            units_count: (section.subsections || []).reduce((acc, ss) => acc + (ss.units?.length || 0), 0),
            complete: false,
            units: (section.subsections || []).flatMap(ss => (ss.units || []).map(u => ({
              id: u.id,
              title: u.displayName || u.title || 'Nội dung học tập',
              // Decide a representative type for the unit for iconography
              content_type: (u.videos?.length ? 'video' : (u.slides?.length ? 'slide' : ((u.quizzes?.length ? 'questions' : 'vertical')))),
              content_metadata: { subtitle: (ss.displayName || ss.title) ? `Thuộc: ${ss.displayName || ss.title}` : 'Nội dung học tập' },
              complete: false,
            }))),
          }));

          data = {
            course_info: {
              title: agg?.details?.displayName || courseId,
              instructor_name: agg?.details?.org || 'Course Instructor',
              total_units: modules.reduce((acc, m) => acc + m.units_count, 0),
              completed_units: modules.reduce((acc, m) => acc + (m.complete ? m.units_count : 0), 0),
              progress_percentage: 0,
              meeting_url: agg?.config?.marketing_url || agg?.config?.social_sharing_url || null,
              start: agg?.details?.start_date || agg?.details?.start || null,
            },
            modules,
          };
        } catch (e) {
          // Ignore and try next fallback
        }

        // 2) Fallback to simplified_outline endpoint
        if (!data) {
          const response = await getAuthenticatedHttpClient().get(
            `${getConfig().LMS_BASE_URL}/api/course_home/simplified_outline/${courseId}`
          );
          data = response.data;
        }

        // 3) Fallback: if modules are missing/undefined, derive a minimal structure from the legacy outline API
        if (!data || !Array.isArray(data.modules)) {
          try {
            const [outline, meta] = await Promise.all([
              getOutlineTabData(courseId),
              getCourseHomeCourseMetadata(courseId, 'outline'),
            ]);

            const { courses = {}, sections = {}, sequences = {} } = outline?.courseBlocks || {};
            const rootCourseId = courses && Object.keys(courses)[0];
            const sectionIds = rootCourseId ? courses[rootCourseId].sectionIds || [] : [];
            const modules = sectionIds
              .map(id => sections[id])
              .filter(Boolean)
              .map(section => {
                const unitList = (section.sequenceIds || [])
                  .map(seqId => sequences[seqId])
                  .filter(Boolean)
                  .map(seq => {
                    const t = (seq.title || '').toLowerCase();
                    let content_type = 'vertical';
                    if (/kiểm tra|quiz|test|exam/.test(t)) content_type = 'questions';
                    else if (/slide|slides|presentation|trình chiếu|bản trình/.test(t)) content_type = 'slide';
                    // Only assign 'vertical', 'questions', or 'slide' (never default to 'video')
                    return {
                      id: seq.id,
                      title: seq.title,
                      content_type,
                      content_metadata: { subtitle: seq.description || 'Nội dung học tập' },
                      complete: !!seq.complete,
                    };
                  });
                return {
                  id: section.id,
                  title: section.title,
                  units_count: unitList.length,
                  complete: !!section.complete,
                  units: unitList,
                };
              });

            // If course has no explicit sections (or only a single module) but has many sequences,
            // derive modules directly from sequences so the left panel shows each topic separately.
            if ((!modules || modules.length <= 1) && sequences && Object.keys(sequences).length > 0) {
              const seqModules = Object.values(sequences)
                .filter(Boolean)
                .map(seq => ({
                  id: seq.id,
                  title: seq.title || 'Chuyên đề',
                  units_count: 1,
                  complete: !!seq.complete,
                  units: [{
                    id: seq.id,
                    title: seq.display_name || seq.title || 'Nội dung học tập',
                    content_type: (() => {
                      const t = ((seq.title || '') + '').toLowerCase();
                      if (/kiểm tra|quiz|test|exam/.test(t)) return 'questions';
                      if (/slide|slides|presentation|trình chiếu|bản trình/.test(t)) return 'slide';
                      return 'video';
                    })(),
                    content_metadata: { subtitle: seq.description || 'Nội dung học tập' },
                    complete: !!seq.complete,
                  }],
                }));
              // prefer section-derived modules if they have more than one, otherwise use sequence modules
              if (seqModules.length > 1 && (!modules || modules.length <= 1)) {
                data = {
                  course_info: data.course_info,
                  modules: seqModules,
                };
              }
            }

            data = {
              course_info: {
                title: meta?.title || courseId,
                instructor_name: meta?.instructorName || 'Course Instructor',
                total_units: modules.reduce((acc, m) => acc + m.units_count, 0),
                completed_units: modules.reduce((acc, m) => acc + (m.complete ? m.units_count : 0), 0),
                progress_percentage: 0,
                start: meta?.start_date || meta?.start || null,
              },
              modules,
            };
          } catch (fallbackErr) {
            // Leave data as-is if fallback fails
          }
        }

  // Attempt to discover a meeting URL anywhere in the returned payload (CMS-configured URL
        // may appear under different keys depending on how the course was authored). Walk the
        // object and pick the first http(s) URL-looking value we find.
        const findFirstUrlInObject = (obj) => {
          if (!obj || typeof obj !== 'object') return null;
          const stack = [obj];
          while (stack.length) {
            const current = stack.pop();
            for (const key of Object.keys(current)) {
              const val = current[key];
              if (typeof val === 'string' && /^https?:\/\//i.test(val)) {
                return val;
              }
              if (val && typeof val === 'object') stack.push(val);
            }
          }
          return null;
        };

        try {
          const meetingUrl = findFirstUrlInObject(data) || null;
          if (!data.course_info) data.course_info = {};
          // prefer an explicit meeting_url value if present, otherwise use discovered URL
          data.course_info.meeting_url = data.course_info.meeting_url || data.course_info.meetingUrl || meetingUrl;
        } catch (e) {
          // no-op; defensive
        }

        // 4) Enrich from Chalix course config (same source used by Authoring)
        // This provides: instructor, estimated_hours, online_course_link
        try {
          const http = getAuthenticatedHttpClient();
          const chalixUrl = urls.courseDetail(courseId);
          const resp = await http.get(chalixUrl, { withCredentials: true, headers: { 'USE-JWT-COOKIE': 'true' } });
          const cfg = resp?.data || {};
          if (!data.course_info) data.course_info = {};
          if (cfg.instructor) {
            data.course_info.instructor_name = cfg.instructor;
          }
          if (cfg.subtitle) data.course_info.subtitle = cfg.subtitle;
          if (cfg.duration) data.course_info.duration = cfg.duration;
          if (cfg.description) data.course_info.description = cfg.description;
          if (typeof cfg.estimated_hours !== 'undefined' && cfg.estimated_hours !== null) {
            data.course_info.estimated_hours = Number(cfg.estimated_hours);
          }
          if (cfg.online_course_link) {
            // Authoritative meeting link from Chalix config
            data.course_info.meeting_url = cfg.online_course_link;
          }
          // Add additional Chalix course-detail fields into course_info for the
          // learning UI to render: short description, course code/key, type, level,
          // and required passing grade.
          if (cfg.short_description) data.course_info.short_description = cfg.short_description;
          if (cfg.course_code) data.course_info.course_code = cfg.course_code;
          if (cfg.course_key) data.course_info.course_key = cfg.course_key;
          if (cfg.course_type) data.course_info.course_type = cfg.course_type;
          if (cfg.course_level) data.course_info.course_level = cfg.course_level;
          if (typeof cfg.required_grade !== 'undefined' && cfg.required_grade !== null) {
            // store as percentage integer when possible
            const rg = Number(cfg.required_grade);
            data.course_info.required_grade = Number.isFinite(rg) ? rg : cfg.required_grade;
          }
          // Ensure start date is propagated into the UI-friendly `course_info.start` field.
          // The backend now returns canonical `start_date`; fall back to legacy `start` if present.
          data.course_info.start = data.course_info.start || cfg.start_date || cfg.start || null;
        } catch (e) {
          // Soft-fail: fall back to earlier data if Chalix config not available
        }

        setCourseData(data);
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

  // Compute allUnits and selectedUnit; memoize to keep stable references between renders
  const allUnits = useMemo(() => {
    if (!courseData || !Array.isArray(courseData.modules)) {
      return [];
    }
    const list = [];
    courseData.modules.forEach((module) => {
      if (Array.isArray(module.units)) {
        module.units.forEach((unit) => {
          list.push({ ...unit, sectionTitle: module.title });
        });
      }
    });
    return list;
  }, [courseData]);

  const selectedUnit = useMemo(() => allUnits[selectedUnitIndex] || null, [allUnits, selectedUnitIndex]);
  const selectedUnitId = selectedUnit?.id;

  // Make courseInfo/modules available as stable references for hooks used below.
  // These use optional chaining so they are safe to evaluate even when courseData is null.
  const modules = courseData?.modules || [];
  const courseInfo = courseData?.course_info || {};

  // Helper to format a course date value to "DD/mm/YYYY".
  // Accepts Date objects, ISO strings, or timestamps. Returns 'Chưa đặt' when falsy.
  const formatCourseDate = (dateVal) => {
    if (!dateVal) return 'Chưa đặt';
    try {
      const d = (typeof dateVal === 'string' || typeof dateVal === 'number') ? new Date(dateVal) : dateVal;
      if (!(d instanceof Date) || Number.isNaN(d.getTime())) return String(dateVal);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch (e) {
      return String(dateVal);
    }
  };

  // Compute a reliable topics/modules count: prefer explicit modules array length,
  // but fall back to counting unique section titles found in flattened allUnits.
  // This is a hook and must run on every render (unconditional) to preserve hook order.
  const topicsCount = useMemo(() => {
    if (modules && Array.isArray(modules) && modules.length > 0) return modules.length;
    const set = new Set();
    allUnits.forEach((u) => {
      if (u.sectionTitle) set.add(u.sectionTitle);
      else if (u.sectionId) set.add(u.sectionId);
    });
    return set.size || 0;
  }, [modules, allUnits]);

  // Fetch real content when selectedUnit changes
  // This must be before any early returns to avoid hook order errors
  useEffect(() => {
    if (!selectedUnitId || !selectedUnit) {
      setVideoList([]);
      setSlideList([]);
      setQuizList([]);
      return;
    }
    
    // Handle sequential blocks by getting their vertical children first
    if (isSequentialBlock(selectedUnit)) {
      console.log('Selected unit is a sequential, fetching children:', selectedUnitId);
  getSequentialChildren(selectedUnitId, { debug: debugEnabled }).then(verticals => {
        console.log('Found verticals in sequential:', verticals);
        
        // If we have verticals, try to get content from the first one
        if (verticals && verticals.length > 0) {
          const firstVertical = verticals[0];
          
          // Fetch videos from the first vertical
          getUnitMedia(firstVertical.id, 'video').then(res => {
            setVideoList(Array.isArray(res) ? res : res.results || []);
          }).catch(() => setVideoList([]));
          
          // Fetch slides from the first vertical
          getUnitMedia(firstVertical.id, 'slide').then(res => {
            setSlideList(Array.isArray(res) ? res : res.results || []);
          }).catch(() => setSlideList([]));
          
          // Fetch quiz/problem blocks from the first vertical
          getUnitVerticalData(firstVertical.id, { debug: debugEnabled }).then(res => {
            const children = res?.xblockInfo?.children || [];
            const quizzes = children.filter(
              c => c.category === 'problem' || c.category === 'quiz' || c.category === 'questions'
            ).map(q => ({
              id: q.id,
              title: q.displayName || 'Quiz',
              url: null, // Could be a link to a quiz player or modal
            }));
            setQuizList(quizzes);
          }).catch(() => setQuizList([]));
        } else {
          // No verticals found, clear content
          setVideoList([]);
          setSlideList([]);
          setQuizList([]);
        }
      }).catch(() => {
        setVideoList([]);
        setSlideList([]);
        setQuizList([]);
      });
    }
    // Only fetch for vertical/unit types using isUnitBlock helper
    else if (isUnitBlock(selectedUnit)) {
      console.log('Selected unit is a vertical/unit, fetching content directly:', selectedUnitId);
      
      // Fetch videos
      getUnitMedia(selectedUnitId, 'video').then(res => {
        setVideoList(Array.isArray(res) ? res : res.results || []);
      }).catch(() => setVideoList([]));
      // Fetch slides
      getUnitMedia(selectedUnitId, 'slide').then(res => {
        setSlideList(Array.isArray(res) ? res : res.results || []);
      }).catch(() => setSlideList([]));
      // Fetch quiz/problem blocks
  getUnitVerticalData(selectedUnitId, { debug: debugEnabled }).then(res => {
        // Find children of type 'problem' or 'quiz'
        const children = res?.xblockInfo?.children || [];
        const quizzes = children.filter(
          c => c.category === 'problem' || c.category === 'quiz' || c.category === 'questions'
        ).map(q => ({
          id: q.id,
          title: q.displayName || 'Quiz',
          url: null, // Could be a link to a quiz player or modal
        }));
        setQuizList(quizzes);
      }).catch(() => setQuizList([]));
    } else {
      console.log('Selected unit is not a valid content block:', selectedUnitId, selectedUnit.content_type);
      setVideoList([]);
      setSlideList([]);
      setQuizList([]);
    }
  }, [selectedUnitId, debugEnabled]);

  // Map content type to icon
  const getContentIcon = (contentType) => {
    switch (contentType) {
      case 'video':
        return LmsVideocamIcon;
      case 'slide':
        return BookIcon;
      case 'questions':
      case 'quiz':
      case 'problem':
        return QuestionIcon;
      case 'vertical':
      case 'unit':
      case 'sequential':
        return BookIcon; // Default to book icon for structural content
      case 'LmsVideocam':
        return LmsVideocamIcon;
      case 'Book':
        return BookIcon;
      case 'HelpOutline':
        return QuestionIcon;
      default:
        // Don't warn for common structural types, just use a default icon
        return BookIcon;
    }
  };

  // Show loading state
  // All hooks above! Now safe to return early if needed
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

  // Use the previously-declared `courseInfo` and `modules` variables which
  // are safe to reference even when `courseData` is null.

  // NOTE: loading/error/no-data early returns exist further down (render block).
  // topicsCount and courseInfo/modules are intentionally computed above so hooks
  // are executed unconditionally and hook ordering remains stable across renders.

  const realContent = {
    video: videoList,
    slide: slideList,
    questions: quizList,
  };

  // Helper to get label for type
  const typeLabel = {
    video: 'Video bài giảng',
    slide: 'Slide bài giảng',
    questions: 'Trắc nghiệm',
  };

  return (
    <div className="course-learning-view">
      {/* Course Overview Header */}
      <div className="course-overview-section">
        <div className="course-overview-card">
          <div className="course-overview-content">
            <h1 className="course-title-main">
              {courseInfo.title}
            </h1>
            {/* Two-column details grid matching the desired layout (no action buttons) */}
            <div className="course-details-grid" style={{ marginTop: 12 }}>
              <div className="course-detail-column">
                <div className="course-detail-row">
                  <div className="course-detail-label">Giảng viên:</div>
                  <div className="course-detail-value">{courseInfo.instructor_name || 'Chưa đặt'}</div>
                </div>

                <div className="course-detail-row">
                  <div className="course-detail-label">Thời lượng dự kiến:</div>
                  <div className="course-detail-value">{courseInfo.duration || (Number.isFinite(courseInfo?.estimated_hours) ? `${courseInfo.estimated_hours} giờ` : 'Chưa đặt')}</div>
                </div>

                <div className="course-detail-row">
                  <div className="course-detail-label">Loại khoá học:</div>
                  <div className="course-detail-value">{courseInfo.course_type || 'Chưa đặt'}</div>
                </div>
                <div className="course-detail-row">
                  <div className="course-detail-label">Mô tả ngắn:</div>
                  <div className="course-detail-value">{courseInfo.short_description || 'Chưa có'}</div>
                </div>
              </div>

              <div className="course-detail-column">
                <div className="course-detail-row">
                  <div className="course-detail-label">Trình độ:</div>
                  <div className="course-detail-value">{courseInfo.course_level || 'Chưa đặt'}</div>
                </div>

                <div className="course-detail-row">
                  <div className="course-detail-label">Ngày bắt đầu:</div>
                  <div className="course-detail-value">{formatCourseDate(courseInfo.start || courseInfo.start_date || null)}</div>
                </div>

                <div className="course-detail-row">
                  <div className="course-detail-label">Ngày kết thúc:</div>
                  <div className="course-detail-value">{formatCourseDate(courseInfo.end_date || courseInfo.end || null)}</div>
                </div>

                {/* Placeholder for spacing to align with left column */}
                <div />
              </div>
            </div>

            {/* Status badge and meeting link - centered and stacked with vertical gap */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ marginRight: 8, fontWeight: 700, color: '#333' }}>Trạng thái Khoá học:</span>
                <span
                  style={{
                    background: isCourseStarted(courseInfo) ? '#e6f4ea' : '#f5f5f5',
                    color: isCourseStarted(courseInfo) ? '#2e7d32' : '#616161',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontWeight: 600,
                    fontSize: '14px',
                    display: 'inline-block',
                  }}
                >
                  {isCourseStarted(courseInfo) ? 'Đã bắt đầu' : 'Chưa bắt đầu'}
                </span>
              </div>

              <div>
                {courseInfo.meeting_url ? (
                  <a
                    href={courseInfo.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="meeting-link-button"
                  >
                    Tham gia lớp học trực tuyến
                  </a>
                ) : ('-')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Authoring style */}
      <div
        className="course-authoring-layout"
        ref={layoutRef}
        style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px', ...(debugEnabled ? { outline: '3px dashed rgba(255,0,0,0.6)' } : {}) }}
      >
        {/* Left Panel: Modules with nested units (read-only, mirror authoring but without edit actions) */}
        <div ref={leftPanelRef} className="authoring-section-list" style={{ gridColumn: '1 / 2', ...(debugEnabled ? { outline: '2px solid rgba(0,128,255,0.6)', background: 'rgba(0,128,255,0.02)' } : {}) }}>
          <div className="modules-scroll">
            {modules.map((module, mIndex) => (
              <div key={module.id} className={classNames('module-item', { active: module.id === selectedUnit?.sectionId })}>
                <div
                  className="module-content"
                  onClick={() => {
                    // If module has units, select first unit when module clicked
                    if (module.units && module.units.length > 0) {
                      const globalIndex = allUnits.findIndex(u => u.id === module.units[0].id);
                      if (globalIndex >= 0) setSelectedUnitIndex(globalIndex);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                </div>
                {/* Nested unit list (read-only) */}
                {module.units && module.units.length > 0 && (
                  <div className="module-units-list" style={{ padding: '8px 12px 14px' }}>
                    {module.units.map((unit) => {
                      const index = allUnits.findIndex(u => u.id === unit.id);
                      return (
                        <div
                          key={unit.id}
                          className={classNames('section-card', { active: index === selectedUnitIndex })}
                          onClick={() => setSelectedUnitIndex(index)}
                          role="button"
                          tabIndex={0}
                          style={{ height: '56px', margin: '6px 0' }}
                        >
                          <div className="section-card__header">
                            <div className="section-card__menu">
                              <MenuIcon />
                            </div>
                              <div className="section-card__title-group">
                                <div className="section-card__title">{unit.title}</div>
                              </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Content for Selected Unit */}
        <div ref={rightPanelRef} className="authoring-content-list" style={{ gridColumn: '2 / 3', ...(debugEnabled ? { outline: '2px solid rgba(0,192,0,0.6)', background: 'rgba(0,192,0,0.02)' } : {}) }}>
          {selectedUnit ? (
            <>
              <div className="content-scroll">
                <div className="unit-card">
                  <div className="unit-card__icon">
                    {(() => {
                      const UnitIcon = getContentIcon(selectedUnit.content_type);
                      return <UnitIcon />;
                    })()}
                  </div>
                  <div className="unit-card__info">
                    <div className="unit-card__title"><b>{selectedUnit.title}</b></div>
                    <div className="unit-card__subtitle">{selectedUnit.content_metadata?.subtitle || 'Nội dung học tập'}</div>
                  </div>
                </div>
                {/* Cards for each content type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
                  {['video', 'slide', 'questions'].map(type => (
                    <div key={type} style={{ background: '#f8fafd', border: '1.5px solid #b2b2b2', borderRadius: 8, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {(() => {
                          const UnitIcon = getContentIcon(type);
                          return <UnitIcon style={{ fontSize: 28 }} />;
                        })()}
                        <div>
                          <div style={{ fontWeight: 600 }}>{typeLabel[type]}</div>
                          <div style={{ fontSize: 13, color: '#555' }}>{selectedUnit.title} - Bấm để xem {typeLabel[type]}</div>
                        </div>
                      </div>
                        <button
                          style={{ background: '#0070d2', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                          onClick={() => {
                            if (type === 'questions') {
                              // Show inline quiz list and select first quiz if available
                              if (quizList && quizList.length > 0) {
                                setShowQuizListInline(true);
                                setSelectedContent({ ...quizList[0], type: 'questions' });
                              } else {
                                // Fallback to modal selection when no cached quizList
                                setModalType(type);
                                setModalOpen(true);
                              }
                            } else {
                              setShowQuizListInline(false);
                              setModalType(type);
                              setModalOpen(true);
                            }
                          }}
                        >
                          Xem
                        </button>
                    </div>
                  ))}
                </div>
                {/* Show selected content (video, slide, quiz) if chosen */}
                {selectedContent && selectedContent.type === 'video' && (
                  (() => {
                    const url = selectedContent.videoUrl || '';
                    const pub = selectedContent.publicUrl || '';
                    const combined = String(pub || url || '');
                    const isYouTube = /(?:youtube\.com\/embed|youtube\.com|youtu\.be)/i.test(combined) || !!selectedContent.youtubeId;
                    const isDrive = /drive\.google\.com/i.test(combined) || /drive\.google\.com/i.test(url);

                    if (isYouTube) {
                      const embedSrc = pub || (selectedContent.youtubeId ? `https://www.youtube.com/embed/${selectedContent.youtubeId}` : (url || '').replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/'));
                      return (
                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, marginTop: 24 }}>
                          <iframe
                            title={selectedContent.title || 'Video'}
                            src={embedSrc}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, borderRadius: 8 }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      );
                    }

                    if (isDrive) {
                      const driveSrc = pub || (url || '').replace('/view', '/preview');
                      return (
                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, marginTop: 24 }}>
                          <iframe
                            title={selectedContent.title || 'Drive Video'}
                            src={driveSrc}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, borderRadius: 8 }}
                            allowFullScreen
                          />
                        </div>
                      );
                    }

                    // Fallback: regular video element (prefer publicUrl if available)
                    if (url || pub) {
                      return (
                        <video controls style={{ width: '100%', marginTop: 24, borderRadius: 8 }} src={pub || url} />
                      );
                    }

                    return null;
                  })()
                )}
                {selectedContent && selectedContent.type === 'slide' && selectedContent.fileUrl && (
                  // Use FileViewer which fetches the remote file as a blob and creates an object URL
                  // so we avoid embedding an insecure HTTP resource directly into the page.
                  <React.Suspense fallback={<div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span>Đang chuẩn bị trình xem...</span></div>}>
                    <FileViewer fileUrl={selectedContent.fileUrl} fileName={selectedContent.title || ''} />
                  </React.Suspense>
                )}
                {selectedContent && selectedContent.type === 'questions' && (
                  <QuizRenderer selectedContent={selectedContent} unitId={selectedUnitId} />
                )}
              </div>
              {/* Media list modal – loads on demand to mirror authoring behavior */}
              {['video', 'slide', 'questions'].includes(modalType) && (
                <MediaListModal
                  open={modalOpen}
                  onClose={() => { setModalOpen(false); setModalType(null); }}
                  unit={selectedUnit}
                  mediaType={modalType}
                  title={`Chọn ${typeLabel[modalType] || ''} để phát`}
                  onSelect={(normalized) => {
                    setSelectedContent(normalized);
                  }}
                />
              )}
              {/* Topic-level quick review for the selected unit */}
              <div className="topic-review">
                <ReviewWidget courseId={courseId} unitUsageKey={selectedUnit.id} />
              </div>
            </>
          ) : (
            <div className="unit-card empty">
              <div className="unit-card__info">
                <div className="unit-card__title">Chưa có nội dung học tập</div>
                <div className="unit-card__subtitle">Nội dung sẽ được cập nhật sớm</div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Course level review footer removed — use topic-level review inside right panel */}
    </div>
  );
};

export default CourseOutlineView;
