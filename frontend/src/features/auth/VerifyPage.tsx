import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function VerifyPage() {
  const [params] = useSearchParams();
  const { verifyMagicLink } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "error">("verifying");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const token = params.get("token");
    if (!token) {
      setStatus("error");
      return;
    }

    verifyMagicLink(token).then((ok) => {
      if (ok) {
        navigate("/", { replace: true });
      } else {
        setStatus("error");
      }
    });
  }, [params, verifyMagicLink, navigate]);

  if (status === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Verifiserer innloggingslenke…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-center space-y-3 p-4">
      <div>
        <p className="text-2xl mb-2">⚠️</p>
        <p className="font-medium">Ugyldig eller utløpt lenke</p>
        <p className="text-sm text-muted-foreground mt-1">
          Lenken kan ha utløpt. Prøv å logge inn på nytt.
        </p>
        <a href="/login" className="text-sm text-primary underline mt-3 block">
          Gå til innlogging
        </a>
      </div>
    </div>
  );
}
