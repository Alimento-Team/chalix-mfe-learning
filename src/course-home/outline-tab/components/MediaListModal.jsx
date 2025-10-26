import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { AlertModal, Spinner } from '@openedx/paragon';
import { getUnitMedia, getUnitVerticalData, isSequentialBlock, getSequentialChildren } from '../data/unitContentApi';

/**
 * MediaListModal
 * - Mirrors the authoring popup behavior: load list when modal opens, not upfront.
 * - Supports 'video' | 'slide' | 'questions'.
 * - Accepts either a unit object or just unitId; if the unit is a sequential, will fetch its first vertical children.
 */
const MediaListModal = ({
  open,
  onClose,
  unit,
  unitId: unitIdProp,
  mediaType, // 'video' | 'slide' | 'questions'
  title,
  onSelect, // (normalizedItem) => void
}) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  const unitId = useMemo(() => unit?.id || unitIdProp || null, [unit, unitIdProp]);

  useEffect(() => {
    if (!open || !unitId || !mediaType) {
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        // Resolve target unit for content fetch
        let targetUnitId = unitId;
        if (unit && isSequentialBlock(unit)) {
          const verticals = await getSequentialChildren(unitId);
          if (verticals && verticals.length > 0) {
            targetUnitId = verticals[0].id;
          }
        }

        if (mediaType === 'questions') {
          console.log('🔍 Loading questions for unit:', targetUnitId);
          
          // Try the unit media API first
          try {
            const res = await getUnitMedia(targetUnitId, 'questions');
            console.log('📊 Questions media data:', res);
            const list = Array.isArray(res) ? res : (res?.results || []);
            
            if (list && list.length > 0) {
              console.log('✅ Found quizzes via media API:', list);
              const quizzes = list.map((q) => ({ 
                id: q.id, 
                title: q.title || q.displayName || q.fileName || 'Quiz',
                displayName: q.displayName || q.title,
                ...q
              }));
              if (!cancelled) setItems(quizzes);
              return; // Success - exit early
            }
          } catch (mediaError) {
            console.log('⚠️ Media API failed, falling back to vertical data:', mediaError.message);
          }
          
          // Fallback: Use vertical data to find problem blocks
          console.log('🔄 Fallback: Loading questions from vertical data');
          const verticalRes = await getUnitVerticalData(targetUnitId, { debug: true });
          console.log('📊 Unit vertical data:', verticalRes);
          
          const children = verticalRes?.xblockInfo?.children || [];
          console.log('👥 Unit children:', children);
          
          // Look for problem, quiz, or any block that might contain quiz content
          const quizBlocks = children.filter(
            (c) => c.category === 'problem' || 
                   c.category === 'quiz' || 
                   c.category === 'questions' ||
                   c.category === 'openassessment' ||
                   (c.displayName && c.displayName.toLowerCase().includes('quiz')) ||
                   (c.displayName && c.displayName.toLowerCase().includes('kiểm tra'))
          );
          console.log('❓ Found quiz blocks:', quizBlocks);
          
          const quizzes = quizBlocks.map((q) => ({ 
            id: q.id, 
            title: q.displayName || 'Quiz',
            displayName: q.displayName,
            category: q.category
          }));
          console.log('✅ Processed quizzes:', quizzes);
          if (!cancelled) setItems(quizzes);
        } else {
          const res = await getUnitMedia(targetUnitId, mediaType);
          const list = Array.isArray(res) ? res : (res?.results || []);

        // Debug logs removed for production

          // Filter out entries that are deleted/removed or clearly unusable on the learning side.
          const filtered = (list || []).filter((it) => {
            if (!it) return false;
            
            const deleted = it.deleted || it.isDeleted || it.removed || it.is_removed || it.state === 'deleted' || it.status === 'deleted' || it.visibility === 'archived';
            if (deleted) {
              // Removed dev console log
              return false;
            }

            // Determine if the item has any usable playback source or YouTube id.
            const publicUrl = it.publicUrl || it.public_url || it.public || it.uploadUrl || it.upload_url || it.downloadUrl || it.download_url || null;
            const videoUrl = it.videoUrl || it.url || it.fileUrl || it.downloadUrl || it.uploadUrl || null;
            const explicitYouTube = it.youtubeId || it.youtube_id || it.ytId || it.ytid;
            
            // Special case: if this is a YouTube video (video/external) but missing URLs,
            // it might be a valid YouTube video that the LMS API didn't populate correctly
            const isYouTubeExternal = it.fileType === 'video/external' && 
                                     (it.fileName || '').toLowerCase().includes('.url') &&
                                     (it.title || it.displayName || '').toLowerCase().includes('youtube');
            
            const hasPlayable = Boolean(publicUrl || videoUrl || explicitYouTube || isYouTubeExternal);
            if (!hasPlayable) {
              // Removed dev console log
              return false;
            }

            // Removed dev console log

            return true;
          });

          // Deduplicate YouTube videos by youtubeId (keep first occurrence)
          const seenYouTubeIds = new Set();
          const visible = filtered.filter((it) => {
            if (it.youtubeId && it.youtubeId.trim()) {
              if (seenYouTubeIds.has(it.youtubeId)) {
                // Removed dev console log
                return false;
              }
              seenYouTubeIds.add(it.youtubeId);
              // Removed dev console log
            }
            return true;
          });

          // Removed dev console log
          if (!cancelled) setItems(visible);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load media');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [open, unitId, mediaType, unit]);

  const typeLabel = useMemo(() => ({
    video: 'Video bài giảng',
    slide: 'Slide bài giảng',
    questions: 'Trắc nghiệm',
  }), []);

  return (
    <AlertModal
      isOpen={open}
      onClose={onClose}
      title={title || `Chọn ${typeLabel[mediaType] || ''} để phát`}
      size="md"
      hasCloseButton
    >
      <div style={{ padding: 8 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Spinner animation="border" size="sm" />
            <span>Đang tải danh sách...</span>
          </div>
        )}
        {!loading && error && (
          <div style={{ color: '#c00' }}>{error}</div>
        )}
        {!loading && !error && (items || []).map((item) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f5f5f5', borderRadius: 6, padding: '10px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title || item.displayName || item.fileName || 'Tệp'}</div>
              {/* Optional metadata shown if available */}
              <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.fileType ? `Loại: ${item.fileType}` : ''}
                {item.size || item.fileSize ? ` • Kích thước: ${item.size || item.fileSize}B` : ''}
              </div>
            </div>
            <button
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', minWidth: 120, background: '#0070d2', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontWeight: 600, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}
                onClick={() => {
                  const normalized = { ...item, type: mediaType };
                  if (mediaType === 'video') {
                    normalized.title = item.title || item.displayName || item.fileName;
                    // Prefer explicit publicUrl/public_url when present (served CDN/public link)
                    const publicUrl = item.publicUrl || item.public_url || item.public || item.uploadUrl || item.upload_url || item.downloadUrl || item.download_url || null;
                    const rawUrl = String(publicUrl || item.videoUrl || item.url || item.downloadUrl || item.uploadUrl || item.fileUrl || '');
                    normalized.publicUrl = publicUrl || null;
                    normalized.videoUrl = item.videoUrl || item.url || item.downloadUrl || item.uploadUrl || item.fileUrl || null;

                    // Attempt to detect a YouTube id from the provided urls or explicit fields
                    const explicitYouTube = item.youtubeId || item.youtube_id || item.ytId || item.ytid;
                    let youtubeId = explicitYouTube || null;
                    if (!youtubeId && rawUrl) {
                      const m = rawUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
                      if (m && m[1]) youtubeId = m[1];
                    }
                    
                    // Special handling for YouTube external videos that don't have URLs populated
                    if (!youtubeId && !normalized.videoUrl && !normalized.publicUrl && 
                        item.fileType === 'video/external' && 
                        (item.fileName || '').toLowerCase().includes('.url') &&
                        (item.title || item.displayName || '').toLowerCase().includes('youtube')) {
                      
                      // Skip videos without URLs - they cannot be played
                      // Removed dev console warn
                      return;
                    }
                    
                    normalized.youtubeId = youtubeId;
                  } else if (mediaType === 'slide') {
                    normalized.title = item.title || item.displayName || item.fileName;
                    normalized.fileUrl = item.fileUrl || item.url || item.downloadUrl || item.uploadUrl;
                  } else {
                    normalized.title = item.title || item.displayName || item.fileName;
                  }
                  onSelect?.(normalized);
                  onClose?.();
                }}
            >
              Phát {typeLabel[mediaType]}
            </button>
          </div>
        ))}
        {!loading && !error && (items || []).length === 0 && (
          <div style={{ color: '#888', fontStyle: 'italic' }}>Chưa có nội dung {typeLabel[mediaType]}</div>
        )}
      </div>
    </AlertModal>
  );
};

MediaListModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  unit: PropTypes.shape({ id: PropTypes.string }),
  unitId: PropTypes.string,
  mediaType: PropTypes.oneOf(['video', 'slide', 'questions']).isRequired,
  title: PropTypes.string,
  onSelect: PropTypes.func,
};

export default MediaListModal;
