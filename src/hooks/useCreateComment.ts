import { useMutation } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";

interface CommentData {
  author: string;
  anime: string;
  content?: string;
}

const useCreateComment = () =>
  useMutation({
    mutationFn: async (data: CommentData) => {
      return await pb.collection("comments").create(data);
    },
  });

export default useCreateComment;
