import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import StoryList from './pages/StoryList'
import Featured from './pages/Featured'
import StoryReader from './pages/StoryReader'
import StoryEditor from './pages/StoryEditor'
import CreateStory from './pages/CreateStory'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import RequireAdmin from './components/RequireAdmin'
import Navbar from './components/Navbar'
import InkCursor from './components/InkCursor'
import CurtainReveal from './components/CurtainReveal'
import RouteMusic from './components/RouteMusic'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { AudioProvider } from './audio/AudioProvider'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AudioProvider>
          <BrowserRouter>
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
          </BrowserRouter>
        </AudioProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
