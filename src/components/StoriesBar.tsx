import React from 'react';
import { Plus } from 'lucide-react';
import { StoryGroup } from '../types';
import { useAuth } from '../context/AuthContext';

interface StoriesBarProps {
  storyGroups: StoryGroup[];
  onOpenStory: (groupIndex: number) => void;
  onAddStory: () => void;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
  storyGroups,
  onOpenStory,
  onAddStory,
}) => {
  const { user } = useAuth();

  // Check if current user has an active story in the list
  const myGroupIndex = storyGroups.findIndex(g => g.user.id === user?.id);
  const myGroup = myGroupIndex !== -1 ? storyGroups[myGroupIndex] : null;

  return (
    <div className="w-full py-4 px-4 sm:px-5 niuniu-card mb-4 transition-colors">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-white font-heading">
            Stories
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>
        <button
          onClick={onAddStory}
          className="text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          + Adicionar Story
        </button>
      </div>

      <div className="flex items-center gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar py-1">
        {/* My Story Button */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="relative">
            <button
              id="btn-story-my-avatar"
              onClick={() => {
                if (myGroup) {
                  onOpenStory(myGroupIndex);
                } else {
                  onAddStory();
                }
              }}
              className={`w-14 h-14 sm:w-15 sm:h-15 rounded-full p-0.5 relative cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
                myGroup
                  ? 'bg-gradient-to-tr from-amber-400 via-[#10B981] to-purple-500 ring-2 ring-white/20'
                  : 'border-2 border-dashed border-white/20'
              }`}
            >
              <img
                src={
                  user?.avatar ||
                  'https://api.dicebear.com/7.x/lorelei/svg?seed=Guest&backgroundColor=ffd5dc'
                }
                alt="Meu Story"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-full bg-zinc-800"
              />
            </button>
            <button
              id="btn-story-add-badge"
              onClick={onAddStory}
              title="Adicionar Story"
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white text-black flex items-center justify-center border-2 border-[#12121B] shadow-md hover:scale-110 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
          <span className="text-[11px] font-semibold text-zinc-300 max-w-[65px] truncate text-center">
            Seu Story
          </span>
        </div>

        {/* Other Users' Stories */}
        {storyGroups
          .filter(g => g.user.id !== user?.id)
          .map((group) => {
            const originalIndex = storyGroups.indexOf(group);
            return (
              <div
                key={group.user.id}
                className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0"
                onClick={() => onOpenStory(originalIndex)}
              >
                <div className="relative">
                  <div
                    className={`w-14 h-14 sm:w-15 sm:h-15 rounded-full p-[2.5px] transition-transform duration-200 group-hover:scale-105 group-active:scale-95 ${
                      group.hasUnseen
                        ? 'bg-gradient-to-tr from-amber-400 via-[#10B981] to-purple-500 shadow-md ring-2 ring-white/20'
                        : 'bg-zinc-800 opacity-70'
                    }`}
                  >
                    <div className="w-full h-full rounded-full p-0.5 bg-[#12121B]">
                      <img
                        src={group.user.avatar}
                        alt={group.user.displayName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-full bg-zinc-800"
                      />
                    </div>
                  </div>
                  {group.hasUnseen && (
                    <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-[#10B981] border-2 border-[#12121B]" />
                  )}
                </div>
                <div className="flex items-center gap-0.5 max-w-[65px]">
                  <span className="text-[11px] font-medium text-zinc-300 truncate text-center group-hover:text-white">
                    {group.user.username}
                  </span>
                  {group.user.isVerified && (
                    <span className="text-[9px] text-[#FACC15]"></span>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
