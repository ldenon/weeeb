export const statusTranslations = {
	completed: {
		fr: "Terminé",
	},
	ongoing: {
		fr: "En cours",
	},
	dropped: {
		fr: "Inachevé",
	},
	planned: {
		fr: "Prévu",
	},
};

/** Accorde un mot en fonction du nombre, ex : plural(1, "duel") -> "duel". */
export const plural = (count: number, singular: string, suffix = "s") =>
	count > 1 ? `${singular}${suffix}` : singular;
