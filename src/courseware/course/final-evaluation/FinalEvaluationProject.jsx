import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import { 
  Button, 
  Card, 
  Alert, 
  Spinner, 
  StandardModal,
  Form,
  ProgressBar
} from '@openedx/paragon';
import { CheckCircle, AddToDrive } from '@openedx/paragon/icons';
import { 
  getFinalEvaluationConfig,
  submitFinalEvaluationProject
} from './api';
import messages from './messages';
import { useFinalUnitDetection } from './hooks';

const FinalEvaluationProject = ({ courseId, sequenceId, unitId }) => {
  const intl = useIntl();
  const isFinalUnit = useFinalUnitDetection(sequenceId, unitId);
  const fileInputRef = useRef(null);
  
  const [evaluationConfig, setEvaluationConfig] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // File validation constants
  const MAX_FILE_SIZE_MB = 50;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
  ];
  const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.docx', '.doc'];

  // Always log component render
  console.log('📄 FinalEvaluationProject rendered with props:', { 
    courseId, 
    sequenceId, 
    unitId, 
    isFinalUnit,
    timestamp: new Date().toISOString()
  });

  // Early return if not final unit
  if (!isFinalUnit) {
    console.log('🚫 Not rendering FinalEvaluationProject: not a final unit');
    return null;
  }

  useEffect(() => {
    console.log('🔄 FinalEvaluationProject useEffect triggered:', { isFinalUnit, courseId });
    if (isFinalUnit && courseId) {
      console.log('✅ Loading final evaluation config for course:', courseId);
      loadConfig();
    } else {
      console.log('❌ Not loading config:', { isFinalUnit, courseId });
    }
  }, [isFinalUnit, courseId]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Loading final evaluation config...');
      const config = await getFinalEvaluationConfig(courseId);
      console.log('✅ Config loaded:', config);
      setEvaluationConfig(config);
      
      // Check if already submitted
      if (config.submitted) {
        setSubmitted(true);
      }
    } catch (err) {
      console.error('❌ Failed to load config:', err);
      setError(intl.formatMessage(messages.loadError));
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file) => {
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
      return intl.formatMessage(messages.invalidFileType);
    }

    // Also check MIME type if available
    if (file.type && !ALLOWED_FILE_TYPES.includes(file.type)) {
      return intl.formatMessage(messages.invalidFileType);
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return intl.formatMessage(messages.fileSizeExceeded, { maxSize: MAX_FILE_SIZE_MB });
    }

    return null;
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setError(null);
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
    setError(null);
    console.log('✅ File selected:', { name: file.name, size: file.size, type: file.type });
  };

  const handleSubmitAttempt = () => {
    if (!selectedFile) {
      setError(intl.formatMessage(messages.noFileSelected));
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setShowConfirmModal(false);
    
    try {
      console.log('📤 Submitting project file:', selectedFile.name);
      const result = await submitFinalEvaluationProject(courseId, selectedFile);
      console.log('✅ Project submitted successfully:', result);
      setSubmitted(true);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('❌ Failed to submit project:', err);
      const errorMessage = err?.response?.data?.message || intl.formatMessage(messages.projectSubmitError);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Debug logging
  console.log('FinalEvaluationProject debug:', {
    courseId,
    loading,
    error,
    evaluationConfig,
    selectedFile: selectedFile?.name,
    submitted
  });

  // Don't show anything if no evaluation configured or not project type
  if (!evaluationConfig || evaluationConfig.evaluation_type !== 'project') {
    return null;
  }

  if (loading && !submitted) {
    return (
      <div className="d-flex justify-content-center align-items-center py-4">
        <Spinner animation="border" variant="primary" />
        <span className="ml-2">{intl.formatMessage(messages.loading)}</span>
      </div>
    );
  }

  // Show success message if already submitted
  if (submitted) {
    return (
      <Card className="mt-4 p-4">
        <div className="text-center">
          <CheckCircle className="text-success mb-3" size="lg" />
          <h3>{intl.formatMessage(messages.projectSubmitted)}</h3>
          
          <div className="mt-4">
            <p className="text-muted">
              {intl.formatMessage(messages.projectSubmittedMessage)}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Show project submission form
  return (
    <div className="mt-4">
      <Card className="p-4">
        <h3 className="mb-3">{intl.formatMessage(messages.projectTitle)}</h3>
        
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {/* Display the project question/description */}
        {evaluationConfig.description && (
          <Card className="mb-4 p-3" style={{ backgroundColor: '#f8f9fa' }}>
            <h5 className="mb-2">Câu hỏi:</h5>
            <div dangerouslySetInnerHTML={{ __html: evaluationConfig.description }} />
          </Card>
        )}

        <p className="text-muted mb-4">
          {intl.formatMessage(messages.projectDescription)}
        </p>

        <Form>
          <Form.Group className="mb-4">
            <div className="d-flex align-items-center gap-3">
              <Button
                variant="outline-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
              >
                <AddToDrive className="mr-2" />
                {intl.formatMessage(messages.uploadFile)}
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                disabled={submitting}
              />

              {selectedFile && (
                <div className="flex-grow-1">
                  <strong>{intl.formatMessage(messages.fileSelected)}:</strong> {selectedFile.name}
                  <br />
                  <small className="text-muted">
                    {formatFileSize(selectedFile.size)}
                  </small>
                </div>
              )}
              
              {!selectedFile && (
                <span className="text-muted">
                  {intl.formatMessage(messages.noFileSelected)}
                </span>
              )}
            </div>
            
            <Form.Text className="text-muted mt-2">
              Định dạng được chấp nhận: PDF, DOCX. Kích thước tối đa: {MAX_FILE_SIZE_MB}MB
            </Form.Text>
          </Form.Group>

          <div className="text-center mt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmitAttempt}
              disabled={submitting || !selectedFile}
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="mr-2" />
                  {intl.formatMessage(messages.submitting)}
                </>
              ) : (
                intl.formatMessage(messages.submitProject)
              )}
            </Button>
          </div>
        </Form>
      </Card>

      {/* Confirmation Modal */}
      <StandardModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={intl.formatMessage(messages.confirmProjectSubmissionTitle)}
      >
        <StandardModal.Header>
          <StandardModal.Title>
            {intl.formatMessage(messages.confirmProjectSubmissionTitle)}
          </StandardModal.Title>
        </StandardModal.Header>
        <StandardModal.Body>
          <p>{intl.formatMessage(messages.confirmProjectSubmissionMessage)}</p>
          {selectedFile && (
            <div className="mt-3 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <strong>File:</strong> {selectedFile.name}
              <br />
              <strong>Kích thước:</strong> {formatFileSize(selectedFile.size)}
            </div>
          )}
        </StandardModal.Body>
        <StandardModal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowConfirmModal(false)}
          >
            {intl.formatMessage(messages.cancel)}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmSubmit}
          >
            {intl.formatMessage(messages.confirmSubmit)}
          </Button>
        </StandardModal.Footer>
      </StandardModal>
    </div>
  );
};

FinalEvaluationProject.propTypes = {
  courseId: PropTypes.string.isRequired,
  sequenceId: PropTypes.string.isRequired,
  unitId: PropTypes.string.isRequired,
};

export default FinalEvaluationProject;
