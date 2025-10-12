import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  donutLabel: {
    id: 'progress.completion.donut.label',
    defaultMessage: 'Đã hoàn thành',
    description: 'Label text for progress donut chart',
  },
  completionBody: {
    id: 'progress.completion.body',
    defaultMessage: 'Đây thể hiện phần nội dung khoá học mà bạn đã hoàn thành. Lưu ý rằng một số nội dung có thể chưa được phát hành.',
    description: 'It explains the meaning of progress donut chart',
  },
  completeContentTooltip: {
    id: 'progress.completion.tooltip.locked',
    defaultMessage: 'Nội dung mà bạn đã hoàn thành.',
    description: 'It expalains the meaning of content that is completed',
  },
  courseCompletion: {
    id: 'progress.completion.header',
    defaultMessage: 'Hoàn thành khoá học',
    description: 'Header text for (completion donut chart) section of the progress tab',
  },
  incompleteContentTooltip: {
    id: 'progress.completion.tooltip',
    defaultMessage: 'Nội dung mà bạn có quyền truy cập nhưng chưa hoàn thành.',
    description: 'It explain the meaning for content is completed',
  },
  lockedContentTooltip: {
    id: 'progress.completion.tooltip.complete',
    defaultMessage: 'Nội dung bị khoá và chỉ có sẵn cho những người nâng cấp.',
    description: 'It expalains the meaning of content that is locked',
  },
  percentComplete: {
    id: 'progress.completion.donut.percentComplete',
    defaultMessage: 'Bạn đã hoàn thành {percent}% nội dung trong khoá học này.',
    description: 'It summarize the progress in the course (100% - %incomplete)',
  },
  percentIncomplete: {
    id: 'progress.completion.donut.percentIncomplete',
    defaultMessage: 'Bạn chưa hoàn thành {percent}% nội dung trong khoá học này mà bạn có quyền truy cập.',
    description: 'It summarize the progress in the course (100% - %complete)',
  },
  percentLocked: {
    id: 'progress.completion.donut.percentLocked',
    defaultMessage: '{percent}% nội dung trong khoá học này bị khoá và chỉ có sẵn cho những người nâng cấp.',
    description: 'It indicate the relative size of content that is locked in the course (100% - %open_content)',
  },
});

export default messages;
