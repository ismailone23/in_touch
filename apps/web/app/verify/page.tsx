"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/api";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Verifying your account...");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing.");
        return;
      }

      try {
        const res = await fetch(
          `${getApiBaseUrl()}/auth/verify?token=${encodeURIComponent(token)}`,
          { method: "POST" },
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setStatus("error");
          setMessage(data.error || "Verification failed. Token may be expired.");
          return;
        }

        setStatus("success");
        setMessage("Your email is verified. You can now sign in.");
      } catch {
        setStatus("error");
        setMessage("Cannot reach server. Please try again in a moment.");
      }
    };

    void verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Email Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p
            className={`text-center ${
              status === "success"
                ? "text-green-700"
                : status === "error"
                  ? "text-red-700"
                  : "text-muted-foreground"
            }`}
          >
            {message}
          </p>

          <div className="flex justify-center gap-3">
            <Link href="/login">
              <Button>Go to Login</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">Register Again</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-4">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
