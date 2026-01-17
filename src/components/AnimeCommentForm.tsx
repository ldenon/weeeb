import { useForm } from "@tanstack/react-form-start";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";

interface AnimeCommentFormProps {
  animeId: string;
  commentId: string;
  review: string;
}

interface FormData {
  review: string;
}

interface CommentData {
  author: string;
  anime: string;
  content?: string;
}

function AnimeCommentForm({ animeId, commentId, review }: AnimeCommentFormProps) {

  const { user } = useAuth();

  const defaultData: FormData = { review };
  const form = useForm({
    defaultValues: defaultData,

  })



  const createCommentMutation = useMutation({
    mutationFn: async (data: CommentData) => {
      return await pb.collection("comments").create(data);
    }
  });

  const updateCommentMutation = useMutation({
    mutationFn: async (review: string) => {
      return await pb.collection("comments").update(commentId, {
        content: review
      });
    }
  });

  return (

    <form.Field
      name="review"
      listeners={{
        onChangeDebounceMs: 500, // 500ms debounce
        onChange: ({ value }) => {
          console.log(`new review: ${value}`)
          if (commentId) {
            updateCommentMutation.mutate(value);
          } else {
            createCommentMutation.mutate({ author: user?.id ?? "", anime: animeId, content: value ?? "" });
          }
        }
      }}
      children={(field) => (
        <textarea
          name="synopsis"
          value={field.state.value}
          placeholder="Donne ton avis désastreux"
          className="outline-none w-full rounded-lg bg-bg-light text-text p-6 h-56 resize-none"
          onChange={(e) => field.handleChange(e.target.value)}
        ></textarea>
      )
      }
    />
  )
}

export default AnimeCommentForm;
