import React, { useState } from 'react';
import { Film, Heart, MessageCircle, Flame } from 'lucide-react';
import { Post } from '../types';
import { useAuth } from '../context/AuthContext';

interface ExploreViewProps {
  posts: Post[];
  onSelectPost: (post: Post) => void;
  onNavigateHashtag: (tag: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  posts,
  onSelectPost,
}) => {
  const { darkMode } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'Em Alta', icon: Flame },
    { id: 'fotografia', label: '#fotografia', tag: 'fotografia' },
    { id: 'design', label: '#design', tag: 'design' },
    { id: 'lifestyle', label: '#lifestyle', tag: 'lifestyle' },
    { id: 'reels', label: 'Vídeos', icon: Film },
    { id: 'viagem', label: '#viagem', tag: 'viagem' },
    { id: 'arte', label: '#arte', tag: 'arte' },
  ];

  const filteredPosts = posts.filter(p => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'reels') return p.media.some(m => m.type === 'video');
    return p.hashtags.includes(activeCategory);
  });

  return (
    <div className="space-y-4 pb-20 animate-bento-fade">
      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-white text-black shadow-md scale-102'
                  : 'bg-[#13131D] text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bento Grid */}
      {filteredPosts.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-64 text-center p-6 niuniu-card"
        >
          <p className="font-heading text-sm font-extrabold text-white">
            Nenhuma publicação nesta categoria
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Seja a primeira pessoa a criar um post com essa hashtag!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-3.5">
          {filteredPosts.map((post, idx) => {
            const firstMedia = post.media[0];
            const isVideo = firstMedia?.type === 'video';
            const isFeatured = idx % 5 === 0;

            return (
              <div
                key={post.id}
                onClick={() => onSelectPost(post)}
                style={{ animationDelay: `${idx * 40}ms` }}
                className={`relative group rounded-[26px] overflow-hidden cursor-pointer bg-black shadow-lg hover:shadow-xl transition-all duration-200 border border-white/10 hover:border-white/20 animate-bento-fade ${
                  isFeatured ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'
                }`}
              >
                {isVideo ? (
                  <video
                    src={firstMedia.url}
                    muted
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <img
                    src={firstMedia?.thumbnail || firstMedia?.url}
                    alt={post.caption}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                {/* Video Badge */}
                {isVideo && (
                  <div className="absolute top-3 right-3 w-7 h-7 rounded-xl bg-black/60 backdrop-blur-md text-white flex items-center justify-center shadow-md">
                    <Film className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Hover Overlay with Stats */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3.5 text-white">
                  <div className="flex items-center gap-2 mb-1.5">
                    <img
                      src={post.user.avatar}
                      alt={post.user.displayName}
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-full object-cover border border-white/80"
                    />
                    <span className="text-xs font-bold font-heading truncate">
                      {post.user.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3.5 text-xs font-semibold">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 fill-white text-white" />
                      <span>{post.likesCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4 fill-white text-white" />
                      <span>{post.commentsCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
