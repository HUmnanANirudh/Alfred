import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { GlobalLayout } from '../layouts/GlobalLayout';
import { ProjectLayout } from '../layouts/ProjectLayout';
import { AudioPage } from '../pages/AudioPage';
import { EmptyWorkspace } from '../pages/EmptyWorkspace';
import { ShortsPage } from '../pages/ShortsPage';
import { SourceDetailPage } from '../pages/SourceDetailPage';
import { SourcesPage } from '../pages/SourcesPage';
import { VideoPage } from '../pages/VideoPage';
import { VoicesPage } from '../pages/VoicesPage';
import { WritingArticlePage } from '../pages/WritingArticlePage';
import { WritingLinkedInPage } from '../pages/WritingLinkedInPage';
import { WritingXPage } from '../pages/WritingXPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <EmptyWorkspace /> },
      {
        element: <GlobalLayout />,
        children: [
          { path: '/voices', element: <VoicesPage /> },
        ],
      },
      {
        path: '/projects/:id',
        element: <ProjectLayout />,
        children: [
          { index: true, element: <Navigate to="video" replace /> },
          { path: 'sources', element: <SourcesPage /> },
          { path: 'sources/:srcId', element: <SourceDetailPage /> },
          { path: 'video', element: <VideoPage /> },
          { path: 'video/shorts', element: <ShortsPage /> },
          { path: 'audio', element: <AudioPage /> },
          { path: 'writing', element: <Navigate to="article" replace /> },
          { path: 'writing/article', element: <WritingArticlePage /> },
          { path: 'writing/x', element: <WritingXPage /> },
          { path: 'writing/linkedin', element: <WritingLinkedInPage /> },
        ],
      },
      { path: '/settings', element: <Navigate to="/" replace /> },
    ],
  },
]);
