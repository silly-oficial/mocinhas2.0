// Curated illustrated avatars matching the theme and separated by gender
export const FEMALE_AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Sakura&backgroundColor=ffd5dc,ffdfba,fce4ec&mouth=variant01,variant02,variant03',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=ffd5dc,d1d4f9,fce4ec&mouth=variant02,variant04',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Miku&backgroundColor=d1d4f9,c0aede,ffd5dc&mouth=variant01,variant03',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Beatriz&backgroundColor=ffdfba,ffd5dc,fce4ec&mouth=variant01,variant04',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Sofia&backgroundColor=fce4ec,ffd5dc,d1d4f9&mouth=variant02,variant03',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Julia&backgroundColor=ffd5dc,ffdfba,fce4ec&mouth=variant01,variant02',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Helena&backgroundColor=c0aede,ffd5dc,d1d4f9&mouth=variant03,variant04',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Clara&backgroundColor=ffd5dc,fce4ec,ffdfba&mouth=variant02,variant01',
];

export const MALE_AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucas&backgroundColor=d1d4f9,c0aede,b6e3f4&hair=short01,short02,short03',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Gabriel&backgroundColor=b6e3f4,d1d4f9,ffd5dc&hair=short04,short05',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Mateus&backgroundColor=c0aede,d1d4f9,ffdfba&hair=short02,short06',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=ffdfba,d1d4f9,b6e3f4&hair=short01,short04',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Thiago&backgroundColor=d1d4f9,b6e3f4,c0aede&hair=short03,short05',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Pedro&backgroundColor=b6e3f4,ffd5dc,d1d4f9&hair=short02,short07',
];

export const NEUTRAL_AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex&backgroundColor=ffd5dc,c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Sam&backgroundColor=d1d4f9,ffdfba,b6e3f4',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Robin&backgroundColor=c0aede,ffd5dc,ffdfba',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Taylor&backgroundColor=b6e3f4,d1d4f9,ffd5dc',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Jordan&backgroundColor=ffd5dc,d1d4f9,c0aede',
];

export interface AvatarCoverMatch {
  seed: string;
  avatar: string;
  cover: string;
  themeTitle: string;
  gradientPreview: string;
}

// Curated matching covers perfectly harmonized with each avatar's color palette & aesthetic
export const AVATAR_COVER_MATCHES: Record<string, AvatarCoverMatch> = {
  Sakura: {
    seed: 'Sakura',
    avatar: FEMALE_AVATARS[0],
    cover: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Flores de Cerejeira 🌸',
    gradientPreview: 'from-sky-400 via-indigo-400 to-violet-500',
  },
  Luna: {
    seed: 'Luna',
    avatar: FEMALE_AVATARS[1],
    cover: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Noite Estrelada & Lavanda 🌙',
    gradientPreview: 'from-purple-500 via-indigo-400 to-cyan-400',
  },
  Miku: {
    seed: 'Miku',
    avatar: FEMALE_AVATARS[2],
    cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Céu Anime & Nuvens Pastel ☁️',
    gradientPreview: 'from-sky-400 via-indigo-300 to-cyan-400',
  },
  Beatriz: {
    seed: 'Beatriz',
    avatar: FEMALE_AVATARS[3],
    cover: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Pêssego & Flores Douradas 🍑',
    gradientPreview: 'from-amber-300 via-indigo-400 to-amber-300',
  },
  Sofia: {
    seed: 'Sofia',
    avatar: FEMALE_AVATARS[4],
    cover: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Jardim de Rosas Suaves 🌹',
    gradientPreview: 'from-violet-500 via-indigo-400 to-red-300',
  },
  Julia: {
    seed: 'Julia',
    avatar: FEMALE_AVATARS[5],
    cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Entardecer no Mar Cor-de-Rosa 🏖️',
    gradientPreview: 'from-emerald-400 via-amber-200 to-amber-300',
  },
  Helena: {
    seed: 'Helena',
    avatar: FEMALE_AVATARS[6],
    cover: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Campos de Lavanda Suave 💜',
    gradientPreview: 'from-violet-400 via-purple-300 to-cyan-400',
  },
  Clara: {
    seed: 'Clara',
    avatar: FEMALE_AVATARS[7],
    cover: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Raio de Sol & Margaridas 🌼',
    gradientPreview: 'from-amber-200 via-yellow-300 to-cyan-400',
  },
  Lucas: {
    seed: 'Lucas',
    avatar: MALE_AVATARS[0],
    cover: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Noite Neon & Cyan 🌌',
    gradientPreview: 'from-cyan-400 via-blue-500 to-indigo-600',
  },
  Gabriel: {
    seed: 'Gabriel',
    avatar: MALE_AVATARS[1],
    cover: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Montanhas & Céu Noturno 🏔️',
    gradientPreview: 'from-blue-400 via-slate-500 to-indigo-500',
  },
  Mateus: {
    seed: 'Mateus',
    avatar: MALE_AVATARS[2],
    cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Crepúsculo Roxo & Synthwave 🌆',
    gradientPreview: 'from-purple-500 via-purple-500 to-indigo-500',
  },
  Leo: {
    seed: 'Leo',
    avatar: MALE_AVATARS[3],
    cover: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Horizonte Dourado 🌇',
    gradientPreview: 'from-amber-400 via-orange-400 to-amber-300',
  },
  Thiago: {
    seed: 'Thiago',
    avatar: MALE_AVATARS[4],
    cover: 'https://images.unsplash.com/photo-1505144808419-1957a94ca45b?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Ondas do Oceano Azul 🌊',
    gradientPreview: 'from-teal-400 via-cyan-500 to-blue-600',
  },
  Pedro: {
    seed: 'Pedro',
    avatar: MALE_AVATARS[5],
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Galáxia da Meia-Noite ✨',
    gradientPreview: 'from-indigo-600 via-purple-600 to-indigo-500',
  },
  Alex: {
    seed: 'Alex',
    avatar: NEUTRAL_AVATARS[0],
    cover: 'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Nuvens Aquarela Suaves 🎨',
    gradientPreview: 'from-sky-300 via-purple-300 to-indigo-300',
  },
  Sam: {
    seed: 'Sam',
    avatar: NEUTRAL_AVATARS[1],
    cover: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Amanhecer Pêssego Sereno 🌅',
    gradientPreview: 'from-amber-200 via-amber-300 to-amber-300',
  },
  Robin: {
    seed: 'Robin',
    avatar: NEUTRAL_AVATARS[2],
    cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Floresta Mística & Névoa 🌲',
    gradientPreview: 'from-emerald-400 via-teal-300 to-purple-300',
  },
  Taylor: {
    seed: 'Taylor',
    avatar: NEUTRAL_AVATARS[3],
    cover: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Luz Solar & Flores Silvestres 🌿',
    gradientPreview: 'from-emerald-400 via-teal-200 to-amber-200',
  },
  Jordan: {
    seed: 'Jordan',
    avatar: NEUTRAL_AVATARS[4],
    cover: 'https://images.unsplash.com/photo-1439853949127-fa647821eba0?w=1200&auto=format&fit=crop&q=80',
    themeTitle: 'Lago Violeta & Serenidade 💧',
    gradientPreview: 'from-violet-400 via-indigo-300 to-amber-300',
  },
};

export const DEFAULT_AVATAR_FEMALE = FEMALE_AVATARS[0];
export const DEFAULT_AVATAR_MALE = MALE_AVATARS[0];
export const DEFAULT_AVATAR_NEUTRAL = NEUTRAL_AVATARS[0];
export const DEFAULT_COVER = AVATAR_COVER_MATCHES.Sakura.cover;

export function getAvatarsByGender(gender?: 'feminino' | 'masculino' | 'outro' | string): string[] {
  if (gender === 'masculino') return MALE_AVATARS;
  if (gender === 'outro') return NEUTRAL_AVATARS;
  return FEMALE_AVATARS;
}

/**
 * Returns a perfectly matching cover for a given avatar URL.
 * Checks seed pattern first, then checks exact avatar URL, or generates a stable match.
 */
export function getMatchingCoverForAvatar(avatarUrl?: string): { cover: string; themeTitle: string } {
  if (!avatarUrl) {
    return {
      cover: DEFAULT_COVER,
      themeTitle: AVATAR_COVER_MATCHES.Sakura.themeTitle,
    };
  }

  // 1. Check seed in Dicebear URL
  const seedMatch = avatarUrl.match(/seed=([a-zA-Z0-9_-]+)/i);
  if (seedMatch && seedMatch[1]) {
    const seed = seedMatch[1];
    for (const key of Object.keys(AVATAR_COVER_MATCHES)) {
      if (key.toLowerCase() === seed.toLowerCase()) {
        return {
          cover: AVATAR_COVER_MATCHES[key].cover,
          themeTitle: AVATAR_COVER_MATCHES[key].themeTitle,
        };
      }
    }
  }

  // 2. Check direct avatar URL match
  for (const match of Object.values(AVATAR_COVER_MATCHES)) {
    if (match.avatar === avatarUrl) {
      return {
        cover: match.cover,
        themeTitle: match.themeTitle,
      };
    }
  }

  // 3. Fallback deterministic hash so any custom avatar always gets a consistent matching cover
  const keys = Object.keys(AVATAR_COVER_MATCHES);
  let hash = 0;
  for (let i = 0; i < avatarUrl.length; i++) {
    hash = (hash << 5) - hash + avatarUrl.charCodeAt(i);
    hash |= 0;
  }
  const pickedIndex = Math.abs(hash) % keys.length;
  const picked = AVATAR_COVER_MATCHES[keys[pickedIndex]];

  return {
    cover: picked.cover,
    themeTitle: picked.themeTitle,
  };
}
