import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import CourseOutlineView from './CourseOutlineView';
import { useModel } from '../../generic/model-store';

// Mock the model store hook
jest.mock('../../generic/model-store', () => ({
  useModel: jest.fn(),
}));

// Mock the redux store
const mockStore = configureStore({
  reducer: {
    courseHome: (state = { courseId: 'test-course' }) => state,
  },
});

const renderWithProviders = (component) => {
  return render(
    <Provider store={mockStore}>
      <IntlProvider locale="en">
        {component}
      </IntlProvider>
    </Provider>
  );
};

describe('CourseOutlineView', () => {
  beforeEach(() => {
    useModel.mockImplementation((modelType, courseId) => {
      if (modelType === 'courseHomeMeta') {
        return {
          title: 'KHÓA HỌC LẬP TRÌNH NODEJS TỪ ZERO ĐẾN MASTER',
        };
      }
      if (modelType === 'outline') {
        return {
          courseBlocks: {
            courses: {
              'test-course': {
                sectionIds: ['section-1', 'section-2'],
              },
            },
            sections: {
              'section-1': {
                id: 'section-1',
                title: 'Chuyên đề 01: Khái niệm về Nodejs',
                sequenceIds: ['seq-1', 'seq-2'],
                complete: false,
              },
              'section-2': {
                id: 'section-2',
                title: 'Chuyên đề 02: Khởi tạo project',
                sequenceIds: ['seq-3', 'seq-4'],
                complete: false,
              },
            },
          },
        };
      }
      return {};
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders course title and instructor information', () => {
    renderWithProviders(<CourseOutlineView />);
    
    expect(screen.getByText('KHÓA HỌC LẬP TRÌNH NODEJS TỪ ZERO ĐẾN MASTER')).toBeInTheDocument();
    expect(screen.getByText('Giảng viên: Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('Tổng số giờ phải khóa học: 40h')).toBeInTheDocument();
  });

  it('renders course modules list', () => {
    renderWithProviders(<CourseOutlineView />);
    
    expect(screen.getByText('Chuyên đề 01: Khái niệm về Nodejs')).toBeInTheDocument();
    expect(screen.getByText('Chuyên đề 02: Khởi tạo project')).toBeInTheDocument();
  });

  it('switches between modules when clicked', () => {
    renderWithProviders(<CourseOutlineView />);
    
    const firstModule = screen.getByText('Chuyên đề 01: Khái niệm về Nodejs').closest('.module-item');
    const secondModule = screen.getByText('Chuyên đề 02: Khởi tạo project').closest('.module-item');
    
    // First module should be active by default
    expect(firstModule).toHaveClass('active');
    expect(secondModule).not.toHaveClass('active');
    
    // Click on second module
    fireEvent.click(secondModule);
    
    // Second module should now be active
    expect(secondModule).toHaveClass('active');
    expect(firstModule).not.toHaveClass('active');
  });

  it('displays content types for selected module', () => {
    renderWithProviders(<CourseOutlineView />);
    
    expect(screen.getByText('Học trực tuyến')).toBeInTheDocument();
    expect(screen.getByText('Video bài giảng')).toBeInTheDocument();
    expect(screen.getByText('Slide bài giảng')).toBeInTheDocument();
    expect(screen.getByText('Trắc nghiệm')).toBeInTheDocument();
  });

  it('renders fallback data when no course sections available', () => {
    useModel.mockImplementation((modelType) => {
      if (modelType === 'courseHomeMeta') {
        return {
          title: 'KHÓA HỌC LẬP TRÌNH NODEJS TỪ ZERO ĐẾN MASTER',
        };
      }
      if (modelType === 'outline') {
        return {
          courseBlocks: {
            courses: {},
            sections: {},
          },
        };
      }
      return {};
    });

    renderWithProviders(<CourseOutlineView />);
    
    // Should show fallback sections
    expect(screen.getByText(/Chuyên đề 01: Khái niệm về Nodejs/)).toBeInTheDocument();
    expect(screen.getByText(/Chuyên đề 02: Khởi tạo project/)).toBeInTheDocument();
  });
});
