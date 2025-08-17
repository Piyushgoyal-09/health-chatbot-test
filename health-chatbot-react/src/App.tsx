import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ChatPage from "./components/ChatPage";
import Dashboard from "./components/Dashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
