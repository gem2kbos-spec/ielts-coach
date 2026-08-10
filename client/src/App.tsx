import { Routes, Route } from 'react-router-dom'
import Home from '@/modules/home/Home'
import ImportPanel from '@/modules/items/ImportPanel'
import Task1Exam from '@/modules/writing/Task1Exam'
import Task2Exam from '@/modules/writing/Task2Exam'
import WritingMenu from '@/modules/writing/WritingMenu'
import Part1Flow from '@/modules/speaking/Part1Flow'
import Part2Flow from '@/modules/speaking/Part2Flow'
import ShadowReading from '@/modules/speaking/ShadowReading'
import ExaminerChat from '@/modules/speaking/ExaminerChat'
import SpeakingFullFlow from '@/modules/speaking/SpeakingFullFlow'
import SpeakingMenu from '@/modules/speaking/SpeakingMenu'
import Dashboard from '@/modules/dashboard/Dashboard'
import PassageReader from '@/modules/reading/PassageReader'
import ReadingMenu from '@/modules/reading/ReadingMenu'
import ReadingImport from '@/modules/reading/ReadingImport'
import ReadingExam from '@/modules/reading/ReadingExam'
import ReadingGenerate from '@/modules/reading/ReadingGenerate'
import VocabLibrary from '@/modules/vocab/VocabLibrary'
import DiagnosisPage from '@/modules/diagnosis/DiagnosisPage'
import ListeningMenu from '@/modules/listening/ListeningMenu'
import ListeningImport from '@/modules/listening/ListeningImport'
import ListeningMockSetup from '@/modules/listening/ListeningMockSetup'
import ListeningExam from '@/modules/listening/ListeningExam'
import ListeningDictation from '@/modules/listening/ListeningDictation'
import BackupPage from '@/modules/backup/BackupPage'
import MockFullSetup from '@/modules/mock/MockFullSetup'
import MockFullRunner from '@/modules/mock/MockFullRunner'
import MockFullReport from '@/modules/mock/MockFullReport'
import HistoryMenu from '@/modules/history/HistoryMenu'
import HistoryDetail from '@/modules/history/HistoryDetail'
import WeaknessNotebook from '@/modules/weakness/WeaknessNotebook'
import WritingGenerate from '@/modules/writing/WritingGenerate'
import ExpressionMenu from '@/modules/writing/expressions/ExpressionMenu'
import ExpressionDrill from '@/modules/writing/expressions/ExpressionDrill'
import ExpressionHistory from '@/modules/writing/expressions/ExpressionHistory'
import ExpressionReview from '@/modules/writing/expressions/ExpressionReview'
import ExpressionBatch from '@/modules/writing/expressions/ExpressionBatch'
import PageTransition from '@/components/PageTransition'
import RequireAuth from '@/components/RequireAuth'
import Login from '@/modules/auth/Login'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <PageTransition />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/diagnosis" element={<DiagnosisPage />} />
        <Route path="/import" element={<ImportPanel />} />
        <Route path="/writing" element={<WritingMenu />} />
        <Route path="/writing/task1" element={<Task1Exam />} />
        <Route path="/writing/task2" element={<Task2Exam />} />
        <Route path="/writing/generate" element={<WritingGenerate />} />
        <Route path="/writing/expressions" element={<ExpressionMenu />} />
        <Route path="/writing/expressions/drill" element={<ExpressionDrill />} />
        <Route path="/writing/expressions/history" element={<ExpressionHistory />} />
        <Route path="/writing/expressions/review" element={<ExpressionReview />} />
        <Route path="/writing/expressions/batch" element={<ExpressionBatch />} />
        <Route path="/reading" element={<ReadingMenu />} />
        <Route path="/reading/freeread" element={<PassageReader />} />
        <Route path="/reading/import" element={<ReadingImport />} />
        <Route path="/reading/exam/:id" element={<ReadingExam />} />
        <Route path="/reading/generate" element={<ReadingGenerate />} />
        <Route path="/listening" element={<ListeningMenu />} />
        <Route path="/listening/import" element={<ListeningImport />} />
        <Route path="/listening/mock" element={<ListeningMockSetup />} />
        <Route path="/listening/mock/exam" element={<ListeningExam />} />
        <Route path="/listening/exam/:id" element={<ListeningExam />} />
        <Route path="/listening/dictation/:id" element={<ListeningDictation />} />
        <Route path="/speaking" element={<SpeakingMenu />} />
        <Route path="/speaking/part1" element={<Part1Flow />} />
        <Route path="/speaking/part2" element={<Part2Flow />} />
        <Route path="/speaking/shadow" element={<ShadowReading />} />
        <Route path="/speaking/examiner" element={<ExaminerChat />} />
        <Route path="/speaking/full" element={<SpeakingFullFlow />} />
        <Route path="/vocab" element={<VocabLibrary />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/mock" element={<MockFullSetup />} />
        <Route path="/mock/run/:id" element={<MockFullRunner />} />
        <Route path="/mock/report/:id" element={<MockFullReport />} />
        <Route path="/history" element={<HistoryMenu />} />
        <Route path="/history/:id" element={<HistoryDetail />} />
        <Route path="/weakness" element={<WeaknessNotebook />} />
      </Route>
    </Routes>
  )
}

export default App
