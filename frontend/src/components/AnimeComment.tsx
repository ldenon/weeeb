interface AnimeCommentProps {
	author: string;
	text: string;
}

export default function AnimeComment({ author, text }: AnimeCommentProps) {
	return (
		<div className="my-8">
			<span className="text-text-muted text-lg">{author}</span>
			<p className="text-text-secondary text-justify mt-2">{text}</p>
		</div>
	);
}
