import { ChevronRight } from 'lucide-react';
import MediaCard from './MediaCard';

export default function MediaGrid({ title, items, onPlay }) {
    return (
        <div className="px-8 lg:px-12 py-4 max-w-[1600px] mx-auto">
            {/* Page Header */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-textMain flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                        {title} <ChevronRight className="w-5 h-5" />
                    </h2>
                </div>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
                {items.map((item) => (
                    <MediaCard
                        key={item.id}
                        item={item}
                        onClick={() => onPlay(item)}
                    />
                ))}
            </div>
        </div>
    );
}
