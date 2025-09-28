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
          const res = await getUnitVerticalData(targetUnitId, { debug: false });
          const children = res?.xblockInfo?.children || [];
          const quizzes = children.filter(
            (c) => c.category === 'problem' || c.category === 'quiz' || c.category === 'questions'
          ).map((q) => ({ id: q.id, title: q.displayName || 'Quiz' }));
          if (!cancelled) setItems(quizzes);
        } else {
          const res = await getUnitMedia(targetUnitId, mediaType);
          const list = Array.isArray(res) ? res : (res?.results || []);
          if (!cancelled) setItems(list);
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
                  normalized.videoUrl = item.videoUrl || item.url || item.downloadUrl || item.uploadUrl || item.fileUrl;
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
