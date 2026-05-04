import { useMutation } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";

const useUpdateComment = (commentId: string) =>
  useMutation({
    mutationFn: async (review: string) => {
      return await pb.collection("comments").update(commentId, {
        content: review,
      });
    },
  });

export default useUpdateComment;
