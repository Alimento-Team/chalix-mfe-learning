// @ts-check
import { camelCaseObject, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

// Mirror of authoring MFE API structure, but using LMS content API endpoints
const getLmsContentApiBaseUrl = () => getConfig().LMS_BASE_URL;

// URL builders mirroring CMS contentstore API patterns but pointing to LMS content API
export const getXBlockBaseApiUrl = (itemId) => {
  // Note: This would be read-only in LMS, mainly for metadata
  const encoded = encodeURIComponent(itemId);
  return `${getLmsContentApiBaseUrl()}/api/course_home/v1/content/xblock/${encoded}`;
};

export const getCourseSectionVerticalApiUrl = (itemId, opts = {}) => {
  const encoded = encodeURIComponent(itemId);
  const base = `${getLmsContentApiBaseUrl()}/api/course_home/v1/content/container_handler/${encoded}`;
  // Opt-in debug payload to aid troubleshooting when children look empty
  if (opts && opts.debug) {
    return `${base}?debug=1`;
  }
  return base;
};

export const getCourseVerticalChildrenApiUrl = (itemId) => {
  const encoded = encodeURIComponent(itemId);
  return `${getLmsContentApiBaseUrl()}/api/course_home/v1/content/container/vertical/${encoded}/children`;
};

export const unitMediaApiUrl = (unitId, mediaType) => {
  const encoded = encodeURIComponent(unitId);
  // Convert singular to plural to match CMS API pattern (video -> videos, slide -> slides)
  const pluralMediaType = mediaType === 'video' ? 'videos' : 
                         mediaType === 'slide' ? 'slides' : 
                         mediaType === 'questions' ? 'quizzes' :
                         mediaType + 's';
  return `${getLmsContentApiBaseUrl()}/api/course_home/v1/content/units/${encoded}/${pluralMediaType}/`;
};

export const unitMediaDetailApiUrl = (unitId, mediaType, mediaId) => {
  const encoded = encodeURIComponent(unitId);
  const pluralMediaType = mediaType === 'video' ? 'videos' : 
                         mediaType === 'slide' ? 'slides' : 
                         mediaType + 's';
  return `${getLmsContentApiBaseUrl()}/api/course_home/v1/content/units/${encoded}/${pluralMediaType}/${mediaId}/`;
};

export const unitMediaStatsApiUrl = (unitId) => {
  const encoded = encodeURIComponent(unitId);
  return `${getLmsContentApiBaseUrl()}/api/course_home/v1/content/units/${encoded}/media/stats/`;
};

/**
 * Fetch aggregated course content (config + details + topics with units)
 * from the LMS-native endpoint that mirrors CMS traversal.
 * @param {string} courseId
 * @returns {Promise<Object>}
 */
export async function getCourseAggregate(courseId) {
  const encoded = encodeURIComponent(courseId);
  const url = `${getLmsContentApiBaseUrl()}/api/course_home/v1/content/course/${encoded}/aggregate`;
  try {
    const { data } = await getAuthenticatedHttpClient().get(url, {
      headers: {
        'USE-JWT-COOKIE': 'true',
      },
    });
    return camelCaseObject(data);
  } catch (error) {
    // Surface to caller to enable fallback behavior
    throw error;
  }
}

/**
 * Fetch vertical block data from the container_handler endpoint.
 * Mirrors CMS getVerticalData but read-only.
 * @param {string} unitId
 * @returns {Promise<Object>}
 */
/**
 * Fetch vertical block data from the container_handler endpoint.
 * Mirrors CMS getVerticalData but read-only.
 * @param {string} unitId
 * @param {{ debug?: boolean }} [opts]
 * @returns {Promise<Object>}
 */
export async function getVerticalData(unitId, opts = {}) {
  const url = getCourseSectionVerticalApiUrl(unitId, opts);
    // Removed dev console log
  
  try {
    const { data } = await getAuthenticatedHttpClient().get(url, {
      headers: {
        'USE-JWT-COOKIE': 'true',
      },
    });
    
    // Apply camelCase transformation like authoring MFE
    const courseSectionVerticalData = camelCaseObject(data);
      // Removed dev console log
    
    // Debug: Check if XBlock children have video data with YouTube URLs
    const children = courseSectionVerticalData?.xblockInfo?.children || [];
    const videoChildren = children.filter(child => child.category === 'video');
    if (videoChildren.length > 0) {
        // Removed dev console log
      videoChildren.forEach((video, idx) => {
      });
    }
    
    return courseSectionVerticalData;
  } catch (error) {
    console.error(`Error fetching vertical data for unit ${unitId}:`, error);
    return { xblockInfo: { children: [] } };
  }
}

/**
 * Get media files for a specific unit and media type.
 * Mirrors CMS getUnitMedia but read-only.
 * @param {string} unitId - The unit ID.
 * @param {string} mediaType - The media type ('video' or 'slide').
 * @returns {Promise<Object>} - The media files data.
 */
export async function getUnitMedia(unitId, mediaType) {
  const url = unitMediaApiUrl(unitId, mediaType);
    // Removed dev console log
  
  try {
    const { data } = await getAuthenticatedHttpClient().get(url, {
      headers: { 'USE-JWT-COOKIE': 'true' },
    });
    
      // Removed dev console logs
    
    const mediaData = camelCaseObject(data);
    
    // For videos, enhance with XBlock data if available
    if (mediaType === 'video' && mediaData && mediaData.results && Array.isArray(mediaData.results)) {
      try {
        // Get XBlock structure to find video blocks with YouTube data
        const xblockData = await getUnitVerticalData(unitId, { debug: false });
        const videoXBlocks = (xblockData?.xblockInfo?.children || []).filter(child => child.category === 'video');
        
          // Removed dev console log
        
        // Create a map of XBlock video data by block ID
        const xblockVideoMap = {};
        videoXBlocks.forEach(xblock => {
          if (xblock.id && xblock.studentViewData) {
            const studentData = xblock.studentViewData;
            // Extract YouTube ID from various possible fields in student view data
            const youtubeId = studentData.youtube_id_1_0 || studentData.youtube_id || studentData.ytid;
            const videoSources = studentData.encoded_videos || {};
            
            if (youtubeId || Object.keys(videoSources).length > 0) {
              xblockVideoMap[xblock.id] = {
                youtubeId: youtubeId || null,
                videoSources: videoSources,
                displayName: xblock.displayName || studentData.display_name || 'Video',
                studentViewData: studentData
              };
              
                // Removed dev console log
            }
          }
        });
        
        // Enhance media results with XBlock data
        mediaData.results = mediaData.results.map(item => {
          if (item.id && item.id.startsWith('block-v1:') && xblockVideoMap[item.id]) {
            const xblockData = xblockVideoMap[item.id];
            return {
              ...item,
              youtubeId: xblockData.youtubeId,
              title: xblockData.displayName || item.title,
              displayName: xblockData.displayName || item.displayName,
              videoSources: xblockData.videoSources,
              // Set publicUrl for YouTube videos
              publicUrl: xblockData.youtubeId ? `https://www.youtube.com/embed/${xblockData.youtubeId}` : item.publicUrl,
              url: xblockData.youtubeId ? `https://www.youtube.com/watch?v=${xblockData.youtubeId}` : item.url,
              enhanced: true
            };
          }
          return item;
        });
        
          // Removed dev console log
        
      } catch (xblockError) {
        console.warn(`[getUnitMedia] Failed to enhance with XBlock data:`, xblockError);
        // Continue with original media data
      }
    }
    
    if (mediaData && mediaData.results && Array.isArray(mediaData.results)) {
        // Removed dev console log
      mediaData.results.forEach((item, idx) => {
      });
    }
    return mediaData;
  } catch (error) {
    console.error(`Error fetching ${mediaType} media:`, error);
    return [];
  }
}

/**
 * Get detailed information about a specific media file.
 * Mirrors CMS getUnitMediaDetail but read-only.
 * @param {string} unitId - The unit ID.
 * @param {string} mediaType - The media type ('video' or 'slide').
 * @param {string} mediaId - The media file ID.
 * @returns {Promise<Object>} - The media file details.
 */
export async function getUnitMediaDetail(unitId, mediaType, mediaId) {
  const url = unitMediaDetailApiUrl(unitId, mediaType, mediaId);
  console.log(`Fetching unit media detail: ${url}`);
  
  try {
    const { data } = await getAuthenticatedHttpClient().get(url, {
      headers: {
        'USE-JWT-COOKIE': 'true',
      },
    });
    
    return camelCaseObject(data);
  } catch (error) {
    console.error(`Error fetching ${mediaType} media detail ${mediaId} for unit ${unitId}:`, error);
    return null;
  }
}

/**
 * Get statistics about all media files in a unit.
 * Mirrors CMS getUnitMediaStats but read-only.
 * @param {string} unitId - The unit ID.
 * @returns {Promise<Object>} - The unit media statistics.
 */
export async function getUnitMediaStats(unitId) {
  const url = unitMediaStatsApiUrl(unitId);
  console.log(`Fetching unit media stats: ${url}`);
  
  try {
    const { data } = await getAuthenticatedHttpClient().get(url, {
      headers: {
        'USE-JWT-COOKIE': 'true',
      },
    });
    
    return camelCaseObject(data);
  } catch (error) {
    console.error(`Error fetching media stats for unit ${unitId}:`, error);
    return {
      unitId,
      totalFiles: 0,
      totalVideos: 0,
      totalSlides: 0,
      totalSizeBytes: 0,
    };
  }
}

/**
 * Get an object containing course vertical children data.
 * Mirrors CMS getCourseVerticalChildren but read-only.
 * @param {string} itemId
 * @returns {Promise<Object>}
 */
export async function getCourseVerticalChildren(itemId) {
  const url = getCourseVerticalChildrenApiUrl(itemId);
  console.log(`Fetching course vertical children: ${url}`);
  
  try {
    const { data } = await getAuthenticatedHttpClient().get(url, {
      headers: {
        'USE-JWT-COOKIE': 'true',
      },
    });
    
    return camelCaseObject(data);
  } catch (error) {
    console.error(`Error fetching vertical children for ${itemId}:`, error);
    return { children: [] };
  }
}

// Convenience alias to match original API
export const getUnitVerticalData = getVerticalData;

export function isUnitBlock(unit) {
  // Only fetch media for verticals/units, not sequentials or other block types
  // Accepts either a unit object or a string content_type
  if (!unit) return false;
  
  const type = typeof unit === 'string' ? unit : unit.content_type;
  const unitId = typeof unit === 'string' ? '' : (unit.id || '');
  
  // Check if this is actually a sequential block by ID pattern
  if (unitId.includes('type@sequential')) {
    console.log(`Skipping media fetch for sequential block: ${unitId}`);
    return false;
  }
  
  // Only fetch for actual unit/vertical blocks or specific content types
  return (
    type === 'vertical' ||
    type === 'unit' ||
    type === 'video' ||
    type === 'slide' ||
    type === 'questions'
  );
}

export function isSequentialBlock(unit) {
  // Check if this is a sequential block that contains verticals
  if (!unit) return false;
  
  const type = typeof unit === 'string' ? unit : unit.content_type;
  const unitId = typeof unit === 'string' ? unit : (unit.id || '');
  
  return (
    type === 'sequential' ||
    unitId.includes('type@sequential')
  );
}

export async function getSequentialChildren(sequentialId, opts = {}) {
  // Use the new container_handler endpoint to get children
    // Removed dev console log
  
  try {
    const verticalData = await getVerticalData(sequentialId, opts);
    
    // Return the children that are verticals/units
    const children = verticalData?.xblockInfo?.children || [];
    const verticals = children.filter(child => 
      child.category === 'vertical' || 
      child.category === 'unit' ||
      (child.id && child.id.includes('type@vertical'))
    );
    
      // Removed dev console log
    return verticals;
  } catch (error) {
    console.error(`Error fetching sequential children for ${sequentialId}:`, error);
    return [];
  }
}
