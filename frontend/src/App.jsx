import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import StoryList from './pages/StoryList'
import StoryReader from './pages/StoryReader'
import CreateStory from './pages/CreateStory'
import Navbar from './components/Navbar'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stories" element={<StoryList />} />
        <Route path="/story/:id" element={<StoryReader />} />
        <Route path="/create" element={<CreateStory />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
