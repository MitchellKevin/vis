import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Julius from './pages/Julius.jsx';
import Joost from './pages/Joost.jsx';
import Mitchell from './pages/Mitchell.jsx';
import Nienke from './pages/Nienke.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/julius" element={<Julius />} />
        <Route path="/joost" element={<Joost />} />
        <Route path="/mitchell" element={<Mitchell />} />
        <Route path="/nienke" element={<Nienke />} />
      </Routes>
    </BrowserRouter>
  );
}