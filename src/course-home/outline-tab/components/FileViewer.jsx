import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Spinner, Button, Alert } from '@openedx/paragon';

/**
 * FileViewer
 * - Fetches a remote file URL as a blob and creates an object URL so the file
 *   can be rendered inline without embedding an insecure HTTP resource.
 * - Falls back to a download link when inline viewing isn't possible.
 */
const FileViewer = ({ fileUrl, fileName, centered }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const viewerHeight = centered ? 'calc(100vh - 120px)' : 'min(760px, calc(100vh - 180px))';

  useEffect(() => {
    let cancelled = false;
    let currentBlobUrl = null;

    const load = async () => {
      if (!fileUrl) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(fileUrl, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          // Intentionally minimal headers to avoid signature issues
          headers: {},
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const blob = await res.blob();
        currentBlobUrl = URL.createObjectURL(blob);
        if (!cancelled) setBlobUrl(currentBlobUrl);
      } catch (err) {
        console.error('FileViewer - failed to load file as blob:', err);
        if (!cancelled) setError(err?.message || 'Failed to load file');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (currentBlobUrl) {
        try { URL.revokeObjectURL(currentBlobUrl); } catch (e) { /* ignore */ }
      }
      setBlobUrl(null);
    };
  }, [fileUrl]);

  // Prefer rendering PDFs inline; many browsers will show PDFs in an iframe/object tag.
  const isPdf = (fileName || fileUrl || '').toLowerCase().endsWith('.pdf');

  if (loading) {
    return (
      <div style={{ height: viewerHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <Spinner animation="border" size="sm" />
        <span style={{ marginLeft: 12 }}>Đang tải file...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="warning" style={centered ? { maxWidth: 980, margin: '0 auto' } : undefined}>
        <Alert.Heading>Không thể tải file</Alert.Heading>
        <p>{error}</p>
        <div style={{ marginTop: 8 }}>
          <Button variant="primary" href={fileUrl} target="_blank" download>
            📥 Tải xuống file
          </Button>
        </div>
      </Alert>
    );
  }

  if (blobUrl) {
    // If it's a PDF, use an iframe which most browsers can render inline from a blob URL.
    if (isPdf) {
      return (
        <div style={{ maxWidth: centered ? 1280 : 980, margin: centered ? '0 auto' : '24px auto 0', width: '100%' }}>
          <iframe
            title={fileName || 'Document'}
            src={blobUrl}
            style={{ width: '100%', height: viewerHeight, borderRadius: 8, background: '#fff' }}
          />
        </div>
      );
    }

    // For other types, try an <object> tag which may allow inline rendering for some types,
    // otherwise the browser will show a download prompt / fallback content.
    return (
      <div style={{ maxWidth: centered ? 1280 : 980, margin: centered ? '0 auto' : '24px auto 0', width: '100%' }}>
        <object data={blobUrl} type="application/octet-stream" style={{ width: '100%', height: viewerHeight }}>
          <div style={{ padding: 16 }}>
            <div>Không thể hiển thị tệp trực tiếp.</div>
            <div style={{ marginTop: 8 }}>
              <Button variant="primary" href={fileUrl} target="_blank" download>
                📥 Tải xuống file
              </Button>
            </div>
          </div>
        </object>
      </div>
    );
  }

  // If we don't have a blob URL (e.g., empty fileUrl) fall back to a simple download link
  return (
    <div style={{ padding: 16, maxWidth: centered ? 980 : undefined, margin: centered ? '0 auto' : undefined }}>
      <div style={{ marginBottom: 8 }}>Tệp không khả dụng để xem trước.</div>
      <Button variant="primary" href={fileUrl} target="_blank" download>
        📥 Tải xuống file
      </Button>
    </div>
  );
};

FileViewer.propTypes = {
  fileUrl: PropTypes.string.isRequired,
  fileName: PropTypes.string,
  centered: PropTypes.bool,
};

FileViewer.defaultProps = {
  fileName: '',
  centered: false,
};

export default FileViewer;
