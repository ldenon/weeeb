import { useForm } from "@tanstack/react-form-start";
import useCreateComment from "@/hooks/useCreateComment";
import useUpdateComment from "@/hooks/useUpdateComment";
import { pb } from "@/lib/pocketbase";

interface AnimeCommentFormProps {
  animeId: string;
  commentId: string;
  review: string;
}

interface FormData {
  review: string;
}

function AnimeCommentForm({
  animeId,
  commentId,
  review,
}: AnimeCommentFormProps) {
  const user = pb.authStore.record;

  const defaultData: FormData = { review };
  const form = useForm({
    defaultValues: defaultData,
  });

  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment(commentId);

  return (
    <form.Field
      name="review"
      listeners={{
        onChangeDebounceMs: 500, // 500ms debounce
        onChange: ({ value }) => {
          if (commentId) {
            updateCommentMutation.mutate(value);
          } else {
            createCommentMutation.mutate({
              author: user?.id ?? "",
              anime: animeId,
              content: value ?? "",
            });
          }
        },
      }}
      children={(field) => (
        <textarea
          name="synopsis"
          value={field.state.value}
          placeholder="Donne ton avis désastreux"
          className="outline-none w-full rounded-lg bg-bg-light text-text p-6 h-56 resize-none"
          onChange={(e) => field.handleChange(e.target.value)}
        ></textarea>
      )}
    />
  );
}

export default AnimeCommentForm;
