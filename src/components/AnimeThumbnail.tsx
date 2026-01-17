type AnimeThumbnailProps = {
    id: string;
    name: string;
    imgUrl: string;
    className?: string;
    status?: string;
};

export default function AnimeThumbnail({
    id,
    name,
    imgUrl,
    status,
    className,
    ...props
}: AnimeThumbnailProps) {
    return (
        <a
            className={`group flex flex-col ${className}`}
            href={`/anime/${id}`}
            {...props}
        >
            <div className="h-full relative cursor-pointer group-hover:scale-110 duration-300 group-hover:z-100">
                <div
                    className="rounded-lg w-full aspect-10/16 bg-cover bg-center"
                    style={{
                        backgroundImage: `url(${imgUrl})`,
                    }}
                ></div>
                <p className="line-clamp-1 mt-3 group-hover:line-clamp-none group-hover:absolute backdrop-blur-[2px] text-text-muted  text-sm duration-300  group-hover:text-primary">
                    {name}
                </p>
                {status &&
                    <p className="text-text-secondary group-hover:hidden self-end duration-100 text-xs mt-1">
                        {status}
                    </p>}
            </div>
        </a>
    );
}
