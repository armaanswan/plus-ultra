const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export default function MediaCard({ item, onClick }) {
    const title = item.title || item.name;
    const date = (item.release_date || item.first_air_date || '????').split('-')[0];
    const isTV = item.media_type === 'tv';

    return (
        <div
            onClick={onClick}
            className="group relative cursor-pointer"
        >
            <div className="poster-card relative rounded-lg overflow-hidden bg-surfaceHighlight transition-all duration-300 border-1 !border-transparent group-hover:!border-primary group-hover:shadow-[0_0_20px_rgba(229,9,20,0.5)] aspect-[2/3]">
                <img
                    src={`${TMDB_IMAGE_BASE}${item.poster_path}`}
                    alt={title}
                    className="w-full h-full object-cover transition-all duration-500"
                    loading="lazy"
                />
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white border border-white/10">
                    {item.vote_average?.toFixed(1)}
                </div>
            </div>
            <div className="mt-3">
                <h3 className="text-textMain font-bold text-sm leading-tight line-clamp-1 group-hover:!text-[#E50914] transition-colors">
                    {title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-textMuted">
                    <span className="font-bold tracking-wider">{isTV ? 'TV' : 'Movie'}</span>
                    <span>•</span>
                    <span>{date}</span>
                </div>
            </div>
        </div>
    );
}
