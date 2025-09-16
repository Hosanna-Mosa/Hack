import { ParentPortalApp } from "../components/ParentPortalApp";
import { SignupForm } from "@/components/auth/SignupForm";
import { Routes, Route } from "react-router-dom";

const Index = () => {
  return (
    <Routes>
      <Route path="/" element={<ParentPortalApp />} />
      <Route path="/signup" element={<div className="min-h-screen flex items-center justify-center p-4"><div className="max-w-md w-full"><SignupForm onSuccess={() => {}} /></div></div>} />
    </Routes>
  );
};

export default Index;
