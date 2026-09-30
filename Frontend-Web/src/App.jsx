import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { MeetingProvider } from './context/MeetingContext';
import Upload from './pages/Upload/Upload';
import Transcription from './pages/Transcription/Transcription';
import RefineSummary from './pages/RefineSummary/RefineSummary';
import ArchiveLibrary from './pages/ArchiveLibrary/ArchiveLibrary';
import BehavioralAnalytics from './pages/BehavioralAnalytics/BehavioralAnalytics';
import { Overview } from './pages/Overview/Overview';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ChatBotPage from './pages/ChatBotPage';
import Login from './pages/Login/Login';
import Unauthorized from './pages/Unauthorized/Unauthorized';
import PrivateRoute from './components/PrivateRoute';

const P = ({ children, ...props }) => <PrivateRoute {...props}>{children}</PrivateRoute>;

// createBrowserRouter enables useBlocker (navigation guard) support
const router = createBrowserRouter([
  { path: '/login',        element: <Login /> },
  { path: '/unauthorized', element: <Unauthorized /> },
  { path: '/',             element: <Navigate to="/archive" replace /> },
  { path: '/archive',      element: <P><ArchiveLibrary /></P> },
  { path: '/upload',       element: <P requiredPermission="meeting.upload"><Upload /></P> },
  {
    path: '/transcription',
    element: (
      <P requiredPermissions={['team.transcript.read', 'dept.transcript.read']}>
        <Transcription />
      </P>
    ),
  },
  {
    path: '/summary',
    element: (
      <P requiredPermissions={['team.pv.read', 'dept.pv.read']}>
        <RefineSummary />
      </P>
    ),
  },
  {
    path: '/analytics',
    element: (
      <P
        requiredPermissions={[
          'team.analytics.self',
          'team.analytics.others',
          'dept.analytics.self',
          'dept.analytics.others',
        ]}
      >
        <BehavioralAnalytics />
      </P>
    ),
  },
  { path: '/overview',     element: <P><Overview /></P> },
  { path: '/overview/:id', element: <P><Overview /></P> },
  { path: '/admin',        element: <P><AdminDashboard /></P> },
  { path: '/chatbot',      element: <P><ChatBotPage /></P> },
  { path: '*',             element: <Navigate to="/login" replace /> },
]);

function App() {
  return (
    <MeetingProvider>
      <RouterProvider router={router} />
    </MeetingProvider>
  );
}

export default App;

