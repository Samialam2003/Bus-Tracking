import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HostDashboard from './Components/HostDashboard';
import DriverRegister from './Components/DriverRegister';
import DriverLogin from './Components/DriverLogin';
import DriverDashboard from './Components/DriverDashboard'; // ✅ use your existing dashboard
import StudentRegister from './Components/StudentRegister';
import StudentLogin from './Components/StudentLogin';
import StudentDashboard from './Components/StudentDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Existing routes */}
        <Route path="/" element={<HostDashboard />} />
        <Route path="/host" element={<HostDashboard />} />
        <Route path="/driver" element={<DriverRegister />} />
        <Route path="/driver/login" element={<DriverLogin />} />

        {/* New protected dashboard route */}
        <Route path="/driver/dashboard" element={<DriverDashboard />} />
        {/* Student routes */}
        <Route path="/student" element={<StudentRegister />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
