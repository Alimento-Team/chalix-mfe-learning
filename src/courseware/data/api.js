import { camelCaseObject, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient, getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { appendBrowserTimezoneToUrl } from '../../utils';
import {
  normalizeLearningSequencesData, normalizeMetadata, normalizeOutlineBlocks, normalizeSequenceMetadata,
} from './utils';

// Do not add further calls to this API - we don't like making use of the modulestore if we can help it
export const getSequenceForUnitDeprecatedUrl = (courseId) => {
  const authenticatedUser = getAuthenticatedUser();
  const url = new URL(`${getConfig().LMS_BASE_URL}/api/courses/v2/blocks/`);
  url.searchParams.append('course_id', courseId);
  url.searchParams.append('username', authenticatedUser ? authenticatedUser.username : '');
  url.searchParams.append('depth', 3);
  url.searchParams.append('requested_fields', 'children,discussions_url');

  return url;
};
export async function getSequenceForUnitDeprecated(courseId, unitId) {
  const url = getSequenceForUnitDeprecatedUrl(courseId);
  const { data } = await getAuthenticatedHttpClient().get(url.href, {});
  const parent = Object.values(data.blocks).find(block => block.type === 'sequential' && block.children.includes(unitId));
  return parent?.id;
}

export async function getLearningSequencesOutline(courseId) {
  const outlineUrl = new URL(`${getConfig().LMS_BASE_URL}/api/learning_sequences/v1/course_outline/${courseId}`);
  const { data } = await getAuthenticatedHttpClient().get(outlineUrl.href, {});
  return normalizeLearningSequencesData(data);
}

export async function getCourseMetadata(courseId) {
  let url = `${getConfig().LMS_BASE_URL}/api/courseware/course/${courseId}`;
  url = appendBrowserTimezoneToUrl(url);
  const metadata = await getAuthenticatedHttpClient().get(url);
  return normalizeMetadata(metadata);
}

export async function getSequenceMetadata(sequenceId, params) {
  const { data } = await getAuthenticatedHttpClient()
    .get(`${getConfig().LMS_BASE_URL}/api/courseware/sequence/${sequenceId}`, { params });

  return normalizeSequenceMetadata(data);
}

const getSequenceHandlerUrl = (courseId, sequenceId) => `${getConfig().LMS_BASE_URL}/courses/${courseId}/xblock/${sequenceId}/handler`;

export async function getBlockCompletion(courseId, sequenceId, usageKey) {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getSequenceHandlerUrl(courseId, sequenceId)}/get_completion`,
    { usage_key: usageKey },
  );
  return data.complete === true;
}

export async function postSequencePosition(courseId, sequenceId, activeUnitIndex) {
  const { data } = await getAuthenticatedHttpClient().post(
    `${getSequenceHandlerUrl(courseId, sequenceId)}/goto_position`,
    // Position is 1-indexed on the server and 0-indexed in this app. Adjust here.
    { position: activeUnitIndex + 1 },
  );
  return data;
}

export async function getResumeBlock(courseId) {
  const url = new URL(`${getConfig().LMS_BASE_URL}/api/courseware/resume/${courseId}`);
  const { data } = await getAuthenticatedHttpClient().get(url.href, {});
  return camelCaseObject(data);
}

export async function postIntegritySignature(courseId) {
  const { data } = await getAuthenticatedHttpClient().post(`${getConfig().LMS_BASE_URL}/api/agreements/v1/integrity_signature/${courseId}`, {});
  return camelCaseObject(data);
}

export async function sendActivationEmail() {
  const url = new URL(`${getConfig().LMS_BASE_URL}/api/send_account_activation_email`);
  const { data } = await getAuthenticatedHttpClient().post(url.href, {});
  return data;
}

export async function getCourseDiscussionConfig(courseId) {
  const url = `${getConfig().LMS_BASE_URL}/api/discussion/v1/courses/${courseId}`;
  const { data } = await getAuthenticatedHttpClient().get(url);
  return data;
}

export async function getCourseTopics(courseId) {
  const { data } = await getAuthenticatedHttpClient()
    .get(`${getConfig().LMS_BASE_URL}/api/discussion/v2/course_topics/${courseId}`);
  return camelCaseObject(data);
}

/**
 * Get course outline structure for the courseware navigation sidebar.
 * @param {string} courseId - The unique identifier for the course.
 * @returns {Promise<{units: {}, sequences: {}, sections: {}}|null>}
 */
export async function getCourseOutline(courseId) {
  const { data } = await getAuthenticatedHttpClient()
    .get(`${getConfig().LMS_BASE_URL}/api/course_home/v1/navigation/${courseId}`);

  return data.blocks ? normalizeOutlineBlocks(courseId, data.blocks) : null;
}

/**
 * Get course outline from Course Studio (includes draft content)
 * @param {string} courseId - The unique identifier for the course.
 * @returns {Promise<Object>} - The course outline including draft content
 */
export async function getCourseOutlineWithDrafts(courseId) {
  try {
    // Try to get draft content from Course Studio
    const { data } = await getAuthenticatedHttpClient()
      .get(`${getConfig().STUDIO_BASE_URL}/course/${courseId}?format=concise`);
    
    // Convert Studio format to LMS-compatible format
    return convertStudioOutlineToLMSFormat(courseId, data);
  } catch (error) {
    console.warn('Could not fetch draft content from Course Studio, falling back to published content:', error);
    // Fallback to published content
    return getCourseOutline(courseId);
  }
}

/**
 * Convert Course Studio outline format to LMS-compatible format
 */
function convertStudioOutlineToLMSFormat(courseId, studioData) {
  const blocks = {};
  
  // Process course root
  blocks[courseId] = {
    id: courseId,
    type: 'course',
    display_name: studioData.display_name || '',
    children: studioData.child_info?.children || []
  };
  
  // Process all child blocks recursively
  function processChildren(children) {
    if (!children) return;
    
    children.forEach(child => {
      blocks[child.id] = {
        id: child.id,
        type: child.category || 'unknown',
        display_name: child.display_name || '',
        children: child.child_info?.children?.map(c => c.id) || [],
        has_children: child.has_children || false,
        published: child.published || false,
        visibility_state: child.visibility_state || 'private'
      };
      
      // Process nested children
      if (child.child_info?.children) {
        processChildren(child.child_info.children);
      }
    });
  }
  
  if (studioData.child_info?.children) {
    processChildren(studioData.child_info.children);
  }
  
  return normalizeOutlineBlocks(courseId, blocks);
}

/**
 * Get waffle flag value that enables completion tracking.
 * @param {string} courseId - The unique identifier for the course.
 * @returns {Promise<{enable_completion_tracking: boolean}>} - The object
 * of boolean values of enabling of the completion tracking.
 */
export async function getCoursewareOutlineSidebarToggles(courseId) {
  const url = new URL(`${getConfig().LMS_BASE_URL}/courses/${courseId}/courseware-navigation-sidebar/toggles/`);
  const { data } = await getAuthenticatedHttpClient().get(url.href);
  return {
    enable_completion_tracking: data.enable_completion_tracking || false,
  };
}
