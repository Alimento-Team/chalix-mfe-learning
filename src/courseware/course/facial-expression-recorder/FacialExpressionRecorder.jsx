import React, { useRef, useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Webcam from 'react-webcam';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';
import './FacialExpressionRecorder.scss';

const FacialExpressionRecorder = ({
  courseId,
  unitId,
  isActive,
  onError,
}) => {
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [recordingChunks, setRecordingChunks] = useState([]);
  const uploadIntervalRef = useRef(null);

  // Log component mount
  useEffect(() => {
    console.log('FacialExpressionRecorder - Component mounted', {
      courseId,
      unitId,
      isActive,
    });
  }, []);

  // Request camera permission and start recording when component is active
  useEffect(() => {
    console.log('FacialExpressionRecorder - useEffect triggered', {
      isActive,
      hasPermission,
      isRecording,
    });

    if (isActive && hasPermission === null) {
      console.log('FacialExpressionRecorder - Requesting camera permission');
      requestCameraPermission();
    }

    if (isActive && hasPermission === true && !isRecording) {
      console.log('FacialExpressionRecorder - Starting recording');
      startRecording();
    }

    if (!isActive && isRecording) {
      console.log('FacialExpressionRecorder - Stopping recording');
      stopRecording();
    }

    // Cleanup on unmount
    return () => {
      if (isRecording) {
        stopRecording();
      }
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
      }
    };
  }, [isActive, hasPermission, isRecording]);

  const requestCameraPermission = async () => {
    console.log('FacialExpressionRecorder - Requesting camera access...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false 
      });
      
      console.log('FacialExpressionRecorder - Camera permission GRANTED', stream);
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
    } catch (error) {
      console.error('FacialExpressionRecorder - Camera permission DENIED:', error);
      setHasPermission(false);
      if (onError) {
        onError('Camera permission denied. Please allow camera access to continue.');
      }
    }
  };

  const handleDataAvailable = useCallback(({ data }) => {
    if (data.size > 0) {
      setRecordingChunks((prev) => [...prev, data]);
    }
  }, []);

  const startRecording = useCallback(() => {
    if (webcamRef.current && webcamRef.current.stream) {
      try {
        const mediaRecorder = new MediaRecorder(webcamRef.current.stream, {
          mimeType: 'video/webm;codecs=vp8',
        });

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.addEventListener('dataavailable', handleDataAvailable);
        
        // Record in chunks of 10 seconds
        mediaRecorder.start(10000);
        setIsRecording(true);

        // Set up periodic upload of recorded chunks (every 30 seconds)
        uploadIntervalRef.current = setInterval(() => {
          uploadRecordedChunks();
        }, 30000);
      } catch (error) {
        console.error('Error starting recording:', error);
        if (onError) {
          onError('Failed to start facial expression recording.');
        }
      }
    }
  }, [handleDataAvailable, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear upload interval
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }

      // Upload any remaining chunks
      setTimeout(() => {
        uploadRecordedChunks(true);
      }, 1000);
    }
  }, [isRecording]);

  const uploadRecordedChunks = useCallback(async (isFinal = false) => {
    if (recordingChunks.length === 0) {
      return;
    }

    try {
      const blob = new Blob(recordingChunks, { type: 'video/webm' });
      const formData = new FormData();
      
      formData.append('video', blob, `facial_${Date.now()}.webm`);
      formData.append('course_id', courseId);
      formData.append('unit_id', unitId);
      formData.append('is_final', isFinal.toString());
      formData.append('timestamp', new Date().toISOString());

      const client = getAuthenticatedHttpClient();
      const apiUrl = `${getConfig().LMS_BASE_URL}/api/facial-expression/upload/`;

      await client.post(apiUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Clear uploaded chunks
      setRecordingChunks([]);
    } catch (error) {
      console.error('Error uploading facial expression video:', error);
      // Don't show error to user for upload failures to avoid disrupting learning
    }
  }, [recordingChunks, courseId, unitId]);

  // Update chunks state when new data is available
  useEffect(() => {
    if (recordingChunks.length > 0) {
      // Optional: Could trigger upload here if chunks exceed certain size
    }
  }, [recordingChunks]);

  if (!isActive) {
    console.log('FacialExpressionRecorder - Not rendering (not active)');
    return null;
  }

  if (hasPermission === false) {
    console.log('FacialExpressionRecorder - Showing permission prompt');
    return (
      <div className="facial-expression-recorder">
        <div className="webcam-container permission-denied">
          <div className="permission-message">
            <div className="permission-icon">🎥</div>
            <div className="permission-text">Camera access required</div>
            <button 
              className="permission-button"
              onClick={requestCameraPermission}
            >
              Grant Permission
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hasPermission === null) {
    console.log('FacialExpressionRecorder - Requesting permission...');
    return (
      <div className="facial-expression-recorder">
        <div className="webcam-container permission-loading">
          <div className="permission-message">
            <div className="permission-text">Requesting camera...</div>
          </div>
        </div>
      </div>
    );
  }

  console.log('FacialExpressionRecorder - Rendering component', { hasPermission, isRecording });

  return (
    <div className="facial-expression-recorder">
      <div className="webcam-container">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 640,
            height: 480,
            facingMode: 'user',
          }}
          className="webcam-preview"
        />
        {isRecording && (
          <div className="recording-indicator">
            <span className="recording-dot" />
            <span className="recording-text">Recording</span>
          </div>
        )}
      </div>
    </div>
  );
};

FacialExpressionRecorder.propTypes = {
  courseId: PropTypes.string.isRequired,
  unitId: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
  onError: PropTypes.func,
};

FacialExpressionRecorder.defaultProps = {
  onError: null,
};

export default FacialExpressionRecorder;
