import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth/AuthContext";
import { Layout } from "@/components/shared/Layout";
import { LoginPage } from "@/features/auth/LoginPage";
import { VerifyPage } from "@/features/auth/VerifyPage";
import { RoadReportPage } from "@/features/road-reports/RoadReportPage";
import { NewsPage } from "@/features/news/NewsPage";
import { WebcamsPage } from "@/features/webcams/WebcamsPage";
import { LinksPage } from "@/features/links/LinksPage";
import { AdminPage } from "@/features/admin/AdminPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/verify" element={<VerifyPage />} />
          <Route path="/auth/accept" element={<VerifyPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<RoadReportPage />} />
            <Route path="/nyheter" element={<NewsPage />} />
            <Route path="/webkameraer" element={<WebcamsPage />} />
            <Route path="/lenker" element={<LinksPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Routes>
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
