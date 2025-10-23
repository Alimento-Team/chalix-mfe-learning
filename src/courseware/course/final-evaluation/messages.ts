import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  finalEvaluationTitle: {
    id: 'learn.course.final.evaluation.title',
    defaultMessage: 'Kiểm tra cuối khóa',
    description: 'Title for the final course evaluation',
  },
  finalEvaluationDescription: {
    id: 'learn.course.final.evaluation.description',
    defaultMessage: 'Bạn đã hoàn thành tất cả bài học. Hãy thực hiện bài kiểm tra cuối khóa để đánh giá kiến thức đã học.',
    description: 'Description for the final course evaluation',
  },
  startQuiz: {
    id: 'learn.course.final.evaluation.start.quiz',
    defaultMessage: 'Bắt đầu kiểm tra',
    description: 'Button text to start the final quiz',
  },
  loading: {
    id: 'learn.course.final.evaluation.loading',
    defaultMessage: 'Đang tải...',
    description: 'Loading message',
  },
  loadError: {
    id: 'learn.course.final.evaluation.load.error',
    defaultMessage: 'Không thể tải thông tin kiểm tra. Vui lòng thử lại.',
    description: 'Error message when failing to load evaluation config',
  },
  quizLoadError: {
    id: 'learn.course.final.evaluation.quiz.load.error',
    defaultMessage: 'Không thể tải câu hỏi kiểm tra. Vui lòng thử lại.',
    description: 'Error message when failing to load quiz questions',
  },
  submitError: {
    id: 'learn.course.final.evaluation.submit.error',
    defaultMessage: 'Không thể nộp bài kiểm tra. Vui lòng thử lại.',
    description: 'Error message when failing to submit quiz',
  },
  incompleteAnswers: {
    id: 'learn.course.final.evaluation.incomplete.answers',
    defaultMessage: 'Vui lòng trả lời tất cả câu hỏi trước khi nộp bài.',
    description: 'Error message when not all questions are answered',
  },
  submitQuiz: {
    id: 'learn.course.final.evaluation.submit.quiz',
    defaultMessage: 'Nộp bài kiểm tra',
    description: 'Button text to submit the quiz',
  },
  submitting: {
    id: 'learn.course.final.evaluation.submitting',
    defaultMessage: 'Đang nộp bài...',
    description: 'Message shown while submitting quiz',
  },
  confirmSubmissionTitle: {
    id: 'learn.course.final.evaluation.confirm.submission.title',
    defaultMessage: 'Xác nhận nộp bài',
    description: 'Title for submission confirmation dialog',
  },
  confirmSubmissionMessage: {
    id: 'learn.course.final.evaluation.confirm.submission.message',
    defaultMessage: 'Bạn có chắc chắn muốn hoàn thành bài kiểm tra cuối khóa? Sau khi nộp bài, bạn sẽ không thể thay đổi câu trả lời.',
    description: 'Message asking for confirmation before submitting quiz',
  },
  cancel: {
    id: 'learn.course.final.evaluation.cancel',
    defaultMessage: 'Hủy',
    description: 'Cancel button text',
  },
  confirmSubmit: {
    id: 'learn.course.final.evaluation.confirm.submit',
    defaultMessage: 'Xác nhận nộp bài',
    description: 'Confirm submit button text',
  },
  quizCompleted: {
    id: 'learn.course.final.evaluation.quiz.completed',
    defaultMessage: 'Hoàn thành kiểm tra cuối khóa',
    description: 'Title when quiz is completed',
  },
  finalScore: {
    id: 'learn.course.final.evaluation.final.score',
    defaultMessage: 'Điểm số cuối cùng',
    description: 'Label for final score',
  },
  correctAnswers: {
    id: 'learn.course.final.evaluation.correct.answers',
    defaultMessage: 'Câu trả lời đúng',
    description: 'Label for number of correct answers',
  },
  quizCompletedMessage: {
    id: 'learn.course.final.evaluation.quiz.completed.message',
    defaultMessage: 'Chúc mừng! Bạn đã hoàn thành bài kiểm tra cuối khóa. Kết quả của bạn đã được ghi nhận.',
    description: 'Message shown when quiz is completed successfully',
  },
  multipleChoiceNote: {
    id: 'learn.course.final.evaluation.multiple.choice.note',
    defaultMessage: '(Có thể chọn nhiều đáp án)',
    description: 'Note for multiple choice questions',
  },
  projectTitle: {
    id: 'learn.course.final.evaluation.project.title',
    defaultMessage: 'Nộp bài thu hoạch',
    description: 'Title for project evaluation',
  },
  projectDescription: {
    id: 'learn.course.final.evaluation.project.description',
    defaultMessage: 'Vui lòng tải lên file bài thu hoạch của bạn (định dạng DOCX hoặc PDF).',
    description: 'Description for project evaluation',
  },
  uploadFile: {
    id: 'learn.course.final.evaluation.upload.file',
    defaultMessage: 'Chọn file để tải lên',
    description: 'Button text to upload file',
  },
  submitProject: {
    id: 'learn.course.final.evaluation.submit.project',
    defaultMessage: 'Nộp bài thu hoạch',
    description: 'Button text to submit project',
  },
  fileSelected: {
    id: 'learn.course.final.evaluation.file.selected',
    defaultMessage: 'File đã chọn',
    description: 'Label for selected file',
  },
  noFileSelected: {
    id: 'learn.course.final.evaluation.no.file.selected',
    defaultMessage: 'Chưa chọn file',
    description: 'Message when no file is selected',
  },
  invalidFileType: {
    id: 'learn.course.final.evaluation.invalid.file.type',
    defaultMessage: 'Vui lòng chọn file có định dạng DOCX hoặc PDF.',
    description: 'Error message for invalid file type',
  },
  fileSizeExceeded: {
    id: 'learn.course.final.evaluation.file.size.exceeded',
    defaultMessage: 'Kích thước file không được vượt quá {maxSize}MB.',
    description: 'Error message when file size exceeds limit',
  },
  projectSubmitted: {
    id: 'learn.course.final.evaluation.project.submitted',
    defaultMessage: 'Đã nộp bài thu hoạch',
    description: 'Title when project is submitted',
  },
  projectSubmittedMessage: {
    id: 'learn.course.final.evaluation.project.submitted.message',
    defaultMessage: 'Chúc mừng! Bài thu hoạch của bạn đã được nộp thành công. Giảng viên sẽ chấm điểm và phản hồi trong thời gian sớm nhất.',
    description: 'Message shown when project is submitted successfully',
  },
  projectSubmitError: {
    id: 'learn.course.final.evaluation.project.submit.error',
    defaultMessage: 'Không thể nộp bài thu hoạch. Vui lòng thử lại.',
    description: 'Error message when failing to submit project',
  },
  confirmProjectSubmissionTitle: {
    id: 'learn.course.final.evaluation.confirm.project.submission.title',
    defaultMessage: 'Xác nhận nộp bài',
    description: 'Title for project submission confirmation dialog',
  },
  confirmProjectSubmissionMessage: {
    id: 'learn.course.final.evaluation.confirm.project.submission.message',
    defaultMessage: 'Bạn có chắc chắn muốn nộp bài thu hoạch này? Sau khi nộp bài, bạn sẽ không thể thay đổi.',
    description: 'Message asking for confirmation before submitting project',
  },
});

export default messages;