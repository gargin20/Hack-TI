import { BrowserRouter, Route, Routes } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Landing Page Works</div>} />
        <Route path="/login" element={<div>Login Page Works</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page Works</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

