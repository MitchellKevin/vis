import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Julius from './pages/Julius.jsx';
import WorldMap from './components/world-map/index.jsx';
import Mitchell from './pages/Mitchell.jsx';
import Nienke from './pages/Nienke.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/julius" element={<Julius />} />
        <Route path="/world-map" element={<WorldMap />} />
        <Route path="/mitchell" element={<Mitchell />} />
        <Route path="/nienke" element={<Nienke />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
