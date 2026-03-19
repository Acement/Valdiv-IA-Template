import React from "react";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import Home from "./pages/home/Home";
import Chat from "./pages/chat/Chat";
import User from "./pages/user/User";
import Register from "./pages/register/Register";
import Login from "./pages/login/Login";
import Us from "./pages/Us/Us";
import ProtectedRoute from "./auth/ProtectedRoute";
import Admin from "./pages/Admin/admin";
import Admin_page from "./pages/Admin_page/admin_page";

const App: React.FC = () => {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/us" element={<Us />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin_page" element={<Admin_page />} />



      {/* Rutas protegidas */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />

      <Route
        path="/user"
        element={
          <ProtectedRoute>
            <User />
          </ProtectedRoute>
        }
      />

    </Routes> 
  );
};

export default App;
