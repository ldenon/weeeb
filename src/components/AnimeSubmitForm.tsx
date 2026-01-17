import { useForm } from "@tanstack/react-form-start"
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { pb } from "@/lib/pocketbase";

interface GenreTagProps {
    name: string;
    selected: boolean;
    onSelect: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    onDeselect: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

interface FormData {
    name: string;
    img: string;
    synopsis: string;
    genres: Array<string>;
}

function GenreTag({
    selected,
    name,
    onSelect,
    onDeselect,
}: GenreTagProps) {
    const classActive =
        "bg-bg-light text-text-muted px-4 py-2 rounded-full cursor-pointer border-t-highlight bg-gradient-hover border-border-muted";
    const classNormal =
        "bg-bg-light text-text-secondary px-4 py-2 rounded-full cursor-pointer";

    return (
        <button
            type="button"
            className={selected ? classActive : classNormal}
            onClick={(e) => {
                if (selected) {
                    return onDeselect(e);
                }
                return onSelect(e);
            }}
        >
            {name}
        </button>
    );
}


export default function AnimeSubmitForm() {
    const { data: genres } = useQuery({
        queryKey: ["genres"],
        queryFn: () => pb.collection("genres").getFullList()
    })

    const formMutation = useMutation({
        mutationFn: async (data: FormData) => {
            return await pb.collection("animes").create(data);
        },
        onError: (err) => console.error(err)
    })

    const defaultValues: FormData = {
        name: "",
        img: "",
        synopsis: "",
        genres: []
    }

    const formSchema = z.object({
        name: z.string().min(2),
        img: z.string().url(),
        synopsis: z.string().min(2),
        genres: z.array(z.string()).min(1)
    });


    const form = useForm({
        defaultValues: defaultValues,
        onSubmit: async ({ value }) => {
            formMutation.mutate(value);
            form.reset();
        },
        validators: {
            onSubmit: formSchema
        }
    })

    return (
        <form onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
        }} className="grid gap-8 mt-8">
            <form.Field name="name" children={(field) => (
                <input
                    type="text"
                    required
                    placeholder="Nom de l'anime"
                    className="outline-none w-full rounded-lg bg-bg-light text-text-muted px-6 py-3"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                />
            )} />

            <form.Field
                name="img"
                children={(field) => (
                    <input
                        type="text"
                        required
                        placeholder="url image"
                        className="outline-none w-full rounded-lg bg-bg-light text-text-muted px-6 py-3"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                    />
                )}
            />

            <form.Field
                name="genres"
                mode="array"
                children={(field) => {
                    return <div className="flex  flex-wrap gap-4">
                        {genres?.map((g) => {
                            return (
                                <GenreTag
                                    key={g.name}
                                    selected={field.state.value.includes(g.id)}
                                    name={g.name}
                                    onSelect={() => field.pushValue(g.id)}
                                    onDeselect={() => field.removeValue(field.state.value.indexOf(g.id))}
                                />
                            );
                        })}
                    </div>
                }}
            />




            <form.Field
                name="synopsis"
                children={(field) => (
                    <textarea
                        required
                        placeholder="Synopsis"
                        className="outline-none w-full rounded-lg bg-bg-light text-text-muted p-6 h-56"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                    ></textarea>
                )}
            />

            <form.Subscribe
                selector={(formState) => [formState.canSubmit, formState.isSubmitting]}
            >
                {([canSubmit]) => (
                    <button
                        type="submit"
                        className="outline-none border-0 cursor-pointer text-white font-bold rounded-md bg-blue-400 py-3"
                        disabled={!canSubmit}
                    >
                        Ajouter
                    </button>
                )}
            </form.Subscribe>

        </form>
    );
}
