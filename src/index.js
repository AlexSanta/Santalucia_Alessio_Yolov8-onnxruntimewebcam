import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import App from './App';
import Logs from './Logs';

const currentTime = new Date();
currentTime.setHours(currentTime.getHours() + 2);
const sessionTimeStamp = currentTime.toISOString();

ReactDOM.createRoot(document.getElementById('root')).render(
  <Router>
    <Routes>
      <Route path="/yolov8-onnxruntime-web" element={<App sessionTimeStamp={sessionTimeStamp} />} />
      <Route path="/logs/:sessionTimeStamp" element={<Logs />} />
    </Routes>
  </Router>
);
