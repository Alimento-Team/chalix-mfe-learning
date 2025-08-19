import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { sendTrackEvent } from '@edx/frontend-platform/analytics';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button } from '@openedx/paragon';
import LmsHtmlFragment from './LmsHtmlFragment';
import { CourseOutlineTabNotificationsSlot } from '../../plugin-slots/CourseOutlineTabNotificationsSlot';
import { AlertList } from '../../generic/user-messages';

import CourseDates from './widgets/CourseDates';
import CourseHandouts from './widgets/CourseHandouts';
import StartOrResumeCourseCard from './widgets/StartOrResumeCourseCard';
import WeeklyLearningGoalCard from './widgets/WeeklyLearningGoalCard';
import CourseTools from './widgets/CourseTools';
import { fetchOutlineTab } from '../data';
import messages from './messages';
import ShiftDatesAlert from '../suggested-schedule-messaging/ShiftDatesAlert';
import UpgradeToShiftDatesAlert from '../suggested-schedule-messaging/UpgradeToShiftDatesAlert';
import useCertificateAvailableAlert from './alerts/certificate-status-alert';
import useCourseEndAlert from './alerts/course-end-alert';
import useCourseStartAlert from '../../alerts/course-start-alert';
import usePrivateCourseAlert from './alerts/private-course-alert';
import useScheduledContentAlert from './alerts/scheduled-content-alert';
import { useModel } from '../../generic/model-store';
import ProctoringInfoPanel from './widgets/ProctoringInfoPanel';
import AccountActivationAlert from '../../alerts/logistration-alert/AccountActivationAlert';
import CourseHomeSectionOutlineSlot from '../../plugin-slots/CourseHomeSectionOutlineSlot';

const OutlineTab = () => {
  const intl = useIntl();
  const {
    courseId,
    proctoringPanelStatus,
  } = useSelector(state => state.courseHome);

  const {
    isSelfPaced,
    org,
    title,
  } = useModel('courseHomeMeta', courseId);

  const expandButtonRef = useRef();

  const {
    courseBlocks: {
      courses,
      sections,
    },
    courseGoals: {
      selectedGoal,
      weeklyLearningGoalEnabled,
    } = {},
    datesWidget: {
      courseDateBlocks,
    },
    enableProctoredExams,
  } = useModel('outline', courseId);

  const [expandAll, setExpandAll] = useState(false);
  const navigate = useNavigate();

  const eventProperties = {
    org_key: org,
    courserun_key: courseId,
  };

  // Below the course title alerts (appearing in the order listed here)
  const courseStartAlert = useCourseStartAlert(courseId);
  const courseEndAlert = useCourseEndAlert(courseId);
  const certificateAvailableAlert = useCertificateAvailableAlert(courseId);
  const privateCourseAlert = usePrivateCourseAlert(courseId);
  const scheduledContentAlert = useScheduledContentAlert(courseId);

  const rootCourseId = courses && Object.keys(courses)[0];

  const hasDeadlines = courseDateBlocks && courseDateBlocks.some(x => x.dateType === 'assignment-due-date');

  const logUpgradeToShiftDatesLinkClick = () => {
    sendTrackEvent('edx.bi.ecommerce.upsell_links_clicked', {
      ...eventProperties,
      linkCategory: 'personalized_learner_schedules',
      linkName: 'course_home_upgrade_shift_dates',
      linkType: 'button',
      pageName: 'course_home',
    });
  };

  const isEnterpriseUser = () => {
    const authenticatedUser = getAuthenticatedUser();
    const userRoleNames = authenticatedUser ? authenticatedUser.roles.map(role => role.split(':')[0]) : [];

    return userRoleNames.includes('enterprise_learner');
  };

  /** show post enrolment survey to only B2C learners */
  const learnerType = isEnterpriseUser() ? 'enterprise_learner' : 'b2c_learner';

  const location = useLocation();

  useEffect(() => {
    const currentParams = new URLSearchParams(location.search);
    const startCourse = currentParams.get('start_course');
    if (startCourse === '1') {
      sendTrackEvent('enrollment.email.clicked.startcourse', {});

      // Deleting the course_start query param as it only needs to be set once
      // whenever passed in query params.
      currentParams.delete('start_course');
      navigate({
        pathname: location.pathname,
        search: `?${currentParams.toString()}`,
        replace: true,
      });
    }
  }, [location.search]);

  // Get course information from available metadata
  // Note: Course image, instructor details may not be available in current API response
  // These should be added to the backend API when course admin features are implemented
  
  // TODO: When course image API field becomes available, replace with:
  // const courseImageUrl = useModel('courseHomeMeta', courseId).courseImage;
  // or useModel('outline', courseId).courseImage;
  const courseImageUrl = null; // No course image field available in current API
  
  // TODO: When instructor name API field becomes available, replace with:
  // const instructorName = useModel('courseHomeMeta', courseId).instructorName;
  // or useModel('outline', courseId).instructorName;
  const instructorName = null; // No instructor field available in current API  
  
  // Get welcome message HTML for course description (this is what shows in the course introduction)
  const {
    welcomeMessageHtml,
  } = useModel('outline', courseId);

  // Get the resume course URL for the main action button
  const {
    resumeCourse: {
      hasVisitedCourse,
      url: resumeCourseUrl,
    } = {},
  } = useModel('outline', courseId);

  return (
    <>
      <div data-learner-type={learnerType} className="course-home-container">
        <AccountActivationAlert />
        <div className="col-12">
          <AlertList
            topic="outline-private-alerts"
            customAlerts={{
              ...privateCourseAlert,
            }}
          />
        </div>
        
        {/* Course Hero Section - Based on Figma Frame 3 */}
        <div className="course-hero-section mb-4">
          <div className="course-hero-card">
            <div className="course-hero-content">
              {/* Left side content */}
              <div className="course-info">
                {/* Course title is already displayed in the page header, so we don't duplicate it here */}
                
                {/* Display welcome message HTML if available (this is the course introduction) */}
                {welcomeMessageHtml && (
                  <div className="course-description">
                    <LmsHtmlFragment 
                      html={welcomeMessageHtml}
                      className="welcome-message-content"
                    />
                  </div>
                )}
                
                {instructorName && <p className="instructor-name">Giảng viên: {instructorName}</p>}
                
                {/* Main action button */}
                {resumeCourseUrl && (
                  <Button
                    variant="primary"
                    size="lg"
                    className="course-action-button"
                    href={resumeCourseUrl}
                    onClick={() => {
                      // Log the click event
                      sendTrackEvent('edx.course.home.hero.clicked', {
                        org_key: org,
                        courserun_key: courseId,
                        event_type: hasVisitedCourse ? 'resume' : 'start',
                        url: resumeCourseUrl,
                      });
                    }}
                  >
                    {hasVisitedCourse ? intl.formatMessage(messages.resume) : intl.formatMessage(messages.start)}
                  </Button>
                )}
              </div>
              
              {/* Right side course image */}
              {courseImageUrl && (
                <div className="course-image">
                  <img src={courseImageUrl} alt={title} className="course-img" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Course Details Section - Based on Figma table */}
        {/* This section is currently disabled since detailed course overview/description isn't available in the API */}
        {/* To enable this section when course overview API fields become available: */}
        {/* 1. Change 'false' to a condition like: courseDescription && courseDescription.length > 100 */}
        {/* 2. Replace the hardcoded Vietnamese content with actual course data */}
        {/* 3. Use course overview/description from API: useModel('courseHomeMeta', courseId).courseOverview */}
        {false && (
          <div className="course-details-section mb-4">
            <div className="course-details-card">
              <div className="course-details-content">
                <h2 className="details-title">Giới thiệu chi tiết về khóa học:</h2>
                <div className="course-description-detailed">
                  <p>
                    Node.js là 1 nền tảng phát triển ứng dụng phía server. Nó sử dụng ngôn ngữ lập trình JavaScript. 
                    Mỗi kết nối đến sẽ sinh ra 1 sự kiện, cho phép hàng chục nghìn user truy cập cùng lúc và tốc độ thì cực nhanh. 
                    NodeJS hiện đang là 1 Javascript Engine cực hot, được nhiều người ưa chuộng bởi tốc độ nhanh, nhẹ, đơn giản 
                    và thư viện hỗ trợ phong phú.
                  </p>
                  
                  <h3>1. Những khó khăn thường gặp khi học NodeJs</h3>
                  <ul>
                    <li>
                      Gặp phải thắc mắc về việc tự học công nghệ thông tin và tự theo đuổi con đường lập trình. 
                      Bạn nhận thấy việc tự học không có thầy rất khó.
                    </li>
                    <li>
                      Không biết NodeJS làm việc như thế nào, không biết cách tạo một webservice cơ bản
                    </li>
                    <li>
                      Vật lộn trong việc xây dựng và thiết kế cơ sở dữ liệu
                    </li>
                    <li>
                      Loay hoay xây dựng trang quản trị CSM cho blog, xây dựng API.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alerts Section */}
        <div className="row course-outline-tab">
          <div className="col col-12 col-md-8">
            <AlertList
              topic="outline-course-alerts"
              className="mb-3"
              customAlerts={{
                ...certificateAvailableAlert,
                ...courseEndAlert,
                ...courseStartAlert,
                ...scheduledContentAlert,
              }}
            />
            {isSelfPaced && hasDeadlines && (
              <>
                <ShiftDatesAlert model="outline" fetch={fetchOutlineTab} />
                <UpgradeToShiftDatesAlert model="outline" logUpgradeLinkClick={logUpgradeToShiftDatesLinkClick} />
              </>
            )}
            {/* WelcomeMessage has been moved to the hero section above */}
            {rootCourseId && (
              <>
                <div id="expand-button-row" className="row w-100 m-0 mb-3 justify-content-end">
                  <div className="col-12 col-md-auto p-0">
                    <Button ref={expandButtonRef} variant="outline-primary" block onClick={() => { setExpandAll(!expandAll); }}>
                      {expandAll ? intl.formatMessage(messages.collapseAll) : intl.formatMessage(messages.expandAll)}
                    </Button>
                  </div>
                </div>
                <CourseHomeSectionOutlineSlot
                  expandAll={expandAll}
                  sectionIds={courses[rootCourseId].sectionIds}
                  sections={sections}
                />
              </>
            )}
          </div>
          {rootCourseId && (
            <div className="col col-12 col-md-4">
              <ProctoringInfoPanel />
              { /** Defer showing the goal widget until the ProctoringInfoPanel has resolved or has been determined as
               disabled to avoid components bouncing around too much as screen is rendered */ }
              {(!enableProctoredExams || proctoringPanelStatus === 'loaded') && weeklyLearningGoalEnabled && (
                <WeeklyLearningGoalCard
                  daysPerWeek={selectedGoal && 'daysPerWeek' in selectedGoal ? selectedGoal.daysPerWeek : null}
                  subscribedToReminders={selectedGoal && 'subscribedToReminders' in selectedGoal ? selectedGoal.subscribedToReminders : false}
                />
              )}
              <CourseTools />
              <CourseOutlineTabNotificationsSlot courseId={courseId} />
              <CourseDates />
              <CourseHandouts />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OutlineTab;
