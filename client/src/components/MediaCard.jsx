const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export default function MediaCard({ item, onClick }) {
    const title = item.title || item.name;

    // Handle different data sources (TMDB vs HiAnime)
    const imageUrl = item.poster || (item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : '');

    let date = '????';
    if (item.release_date || item.first_air_date) {
        date = (item.release_date || item.first_air_date).split('-')[0];
    } else if (item.aired) {
        const parts = item.aired.split(',');
        date = parts.length > 1 ? parts[1].trim() : item.aired;
    }

    const type = item.type || (item.media_type === 'tv' ? 'TV' : 'Movie');
    const rating = item.vote_average ? item.vote_average.toFixed(1) : (item.rank ? `#${item.rank}` : null);

    return (
        <div
            onClick={onClick}
            className="group relative cursor-pointer"
        >
            <div className="poster-card relative rounded-lg overflow-hidden bg-surfaceHighlight transition-all duration-300 border-1 !border-transparent group-hover:!border-primary group-hover:shadow-[0_0_20px_rgba(229,9,20,0.5)] aspect-[2/3]">
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover transition-all duration-500"
                    loading="lazy"
                />
                {rating && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white border border-white/10">
                        {rating}
                    </div>
                )}
                {item.episodes && (
                    <div className="absolute bottom-2 left-2 flex gap-1">
                        {item.episodes.sub > 0 && (
                            <div className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white border border-white/10 flex items-center gap-1">
                                <span>CC</span> {item.episodes.sub}
                            </div>
                        )}
                        {item.episodes.dub > 0 && (
                            <div className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white border border-white/10 flex items-center gap-1">
                                <span>MIC</span> {item.episodes.dub}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="mt-3">
                <h3 className="text-textMain font-bold text-sm leading-tight line-clamp-1 group-hover:!text-[#E50914] transition-colors">
                    {title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-textMuted">
                    <span className="font-bold tracking-wider">{type}</span>
                    <span>•</span>
                    <span>{date}</span>
                </div>
            </div>
        </div>
    );
}
