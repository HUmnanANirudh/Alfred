import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { GlobalLayout } from '../layouts/GlobalLayout';
import { ProjectLayout } from '../layouts/ProjectLayout';
import { AudioPage } from '../pages/AudioPage';
import { AudioDraftPage } from '../pages/AudioDraftPage';
import { EmptyWorkspace } from '../pages/EmptyWorkspace';
import { SourceDetailPage } from '../pages/SourceDetailPage';
import { SourcesPage } from '../pages/SourcesPage';
import { VideoPage } from '../pages/VideoPage';
import { TranscriptsPage } from '../pages/TranscriptsPage';
import { TranscriptDetailPage } from '../pages/TranscriptDetailPage';
import { VoicesPage } from '../pages/VoicesPage';
import { VoicesRedirect } from '../pages/VoicesRedirect';
import { WritingArticlePage } from '../pages/WritingArticlePage';
import { WritingLinkedInPage } from '../pages/WritingLinkedInPage';
import { WritingXPage } from '../pages/WritingXPage';
import { ModelsPage } from '../pages/ModelsPage';
import { ModelsRedirect } from '../pages/ModelsRedirect';
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
          { path: '/voices', element: <VoicesRedirect /> },
          { path: '/models', element: <ModelsRedirect /> },
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
          { path: 'video/transcripts', element: <TranscriptsPage /> },
          { path: 'video/transcripts/:trsId', element: <TranscriptDetailPage /> },
          { path: 'audio', element: <AudioPage /> },
          { path: 'audio/:audId', element: <AudioDraftPage /> },
          { path: 'voices', element: <VoicesPage /> },
          { path: 'models', element: <ModelsPage /> },
          { path: 'writing', element: <Navigate to="article" replace /> },
          { path: 'writing/article', element: <WritingArticlePage /> },
          { path: 'writing/x', element: <WritingXPage /> },
          { path: 'writing/linkedin', element: <WritingLinkedInPage /> },
        ],
      },
      { path: '/settings', element: <Navigate to="/models" replace /> },
    ],
  },
]);
