import React from 'react';

export function ModalSkeleton() {
    return (
        <div className="w-full h-full flex flex-col animate-pulse bg-surface overflow-y-auto custom-scrollbar">
            {/* Hero Banner Skeleton */}
            <div className="relative h-[385px] lg:h-[500px] w-full bg-gray-300 dark:bg-zinc-900 shrink-0">
                <div className="absolute bottom-0 left-0 p-8 lg:p-12 w-full space-y-6">
                    {/* Title */}
                    <div className="h-10 lg:h-16 bg-gray-400/50 dark:bg-zinc-950 rounded-lg w-2/3 lg:w-1/2" />

                    {/* Buttons */}
                    <div className="flex gap-4">
                        <div className="h-12 w-32 bg-gray-400/50 dark:bg-zinc-950 rounded-lg" />
                        <div className="h-12 w-12 bg-gray-400/50 dark:bg-zinc-950 rounded-lg" />
                        <div className="h-12 w-12 bg-gray-400/50 dark:bg-zinc-950 rounded-lg" />
                        <div className="h-12 w-12 bg-gray-400/50 dark:bg-zinc-950 rounded-lg" />
                    </div>

                    {/* Meta Tags */}
                    <div className="flex gap-3">
                        <div className="h-6 w-16 bg-gray-400/50 dark:bg-zinc-950 rounded" />
                        <div className="h-6 w-12 bg-gray-400/50 dark:bg-zinc-950 rounded" />
                        <div className="h-6 w-24 bg-gray-400/50 dark:bg-zinc-950 rounded" />
                    </div>
                </div>
            </div>

            {/* Content Grid Skeleton */}
            <div className="p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-3 gap-12 flex-1 overflow-hidden">
                <div className="lg:col-span-2 flex flex-col gap-8">
                    {/* Synopsis Lines */}
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 dark:bg-zinc-900 rounded w-1/4 mb-4" />
                        <div className="h-3 bg-gray-200 dark:bg-zinc-900 rounded w-full" />
                        <div className="h-3 bg-gray-200 dark:bg-zinc-900 rounded w-full" />
                        <div className="h-3 bg-gray-200 dark:bg-zinc-900 rounded w-5/6" />
                        <div className="h-3 bg-gray-200 dark:bg-zinc-900 rounded w-4/5" />
                    </div>

                    {/* Seasons & Episodes Structure */}
                    <div className="mt-4 space-y-4">
                        <div className="h-6 w-32 bg-gray-200 dark:bg-zinc-900 rounded" /> {/* "Seasons" Header */}
                        <SeasonListSkeleton />

                        <div className="h-6 w-48 bg-gray-200 dark:bg-zinc-900 rounded mt-6" /> {/* "Episodes" Header */}
                        <div className="border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                            <EpisodeListSkeleton />
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                    {/* Genres */}
                    <div>
                        <div className="h-4 bg-gray-200 dark:bg-zinc-900 rounded w-1/3 mb-3" />
                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-zinc-900 rounded-md" />)}
                        </div>
                    </div>

                    {/* Cast */}
                    <div>
                        <div className="h-4 bg-gray-200 dark:bg-zinc-900 rounded w-1/3 mb-3" />
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-zinc-950 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-24 bg-gray-200 dark:bg-zinc-900 rounded" />
                                        <div className="h-2 w-16 bg-gray-200 dark:bg-zinc-900 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* Recommendations Skeleton */}
            <div className="px-8 lg:px-12 pb-12">
                <div className="h-5 w-40 bg-gray-200 dark:bg-zinc-900 rounded mb-6" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="aspect-[2/3] bg-gray-200 dark:bg-zinc-900 rounded-lg" />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function SeasonListSkeleton() {
    return (
        <div className="flex gap-4 overflow-hidden pb-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex-shrink-0 w-[160px] md:w-[200px] flex flex-col gap-2 animate-pulse">
                    <div className="w-full aspect-[2/3] bg-gray-300 dark:bg-zinc-900 rounded-lg" />
                    <div className="h-3 w-3/4 bg-gray-200 dark:bg-zinc-900 rounded" />
                </div>
            ))}
        </div>
    );
}

export function EpisodeListSkeleton() {
    return (
        <div className="flex flex-col animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4 p-4 items-center border-b border-gray-200 dark:border-zinc-800 last:border-0">
                    <div className="w-8 h-4 bg-gray-200 dark:bg-zinc-900 rounded shrink-0" /> {/* Number */}
                    <div className="w-32 aspect-video bg-gray-300 dark:bg-zinc-950 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/2 bg-gray-200 dark:bg-zinc-900 rounded" />
                        <div className="h-3 w-1/4 bg-gray-200 dark:bg-zinc-900 rounded" />
                    </div>
                    <div className="w-8 h-8 bg-gray-200 dark:bg-zinc-900 rounded-full shrink-0" /> {/* Button */}
                </div>
            ))}
        </div>
    );
}