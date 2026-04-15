import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import TodayScreen from './screens/TodayScreen';
import HistoryScreen from './screens/HistoryScreen';
import SessionDetailScreen from './screens/SessionDetailScreen';
import SessionEditorScreen from './screens/SessionEditorScreen';
import TemplatesListScreen from './screens/TemplatesListScreen';
import TemplateEditorScreen from './screens/TemplateEditorScreen';
import ProgramCycleScreen from './screens/ProgramCycleScreen';
import SettingsScreen from './screens/SettingsScreen';
import LiveWorkoutScreen from './screens/LiveWorkoutScreen';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<TodayScreen />} />
          <Route path="history" element={<HistoryScreen />} />
          <Route path="history/:sessionId" element={<SessionDetailScreen />} />
          <Route path="history/:sessionId/edit" element={<SessionEditorScreen />} />
          <Route path="templates" element={<TemplatesListScreen />} />
          <Route path="templates/new" element={<TemplateEditorScreen />} />
          <Route path="templates/:id" element={<TemplateEditorScreen />} />
          <Route path="program" element={<ProgramCycleScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>
        <Route path="workout" element={<LiveWorkoutScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
