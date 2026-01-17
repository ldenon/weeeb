import { Link } from "@tanstack/react-router";

export default function AnimeComment({ ...props }) {
    const author = props.author;
    const text = props.text;

    return <div className="my-8">
        <Link to="/" className="text-text-muted text-lg">{author}</Link>
        <p className="text-text-secondary text-justify mt-2">
            {text}
        </p>
    </div >

}