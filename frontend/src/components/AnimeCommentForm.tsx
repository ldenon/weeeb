import { useForm } from "@tanstack/react-form-start";
import useSaveComment from "@/hooks/useSaveComment";

interface AnimeCommentFormProps {
	animeId: string;
	review: string;
}

function AnimeCommentForm({ animeId, review }: AnimeCommentFormProps) {
	const saveComment = useSaveComment(animeId);

	const form = useForm({
		defaultValues: { review },
	});

	return (
		<div>
			<form.Field
				name="review"
				listeners={{
					onChangeDebounceMs: 500,
					onChange: ({ value }) => saveComment.mutate(value ?? ""),
				}}
			>
				{(field) => (
					<textarea
						name="review"
						value={field.state.value}
						placeholder="Donne ton avis désastreux"
						className="outline-none w-full rounded-lg bg-bg-light text-text p-6 h-56 resize-none"
						onChange={(e) => field.handleChange(e.target.value)}
					/>
				)}
			</form.Field>

			<p className="text-xs text-text-secondary mt-2 h-4">
				{saveComment.isPending && "Enregistrement…"}
				{saveComment.isError &&
					`Ton avis n'a pas pu être enregistré : ${saveComment.error.message}`}
				{saveComment.isSuccess && !saveComment.isPending && "Avis enregistré"}
			</p>
		</div>
	);
}

export default AnimeCommentForm;
