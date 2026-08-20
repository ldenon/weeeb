import { useForm } from "@tanstack/react-form-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import useGenres from "@/hooks/useGenres";
import { pb } from "@/lib/pocketbase";
import type { AnimeRecord } from "@/types";

interface GenreTagProps {
	name: string;
	selected: boolean;
	onToggle: () => void;
}

interface FormData {
	name: string;
	img: string;
	synopsis: string;
	genres: Array<string>;
}

const formSchema = z.object({
	name: z.string().min(2, "Le nom doit faire au moins 2 caractères."),
	img: z.url("L'image doit être une URL valide."),
	synopsis: z.string().min(2, "Le synopsis doit faire au moins 2 caractères."),
	genres: z.array(z.string()).min(1, "Choisis au moins un genre."),
});

function GenreTag({ selected, name, onToggle }: GenreTagProps) {
	const className = selected
		? "bg-bg-light text-text-muted px-4 py-2 rounded-full cursor-pointer border-t-highlight bg-gradient-hover border-border-muted"
		: "bg-bg-light text-text-secondary px-4 py-2 rounded-full cursor-pointer";

	return (
		<button
			type="button"
			aria-pressed={selected}
			className={className}
			onClick={onToggle}
		>
			{name}
		</button>
	);
}

export default function AnimeSubmitForm() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: genres } = useGenres();

	const createAnime = useMutation({
		mutationFn: (data: FormData) =>
			pb.collection("animes").create<AnimeRecord>(data),
		onSuccess: (anime) => {
			queryClient.invalidateQueries({ queryKey: ["animes"] });
			navigate({ to: "/anime/$animeId", params: { animeId: anime.id } });
		},
	});

	const form = useForm({
		defaultValues: {
			name: "",
			img: "",
			synopsis: "",
			genres: [],
		} as FormData,
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			await createAnime.mutateAsync(value);
			form.reset();
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="grid gap-8 mt-8"
		>
			<form.Field name="name">
				{(field) => (
					<div>
						<input
							type="text"
							placeholder="Nom de l'anime"
							className="outline-none w-full rounded-lg bg-bg-light text-text-muted px-6 py-3"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
						<FieldError messages={field.state.meta.errors} />
					</div>
				)}
			</form.Field>

			<form.Field name="img">
				{(field) => (
					<div>
						<input
							type="text"
							placeholder="url image"
							className="outline-none w-full rounded-lg bg-bg-light text-text-muted px-6 py-3"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
						<FieldError messages={field.state.meta.errors} />
					</div>
				)}
			</form.Field>

			<form.Field name="genres" mode="array">
				{(field) => (
					<div>
						<div className="flex flex-wrap gap-4">
							{genres?.map((genre) => {
								const index = field.state.value.indexOf(genre.id);

								return (
									<GenreTag
										key={genre.id}
										name={genre.name}
										selected={index !== -1}
										onToggle={() =>
											index === -1
												? field.pushValue(genre.id)
												: field.removeValue(index)
										}
									/>
								);
							})}
						</div>
						<FieldError messages={field.state.meta.errors} />
					</div>
				)}
			</form.Field>

			<form.Field name="synopsis">
				{(field) => (
					<div>
						<textarea
							placeholder="Synopsis"
							className="outline-none w-full rounded-lg bg-bg-light text-text-muted p-6 h-56"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
						<FieldError messages={field.state.meta.errors} />
					</div>
				)}
			</form.Field>

			{/* The unique index on `name` rejects duplicates: the error used to be
			    logged to the console only, so the user saw nothing. */}
			{createAnime.isError && (
				<p className="text-danger text-sm">
					L'anime n'a pas pu être ajouté. Il existe peut-être déjà.
				</p>
			)}

			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => (
					<button
						type="submit"
						className="outline-none border-0 cursor-pointer text-white font-bold rounded-md bg-blue-400 py-3 disabled:opacity-60"
						disabled={isSubmitting}
					>
						{isSubmitting ? "Ajout en cours…" : "Ajouter"}
					</button>
				)}
			</form.Subscribe>
		</form>
	);
}

function FieldError({ messages }: { messages: Array<unknown> }) {
	if (messages.length === 0) return null;

	const text = messages
		.map((m) =>
			typeof m === "string" ? m : ((m as { message?: string })?.message ?? ""),
		)
		.filter(Boolean)
		.join(" ");

	if (!text) return null;

	return <p className="text-danger text-xs mt-2">{text}</p>;
}
