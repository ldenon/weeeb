import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { pb } from "@/lib/pocketbase";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  beforeLoad: () => {
    if (pb.authStore.isValid) {
      throw redirect({ to: "/" });
    }
  },
});

function RouteComponent() {
  const [error, setError] = useState("");
  const [isOauthLoading, setIsOauthLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setIsOauthLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      await pb.collection("users").authWithOAuth2({
        provider: "google",
        redirectUrl,
      });
      navigate({ to: "/" });
    } catch (_) {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setIsOauthLoading(false);
    }
  };

  return (
    <div className="h-full flex justify-center items-center text-primary gap-4">
      <button
        type="button"
        className="bg-bg-light text-white px-4 py-2 rounded cursor-pointer hover:border border-border"
        onClick={handleGoogleSignIn}
        disabled={isOauthLoading}
      >
        Se connecter
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
