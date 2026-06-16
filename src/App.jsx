import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Julius from './pages/Julius.jsx';
import Mitchell from './pages/Mitchell.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/julius" element={<Julius />} />
        <Route path="/mitchell" element={<Mitchell />} />
      </Routes>
    </BrowserRouter>
  );
}