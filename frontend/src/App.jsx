import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import StoryList from './pages/StoryList'
import StoryReader from './pages/StoryReader'
import StoryEditor from './pages/StoryEditor'
import CreateStory from './pages/CreateStory'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import RequireAdmin from './components/RequireAdmin'
import Navbar from './components/Navbar'
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
            <Navbar />
            <RouteMusic />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/stories" element={<StoryList />} />
              <Route path="/story/:id" element={<StoryReader />} />
              <Route path="/story/:id/edit" element={<StoryEditor />} />
              <Route path="/create" element={<CreateStory />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
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
