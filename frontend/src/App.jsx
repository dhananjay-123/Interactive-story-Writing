import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import StoryList from './pages/StoryList'
import Featured from './pages/Featured'
import StoryReader from './pages/StoryReader'
import StoryEditor from './pages/StoryEditor'
import CreateStory from './pages/CreateStory'
import MyStories from './pages/MyStories'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import Achievements from './pages/Achievements'
import Leaderboard from './pages/Leaderboard'
import Contests from './pages/Contests'
import ContestDetail from './pages/ContestDetail'
import RequireAdmin from './components/RequireAdmin'
import Navbar from './components/Navbar'
import InkCursor from './components/InkCursor'
import CurtainReveal from './components/CurtainReveal'
import RouteMusic from './components/RouteMusic'
import { AchievementsProvider } from './components/achievements/AchievementsProvider'
import { NotificationsProvider } from './context/NotificationsContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { AudioProvider } from './audio/AudioProvider'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AudioProvider>
          <BrowserRouter>
            <NotificationsProvider>
            <AchievementsProvider>
              <CurtainReveal />
              <InkCursor />
              <Navbar />
              <RouteMusic />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/stories" element={<StoryList />} />
                <Route path="/featured" element={<Featured />} />
                <Route path="/story/:id" element={<StoryReader />} />
                <Route path="/story/:id/edit" element={<StoryEditor />} />
                <Route path="/create" element={<CreateStory />} />
                <Route path="/my-stories" element={<MyStories />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/contests" element={<Contests />} />
                <Route path="/contests/:id" element={<ContestDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/author/:username" element={<Profile />} />
                <Route
                  path="/admin"
                  element={
                    <RequireAdmin>
                      <AdminDashboard />
                    </RequireAdmin>
                  }
                />
              </Routes>
            </AchievementsProvider>
            </NotificationsProvider>
          </BrowserRouter>
        </AudioProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
