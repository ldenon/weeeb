import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import Sidebar from "@/components/Sidebar";
import { pb } from "@/lib/pocketbase";

export const Route = createFileRoute("/_app")({
  component: RouteComponent,
  beforeLoad: async () => {
    if (!pb.authStore.isValid) {
      throw redirect({ to: "/login" });
    }

    const hasRefreshed = sessionStorage.getItem("pb_auth_refreshed") === "1";

    if (!hasRefreshed) {
      try {
        await pb.collection("users").authRefresh();
        sessionStorage.setItem("pb_auth_refreshed", "1");
      } catch {
        pb.authStore.clear();
        sessionStorage.removeItem("pb_auth_refreshed");
        throw redirect({ to: "/login" });
      }
    }
    return null;
  },
  ssr: false,
});

function RouteComponent() {
  return (
    <main className="md:grid grid-cols-5 min-h-screen pt-6 pb-16 color-primary">
      <Sidebar />
      <div className="col-span-3 py-6 px-8 md:px-0">
        <Outlet />
      </div>
      <div></div>
    </main>
  );
}
