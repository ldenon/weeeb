import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleUserRound, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";

function AuthButton() {
  const {user} = useAuth();

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      return await pb
        .collection("users")
        .authWithOAuth2({ provider: "google" })
    },
    onSuccess: (authData) => {
      queryClient.setQueryData(['currentUser'], authData?.record);
      queryClient.invalidateQueries();
    },
    onError: (err) => console.error(err)
  })

  
  return (
    <button
      type="button"
      className="text-text  p-3 aspect-square bg-bg-light rounded-full m-h-16 self-start cursor-pointer"
      onClick={() => {
        if (user) {
          pb.authStore.clear();
          queryClient.clear();
          return;
        }
        mutation.mutate()
      }}
    >
      {user ? <LogOut /> : <CircleUserRound />}
    </button>
  );
}

export default AuthButton;
