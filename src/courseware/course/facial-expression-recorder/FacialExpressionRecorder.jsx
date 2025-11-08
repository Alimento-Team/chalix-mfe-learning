import React, { useRef, useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Webcam from 'react-webcam';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';
import './FacialExpressionRecorder.scss';

// Constants for recording configuration
const MAX_RECORDING_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const MIN_RECORDING_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const CHUNK_INTERVAL = 10000; // 10 seconds chunks
const UPLOAD_INTERVAL = 30000; // Upload every 30 seconds
const VIDEO_WIDTH = 1280; // 720p width
const VIDEO_HEIGHT = 720; // 720p height

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
  const recordingStartTimeRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Generate a unique storage key for this course-unit combination
  const getStorageKey = useCallback(() => {
    return `facial-recording-${courseId}-${unitId}`;
  }, [courseId, unitId]);

  // Check if there's a previous valid recording
  const checkPreviousRecording = useCallback(() => {
    const storageKey = getStorageKey();
    const storedData = localStorage.getItem(storageKey);
    
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        const recordingDuration = data.duration || 0;
        
        // Check if recording meets minimum duration
        const meetsMinDuration = recordingDuration >= MIN_RECORDING_DURATION;
        
        console.log('Previous recording check:', {
          duration: recordingDuration / 1000,
          meetsMinDuration,
        });
        
        return meetsMinDuration;
      } catch (error) {
        console.error('Error parsing stored recording data:', error);
        localStorage.removeItem(storageKey);
      }
    }
    return false;
  }, [courseId, unitId, getStorageKey]);

  // Save recording state to localStorage
  const saveRecordingState = useCallback((duration, isComplete = false) => {
    const storageKey = getStorageKey();
    const data = {
      courseId,
      unitId,
      duration,
      timestamp: Date.now(),
      isComplete,
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
    console.log('Recording state saved:', data);
  }, [courseId, unitId, getStorageKey]);

  // Clear recording state from localStorage
  const clearRecordingState = useCallback(() => {
    const storageKey = getStorageKey();
    localStorage.removeItem(storageKey);
    console.log('Recording state cleared');
  }, [getStorageKey]);

  // Log component mount
  useEffect(() => {
    console.log('FacialExpressionRecorder - Component mounted', {
      courseId,
      unitId,
      isActive,
    });

    // Check if we need to record based on previous recording
    const hasPreviousValidRecording = checkPreviousRecording();
    console.log('Has previous valid recording:', hasPreviousValidRecording);
    
    // If there's a valid previous recording, we can skip recording for this session
    if (hasPreviousValidRecording) {
      console.log('Skipping recording - valid recording exists');
    }
  }, [courseId, unitId, isActive, checkPreviousRecording]);

  // Request camera permission and start recording when component is active
  useEffect(() => {
    console.log('FacialExpressionRecorder - useEffect triggered', {
      isActive,
      hasPermission,
      isRecording,
    });

    // Skip recording if there's a valid previous recording
    const hasPreviousValidRecording = checkPreviousRecording();
    if (hasPreviousValidRecording) {
      console.log('Skipping recording - valid previous recording exists');
      return;
    }

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
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isActive, hasPermission, isRecording, checkPreviousRecording]);

  const requestCameraPermission = async () => {
    console.log('FacialExpressionRecorder - Requesting camera access...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: VIDEO_WIDTH },
          height: { ideal: VIDEO_HEIGHT },
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
        // Use higher bitrate for better quality (720p)
        const options = {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 2500000, // 2.5 Mbps for 720p quality
        };
        
        // Fallback to vp8 if vp9 is not supported
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm;codecs=vp8';
          options.videoBitsPerSecond = 2000000; // 2 Mbps for vp8
        }

        const mediaRecorder = new MediaRecorder(webcamRef.current.stream, options);

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.addEventListener('dataavailable', handleDataAvailable);
        
        // Record in chunks of 10 seconds
        mediaRecorder.start(CHUNK_INTERVAL);
        setIsRecording(true);
        
        // Track recording start time
        recordingStartTimeRef.current = Date.now();
        setRecordingDuration(0);

        // Set up periodic upload of recorded chunks (every 30 seconds)
        uploadIntervalRef.current = setInterval(() => {
          uploadRecordedChunks();
        }, UPLOAD_INTERVAL);

        // Set up recording duration tracker (update every second)
        recordingTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - recordingStartTimeRef.current;
          setRecordingDuration(elapsed);
          
          // Save state periodically
          saveRecordingState(elapsed, false);
          
          // Stop recording after 10 minutes
          if (elapsed >= MAX_RECORDING_DURATION) {
            console.log('Maximum recording duration reached (10 minutes)');
            stopRecording();
          }
        }, 1000);

        console.log('Recording started with options:', options);
      } catch (error) {
        console.error('Error starting recording:', error);
        if (onError) {
          onError('Failed to start facial expression recording.');
        }
      }
    }
  }, [handleDataAvailable, onError, saveRecordingState]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Calculate final duration
      const finalDuration = recordingStartTimeRef.current 
        ? Date.now() - recordingStartTimeRef.current 
        : recordingDuration;
      
      console.log('Recording stopped. Duration:', finalDuration / 1000, 'seconds');
      
      // Clear intervals
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
        uploadIntervalRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      // Save final state to localStorage
      const meetsMinDuration = finalDuration >= MIN_RECORDING_DURATION;
      if (meetsMinDuration) {
        saveRecordingState(finalDuration, true);
        console.log('Recording meets minimum duration requirement (5 minutes)');
      } else {
        console.log('Recording does not meet minimum duration. Will need to record again next time.');
        clearRecordingState();
      }

      // Upload any remaining chunks
      setTimeout(() => {
        uploadRecordedChunks(true, finalDuration);
      }, 1000);
    }
  }, [isRecording, recordingDuration, saveRecordingState, clearRecordingState]);

  const uploadRecordedChunks = useCallback(async (isFinal = false, duration = null) => {
    if (recordingChunks.length === 0) {
      return;
    }

    try {
      const blob = new Blob(recordingChunks, { type: 'video/webm' });
      const formData = new FormData();
      
      // Calculate duration if not provided
      const recordingDurationSeconds = duration 
        ? Math.floor(duration / 1000)
        : Math.floor((Date.now() - (recordingStartTimeRef.current || Date.now())) / 1000);
      
      formData.append('video', blob, `facial_${Date.now()}.webm`);
      formData.append('course_id', courseId);
      formData.append('unit_id', unitId);
      formData.append('is_final', isFinal.toString());
      formData.append('timestamp', new Date().toISOString());
      formData.append('duration_seconds', recordingDurationSeconds.toString());

      const client = getAuthenticatedHttpClient();
      const apiUrl = `${getConfig().LMS_BASE_URL}/api/facial-expression/upload/`;

      await client.post(apiUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Video chunk uploaded successfully. Duration:', recordingDurationSeconds, 'seconds');

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

  // Format recording duration for display
  const formatDuration = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="facial-expression-recorder">
      <div className="webcam-container">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
            facingMode: 'user',
          }}
          className="webcam-preview"
        />
        {isRecording && (
          <div className="recording-indicator">
            <span className="recording-dot" />
            <span className="recording-text">
              Recording {formatDuration(recordingDuration)} / 10:00
            </span>
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
