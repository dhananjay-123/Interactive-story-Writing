import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import StoryList from './pages/StoryList'
import RequireAdmin from './components/RequireAdmin'
import Navbar from './components/Navbar'
import InkCursor from './components/InkCursor'
import CurtainReveal from './components/CurtainReveal'
import RouteMusic from './components/RouteMusic'
import ConnectingLoader from './components/ConnectingLoader'
import { AchievementsProvider } from './components/achievements/AchievementsProvider'
import { NotificationsProvider } from './context/NotificationsContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { AudioProvider } from './audio/AudioProvider'
import { ToastProvider } from './components/ui'

// Route-level code splitting.
//
// Everything used to arrive in one 1.18 MB bundle: a first-time reader landing
// on the home page downloaded the rich-text editor, the socket client, the
// studio graph, the world map and the whole game layer before seeing a word of
// the hero. None of that is needed until someone signs in and starts writing.
//
// Home and StoryList stay eager — they are the two entry points, and lazy-
// loading the page you are already looking at only adds a round trip. Everything
// else is split, heaviest first: StoryEditor and StoryStudio pull in TipTap and
// the collaboration socket, and now do so only when an author opens them.
const Featured = lazy(() => import('./pages/Featured'))
const StoryReader = lazy(() => import('./pages/StoryReader'))
const StoryGames = lazy(() => import('./pages/StoryGames'))
const StoryEditor = lazy(() => import('./pages/StoryEditor'))
const StoryStudio = lazy(() => import('./pages/StoryStudio'))
const CreateStory = lazy(() => import('./pages/CreateStory'))
const MyStories = lazy(() => import('./pages/MyStories'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const Profile = lazy(() => import('./pages/Profile'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const Achievements = lazy(() => import('./pages/Achievements'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const Contests = lazy(() => import('./pages/Contests'))
const ContestDetail = lazy(() => import('./pages/ContestDetail'))
const NotFound = lazy(() => import('./pages/NotFound'))

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AudioProvider>
          <BrowserRouter>
            <NotificationsProvider>
            <AchievementsProvider>
            <ToastProvider>
              <CurtainReveal />
              <InkCursor />
              {/* First stop in the tab order. Without it a keyboard reader walks
                  the entire navbar again on every route change before reaching
                  the story they came for. */}
              <a className="ct-skip-link" href="#main">Skip to content</a>
              <Navbar />
              <RouteMusic />
              {/* The one landmark the app was missing. tabIndex={-1} lets the
                  skip link move focus here, not just scroll to it. */}
              <main id="main" tabIndex={-1}>
              {/* The same loader the app already uses while the free-tier backend
                  wakes up — a chunk arriving late should look like the rest of
                  the app waiting, not like a different kind of pause. */}
              <Suspense fallback={<ConnectingLoader message="Turning the page" />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/stories" element={<StoryList />} />
                  <Route path="/featured" element={<Featured />} />
                  <Route path="/games" element={<StoryGames />} />
                  <Route path="/story/:id" element={<StoryReader />} />
                  <Route path="/story/:id/edit" element={<StoryEditor />} />
                  <Route path="/story/:id/studio" element={<StoryStudio />} />
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
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              </main>
            </ToastProvider>
            </AchievementsProvider>
            </NotificationsProvider>
          </BrowserRouter>
        </AudioProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
