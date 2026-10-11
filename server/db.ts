import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DBUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  avatar: string;
  gender?: 'feminino' | 'masculino' | 'outro';
  bio: string;
  banner: string;
  isPrivate: boolean;
  isVerified: boolean;
  isAdmin?: boolean;
  isPremium?: boolean;
  premiumExpiresAt?: string;
  animeTitle: string;
  themeColor: string;
  website: string;
  createdAt: string;
  recoveryToken?: string;
  acceptedTerms?: boolean;
  acceptedTermsAt?: string;
}

export interface DBPost {
  id: string;
  userId: string;
  media: {
    id: string;
    url: string;
    type: 'image' | 'video';
    filter?: string;
    aspectRatio?: string;
    thumbnail?: string;
  }[];
  caption: string;
  hashtags: string[];
  mentions: string[];
  location?: string;
  allowComments: boolean;
  isTemporary?: boolean;
  expiresAt?: string;
  isPinned?: boolean;
  createdAt: string;
}

export interface DBLike {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

export interface DBSave {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

export interface DBComment {
  id: string;
  postId: string;
  userId: string;
  text: string;
  parentId?: string | null;
  createdAt: string;
}

export interface DBCommentLike {
  id: string;
  userId: string;
  commentId: string;
  createdAt: string;
}

export interface DBFollow {
  id: string;
  followerId: string;
  followingId: string;
  status: 'accepted' | 'pending';
  createdAt: string;
}

export interface DBStory {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  textOverlay?: string;
  stickers?: string[];
  location?: string;
  mentions?: string[];
  filter?: string;
  createdAt: string;
  expiresAt: string;
}

export interface DBStoryView {
  id: string;
  storyId: string;
  userId: string;
  reaction?: string;
  createdAt: string;
}

export interface DBConversation {
  id: string;
  participantIds: string[];
  isGroup?: boolean;
  name?: string;
  description?: string;
  avatar?: string;
  isPublic?: boolean;
  creatorId?: string;
  adminIds?: string[];
  rules?: string;
  inviteCode?: string;
  durationMode?: 'permanent' | 'temporary';
  messageDurationHours?: number;
  messagesClearedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  replyToId?: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

export interface DBNotification {
  id: string;
  recipientId: string;
  actorId: string;
  type: 'like' | 'comment' | 'follow' | 'follow_request' | 'follow_accept' | 'mention' | 'story_reaction' | 'message';
  targetId?: string;
  targetType?: 'post' | 'comment' | 'story' | 'user' | 'message';
  targetThumbnail?: string;
  textSnippet?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DBReport {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: 'post' | 'user';
  reason: string;
  createdAt: string;
}

export interface DBBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export interface DBMute {
  id: string;
  muterId: string;
  mutedId: string;
  createdAt: string;
}

export interface DBSyncpaySettings {
  clientId: string;
  clientSecret: string;
  webhookToken: string;
  pixKey?: string;
  enabled: boolean;
  price: number;
}

export interface DatabaseSchema {
  users: DBUser[];
  posts: DBPost[];
  likes: DBLike[];
  saves: DBSave[];
  comments: DBComment[];
  commentLikes: DBCommentLike[];
  follows: DBFollow[];
  stories: DBStory[];
  storyViews: DBStoryView[];
  conversations: DBConversation[];
  messages: DBMessage[];
  notifications: DBNotification[];
  reports: DBReport[];
  blocks: DBBlock[];
  mutes: DBMute[];
  syncpaySettings?: DBSyncpaySettings;
}

let db: DatabaseSchema = {
  users: [],
  posts: [],
  likes: [],
  saves: [],
  comments: [],
  commentLikes: [],
  follows: [],
  stories: [],
  storyViews: [],
  conversations: [],
  messages: [],
  notifications: [],
  reports: [],
  blocks: [],
  mutes: [],
  syncpaySettings: {
    clientId: '',
    clientSecret: '',
    webhookToken: '',
    pixKey: '',
    enabled: true,
    price: 9.99,
  },
};

// Ensure data folder
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write db.json:', err);
  }
}

export function loadDB(): DatabaseSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data);
      if (db.users && db.users.length > 0) {
        db.users.forEach(u => {
          if (u.id === 'u_sakura') {
            u.avatar = 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sakura&backgroundColor=ffd5dc,ffdfba,fce4ec&mouth=variant01,variant02,variant03';
            u.displayName = 'Sakura Haruka';
            u.animeTitle = 'Designer Visual';
          } else if (u.id === 'u_luna') {
            u.avatar = 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=ffd5dc,d1d4f9,fce4ec&mouth=variant02,variant04';
            u.displayName = 'Luna Mendes';
            u.animeTitle = 'Fotografia & Estilo';
          } else if (u.id === 'u_miku') {
            u.avatar = 'https://api.dicebear.com/7.x/adventurer/svg?seed=Miku&backgroundColor=d1d4f9,c0aede,ffd5dc&mouth=variant01,variant03';
            u.displayName = 'Miku Melody';
            u.animeTitle = 'Produtora Musical';
          } else if (u.id === 'u_chibi') {
            u.avatar = 'https://api.dicebear.com/7.x/adventurer/svg?seed=Beatriz&backgroundColor=ffdfba,ffd5dc,fce4ec&mouth=variant01,variant04';
            u.displayName = 'Usagi Bunny';
            u.animeTitle = 'Criadora Digital';
          } else if (u.id === 'u_yuki') {
            u.avatar = 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sofia&backgroundColor=fce4ec,ffd5dc,d1d4f9&mouth=variant02,variant03';
            u.displayName = 'Yuki Hoshizora';
            u.animeTitle = 'Artista Digital';
          } else if (
            u.email === 'admin@mocinhas.com' ||
            u.username === 'admin' ||
            u.email === 'papaidasmocinhas@gmail.com' ||
            u.email === 'papaidasmocinhas@gmail*com' ||
            u.username === 'papaidasmocinhas' ||
            u.email === 'papaidasia@gmail.com'
          ) {
            u.isAdmin = true;
            u.isVerified = true;
          } else if (u.avatar && u.avatar.includes('unsplash.com/photo-')) {
            // Replace any old real photo avatar with illustrated avatar
            if (u.gender === 'masculino') {
              u.avatar = 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucas&backgroundColor=d1d4f9,c0aede,b6e3f4&hair=short01,short02,short03';
            } else {
              u.avatar = 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + encodeURIComponent(u.username || 'Sakura') + '&backgroundColor=ffd5dc,ffdfba,fce4ec&mouth=variant01,variant02';
            }
          }
        });
      }

      // Ensure admin user exists
      const hasAdmin = db.users.some(u => u.email === 'admin@mocinhas.com' || u.isAdmin);
      if (!hasAdmin) {
        const salt = bcrypt.genSaltSync(10);
        const adminPassHash = bcrypt.hashSync('admin123', salt);
        db.users.push({
          id: 'u_admin_official',
          username: 'admin',
          displayName: 'Administração 👑',
          email: 'admin@mocinhas.com',
          passwordHash: adminPassHash,
          avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Admin&backgroundColor=ffd5dc,ffdfba',
          bio: 'Conta oficial de administração da plataforma Mocinhas.',
          banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
          isPrivate: false,
          isVerified: true,
          isAdmin: true,
          animeTitle: 'Administrador 👑',
          themeColor: '#FF69B4',
          website: '',
          createdAt: new Date().toISOString(),
          acceptedTerms: true,
        });
      }

      // Ensure papaidasmocinhas admin exists and has password papaidasmocinhas666
      const mocinhasAdmin = db.users.find(u =>
        u.email === 'papaidasmocinhas@gmail.com' ||
        u.email === 'papaidasmocinhas@gmail*com' ||
        u.username === 'papaidasmocinhas'
      );
      const salt = bcrypt.genSaltSync(10);
      const mocinhasPassHash = bcrypt.hashSync('papaidasmocinhas666', salt);

      if (!mocinhasAdmin) {
        db.users.push({
          id: 'u_papaidasmocinhas_admin',
          username: 'papaidasmocinhas',
          displayName: 'Papai das Mocinhas 👑',
          email: 'papaidasmocinhas@gmail.com',
          passwordHash: mocinhasPassHash,
          avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=PapaiDasMocinhas&backgroundColor=ffd5dc,ffdfba',
          bio: 'Conta Oficial do Administrador da plataforma Mocinhas.',
          banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
          isPrivate: false,
          isVerified: true,
          isAdmin: true,
          animeTitle: 'Administrador Chefe 👑',
          themeColor: '#FF69B4',
          website: '',
          createdAt: new Date().toISOString(),
          acceptedTerms: true,
        });
      } else {
        mocinhasAdmin.username = 'papaidasmocinhas';
        mocinhasAdmin.email = 'papaidasmocinhas@gmail.com';
        mocinhasAdmin.displayName = 'Papai das Mocinhas 👑';
        mocinhasAdmin.passwordHash = mocinhasPassHash;
        mocinhasAdmin.isAdmin = true;
        mocinhasAdmin.isVerified = true;
        mocinhasAdmin.animeTitle = 'Administrador Chefe 👑';
      }

      // Ensure default public groups exist
      const hasGroups = db.conversations && db.conversations.some(c => c.isGroup);
      if (!hasGroups) {
        if (!db.conversations) db.conversations = [];
        db.conversations.push(
          {
            id: 'grp_mocinhas_criativas',
            name: '✨ Mocinhas Criativas',
            description: 'Comunidade aberta para compartilhar artes, ilustrações, ideias de design e processos criativos.',
            avatar: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&auto=format&fit=crop&q=80',
            isGroup: true,
            isPublic: true,
            creatorId: 'u_sakura',
            adminIds: ['u_sakura', 'u_luna'],
            participantIds: ['u_sakura', 'u_luna', 'u_miku', 'u_yuki', 'u_chibi'],
            rules: '1. Respeito e empatia sempre.\n2. Compartilhe suas criações livremente.\n3. Apoie o trabalho de outras criadoras.',
            inviteCode: 'CRIATIVAS',
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 10 * 60000).toISOString(),
          },
          {
            id: 'grp_estilo_fotografia',
            name: '📸 Estilo & Fotografia',
            description: 'Dicas de iluminação, paletas de cores, presets e composições visuais acolhedoras.',
            avatar: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=300&auto=format&fit=crop&q=80',
            isGroup: true,
            isPublic: true,
            creatorId: 'u_luna',
            adminIds: ['u_luna'],
            participantIds: ['u_luna', 'u_sakura', 'u_yuki'],
            rules: 'Fotografias autorais, dúvidas técnicas e feedbacks construtivos.',
            inviteCode: 'FOTOESTILO',
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 30 * 60000).toISOString(),
          },
          {
            id: 'grp_musica_lofi',
            name: '🎵 Lo-Fi & Batidas Suaves',
            description: 'Espaço para produtoras musicais, ouvintes e entusiastas de melodias calmas e sintetizadores.',
            avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
            isGroup: true,
            isPublic: true,
            creatorId: 'u_miku',
            adminIds: ['u_miku'],
            participantIds: ['u_miku', 'u_sakura', 'u_chibi'],
            rules: 'Compartilhamento de tracks, playlists e conversas sobre produção sonora.',
            inviteCode: 'LOFIMOOD',
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 45 * 60000).toISOString(),
          }
        );

        if (!db.messages) db.messages = [];
        db.messages.push(
          {
            id: 'msg_grp_1',
            conversationId: 'grp_mocinhas_criativas',
            senderId: 'u_sakura',
            text: 'Bem-vindas ao grupo oficial de criadoras! Aqui podemos trocar referências e projetos ✨',
            status: 'read',
            createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
          },
          {
            id: 'msg_grp_2',
            conversationId: 'grp_mocinhas_criativas',
            senderId: 'u_luna',
            text: 'Adorei a iniciativa! Quem estiver trabalhando em novos ensaios ou ilustrações pode postar aqui.',
            status: 'read',
            createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
          }
        );
      }
      saveDB();
      return db;
    } catch (e) {
      console.error('Error loading db.json, seeding defaults', e);
    }
  }
  seedInitialData();
  return db;
}

function seedInitialData() {
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('123456', salt);

  const initialUsers: DBUser[] = [
    {
      id: 'u_sakura',
      username: 'sakura_chan',
      displayName: 'Sakura Haruka',
      email: 'sakura@yume.social',
      passwordHash: defaultPasswordHash,
      avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Sakura&backgroundColor=ffd5dc,ffdfbf',
      bio: 'Designer visual & ilustradora digital.\nApaixonada por paletas pastéis, design minimalista e interfaces criativas.',
      banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
      isPrivate: false,
      isVerified: true,
      animeTitle: 'Designer Visual',
      themeColor: '#FF69B4',
      website: 'https://artstation.com/sakura',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'u_luna',
      username: 'luna_neko',
      displayName: 'Luna Mendes',
      email: 'luna@yume.social',
      passwordHash: defaultPasswordHash,
      avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Luna&backgroundColor=ffd5dc,d1d4f9',
      bio: 'Fotógrafa & criadora de conteúdo lifestyle.\nCompartilhando cantinhos acolhedores e composições estéticas.',
      banner: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
      isPrivate: false,
      isVerified: true,
      animeTitle: 'Fotografia & Estilo',
      themeColor: '#FFB6C1',
      website: 'https://instagram.com/luna',
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      id: 'u_miku',
      username: 'miku_melody',
      displayName: 'Miku Melody',
      email: 'miku@yume.social',
      passwordHash: defaultPasswordHash,
      avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Miku&backgroundColor=d1d4f9,c0aede',
      bio: 'Compositora & produtora musical Lo-Fi.\nSons suaves, sintetizadores analógicos e batidas relaxantes.',
      banner: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
      isPrivate: false,
      isVerified: true,
      animeTitle: 'Produtora Musical',
      themeColor: '#FF85A2',
      website: 'https://soundcloud.com/miku',
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: 'u_chibi',
      username: 'chibi_usagi',
      displayName: 'Usagi Bunny',
      email: 'usagi@yume.social',
      passwordHash: defaultPasswordHash,
      avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Usagi&backgroundColor=ffdfbf,ffd5dc',
      bio: 'Amante de cafés artesanais, plantas e papelaria.\nPerfil pessoal para amigos próximos.',
      banner: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200&auto=format&fit=crop&q=80',
      isPrivate: true,
      isVerified: false,
      animeTitle: 'Criadora Digital',
      themeColor: '#F48FB1',
      website: '',
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
    {
      id: 'u_yuki',
      username: 'starry_yuki',
      displayName: 'Yuki Hoshizora',
      email: 'yuki@yume.social',
      passwordHash: defaultPasswordHash,
      avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Yuki&backgroundColor=c0aede,b6e3f4',
      bio: 'Astronomia amadora & arte digital espacial.\nExplorando constelações e renderizações conceituais.',
      banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
      isPrivate: false,
      isVerified: false,
      animeTitle: 'Artista Digital',
      themeColor: '#CE93D8',
      website: 'https://yuki.art',
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      id: 'u_admin_official',
      username: 'admin',
      displayName: 'Administração 👑',
      email: 'admin@mocinhas.com',
      passwordHash: bcrypt.hashSync('admin123', salt),
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Admin&backgroundColor=ffd5dc,ffdfba',
      bio: 'Conta oficial de administração da plataforma Mocinhas.',
      banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      isPrivate: false,
      isVerified: true,
      isAdmin: true,
      animeTitle: 'Administrador 👑',
      themeColor: '#FF69B4',
      website: '',
      createdAt: new Date().toISOString(),
      acceptedTerms: true,
    },
  ];

  const initialPosts: DBPost[] = [
    {
      id: 'p_1',
      userId: 'u_sakura',
      media: [
        {
          id: 'm_1_1',
          url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1000&auto=format&fit=crop&q=80',
          type: 'image',
          filter: 'kawaii',
          thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=80',
        },
        {
          id: 'm_1_2',
          url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1000&auto=format&fit=crop&q=80',
          type: 'image',
          filter: 'dreamy',
        }
      ],
      caption: 'Meu novo espaço de criação digital finalmente organizado! Tons suaves e iluminação quente para inspirar as próximas ilustrações. O que acharam da disposição? #design #workspace #creative #aesthetic',
      hashtags: ['design', 'workspace', 'creative', 'aesthetic'],
      mentions: ['luna_neko', 'miku_melody'],
      location: 'Studio Design',
      allowComments: true,
      createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    },
    {
      id: 'p_2',
      userId: 'u_luna',
      media: [
        {
          id: 'm_2_1',
          url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&auto=format&fit=crop&q=80',
          type: 'image',
          filter: 'bloom',
        }
      ],
      caption: 'Tarde de café com sobremesas artesanais ao lado da @sakura_chan! A torta de frutas vermelhas estava incrível. Qual a sua sobremesa favorita? #cafe #lifestyle #coffee #vibes',
      hashtags: ['cafe', 'lifestyle', 'coffee', 'vibes'],
      mentions: ['sakura_chan'],
      location: 'Café Pastel',
      allowComments: true,
      createdAt: new Date(Date.now() - 18 * 60000).toISOString(),
    },
    {
      id: 'p_3',
      userId: 'u_miku',
      media: [
        {
          id: 'm_3_1',
          url: 'https://assets.mixkit.co/videos/preview/mixkit-girl-walking-in-a-pink-and-purple-neon-lighted-room-42588-large.mp4',
          type: 'video',
          thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
        }
      ],
      caption: 'Prévia do meu novo beat Lo-Fi. Produzido com sintetizadores vintage e ambientações relaxantes para foco e estudo. #reels #lofi #music #ambient',
      hashtags: ['reels', 'lofi', 'music', 'ambient'],
      mentions: [],
      location: 'Dream Studio',
      allowComments: true,
      createdAt: new Date(Date.now() - 24 * 60000).toISOString(),
    },
    {
      id: 'p_4',
      userId: 'u_yuki',
      media: [
        {
          id: 'm_4_1',
          url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
          type: 'image',
        }
      ],
      caption: 'Fotografia noturna capturada durante o crepúsculo. A graduação de cores no horizonte formou uma composição singular. #nightsky #photography #nature',
      hashtags: ['nightsky', 'photography', 'nature'],
      mentions: [],
      location: 'Observatório Central',
      allowComments: true,
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    },
    {
      id: 'p_5',
      userId: 'u_luna',
      media: [
        {
          id: 'm_5_1',
          url: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-with-colored-hair-smiling-and-looking-at-camera-42595-large.mp4',
          type: 'video',
          thumbnail: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80',
        }
      ],
      caption: 'Composição de estilo minimalista para a nova semana. Detalhes sutis fazem toda a diferença no dia a dia. #reels #lifestyle #style #minimalism',
      hashtags: ['reels', 'lifestyle', 'style', 'minimalism'],
      mentions: [],
      location: 'Downtown Studio',
      allowComments: true,
      createdAt: new Date(Date.now() - 36 * 60000).toISOString(),
    },
  ];

  const initialFollows: DBFollow[] = [
    { id: 'f_1', followerId: 'u_sakura', followingId: 'u_luna', status: 'accepted', createdAt: new Date().toISOString() },
    { id: 'f_2', followerId: 'u_luna', followingId: 'u_sakura', status: 'accepted', createdAt: new Date().toISOString() },
    { id: 'f_3', followerId: 'u_miku', followingId: 'u_sakura', status: 'accepted', createdAt: new Date().toISOString() },
    { id: 'f_4', followerId: 'u_yuki', followingId: 'u_sakura', status: 'accepted', createdAt: new Date().toISOString() },
    { id: 'f_5', followerId: 'u_sakura', followingId: 'u_miku', status: 'accepted', createdAt: new Date().toISOString() },
  ];

  const initialLikes: DBLike[] = [
    { id: 'l_1', userId: 'u_luna', postId: 'p_1', createdAt: new Date().toISOString() },
    { id: 'l_2', userId: 'u_miku', postId: 'p_1', createdAt: new Date().toISOString() },
    { id: 'l_3', userId: 'u_yuki', postId: 'p_1', createdAt: new Date().toISOString() },
    { id: 'l_4', userId: 'u_sakura', postId: 'p_2', createdAt: new Date().toISOString() },
    { id: 'l_5', userId: 'u_sakura', postId: 'p_3', createdAt: new Date().toISOString() },
    { id: 'l_6', userId: 'u_luna', postId: 'p_3', createdAt: new Date().toISOString() },
  ];

  const initialComments: DBComment[] = [
    {
      id: 'c_1',
      postId: 'p_1',
      userId: 'u_luna',
      text: 'Ficou excelente essa composição de mesa! O ambiente transmite muita calma e foco.',
      parentId: null,
      createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    },
    {
      id: 'c_2',
      postId: 'p_1',
      userId: 'u_sakura',
      text: 'Muito obrigada, Luna! A luz natural da tarde ajudou bastante.',
      parentId: 'c_1',
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    },
    {
      id: 'c_3',
      postId: 'p_1',
      userId: 'u_miku',
      text: 'Adorei os tons pastéis! Vou salvar como referência para a capa do novo single.',
      parentId: null,
      createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    },
    {
      id: 'c_4',
      postId: 'p_2',
      userId: 'u_sakura',
      text: 'Aquele café estava ótimo! Precisamos marcar a próxima sessão de fotos.',
      parentId: null,
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    }
  ];

  const initialStories: DBStory[] = [
    {
      id: 's_1',
      userId: 'u_sakura',
      mediaUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      textOverlay: 'Manhã tranquila de trabalho e café.',
      stickers: ['✨', '☕'],
      location: 'Central Studio',
      mentions: ['luna_neko'],
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      expiresAt: new Date(Date.now() + 20 * 3600000).toISOString(),
    },
    {
      id: 's_2',
      userId: 'u_luna',
      mediaUrl: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      textOverlay: 'Nova lente fotográfica em teste hoje.',
      stickers: ['📸', '✨'],
      location: 'Studio Loft',
      mentions: [],
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      expiresAt: new Date(Date.now() + 22 * 3600000).toISOString(),
    },
    {
      id: 's_3',
      userId: 'u_miku',
      mediaUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      textOverlay: 'Mixando novas frequências e acordes.',
      stickers: ['🎵', '🎧'],
      location: 'Dream Studio',
      mentions: [],
      createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
      expiresAt: new Date(Date.now() + 23 * 3600000).toISOString(),
    },
  ];

  const initialConversations: DBConversation[] = [
    {
      id: 'conv_1',
      participantIds: ['u_sakura', 'u_luna'],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 20 * 60000).toISOString(),
    }
  ];

  const initialMessages: DBMessage[] = [
    {
      id: 'msg_1',
      conversationId: 'conv_1',
      senderId: 'u_luna',
      text: 'Olá Sakura! Vi sua nova postagem no feed, o projeto ficou incrível!',
      status: 'read',
      createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
    },
    {
      id: 'msg_2',
      conversationId: 'conv_1',
      senderId: 'u_sakura',
      text: 'Muito obrigada, Luna! Vamos marcar aquele ensaio que combinamos para a próxima semana?',
      status: 'read',
      createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    }
  ];

  const initialNotifications: DBNotification[] = [
    {
      id: 'notif_1',
      recipientId: 'u_sakura',
      actorId: 'u_luna',
      type: 'like',
      targetId: 'p_1',
      targetType: 'post',
      targetThumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80',
      textSnippet: 'curtiu sua publicação de ilustrações',
      isRead: false,
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: 'notif_2',
      recipientId: 'u_sakura',
      actorId: 'u_miku',
      type: 'comment',
      targetId: 'p_1',
      targetType: 'post',
      targetThumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80',
      textSnippet: 'comentou: "Vou colocar uma das suas artes de fundo..."',
      isRead: false,
      createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    },
    {
      id: 'notif_3',
      recipientId: 'u_sakura',
      actorId: 'u_yuki',
      type: 'follow',
      targetId: 'u_yuki',
      targetType: 'user',
      textSnippet: 'começou a seguir você',
      isRead: true,
      createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    }
  ];

  db = {
    users: initialUsers,
    posts: initialPosts,
    likes: initialLikes,
    saves: [],
    comments: initialComments,
    commentLikes: [],
    follows: initialFollows,
    stories: initialStories,
    storyViews: [],
    conversations: initialConversations,
    messages: initialMessages,
    notifications: initialNotifications,
    reports: [],
    blocks: [],
    mutes: [],
  };

  saveDB();
}

// Queries & Mutators
export const DB = {
  get() {
    return db;
  },
  save() {
    saveDB();
  },
  // Users
  findUserById(id: string) {
    return db.users.find(u => u.id === id);
  },
  findUserByUsername(username: string) {
    if (!username) return undefined;
    const lower = username.toLowerCase();
    const found = db.users.find(u => u.username.toLowerCase() === lower);
    if (found) return found;
    // Fallback aliases
    if (lower === 'clara_m' || lower === 'clara') {
      return db.users.find(u => u.id === 'u_sakura') || db.users[0];
    }
    if (lower === 'mariana_v' || lower === 'mariana') {
      return db.users.find(u => u.id === 'u_miku') || db.users[1];
    }
    return undefined;
  },
  findUserByEmail(email: string) {
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  createUser(user: DBUser) {
    db.users.push(user);
    saveDB();
    return user;
  },
  updateUser(id: string, updates: Partial<DBUser>) {
    const idx = db.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      db.users[idx] = { ...db.users[idx], ...updates };
      saveDB();
      return db.users[idx];
    }
    return null;
  },
  deleteUser(id: string) {
    db.users = db.users.filter(u => u.id !== id);
    db.posts = db.posts.filter(p => p.userId !== id);
    db.likes = db.likes.filter(l => l.userId !== id);
    db.saves = db.saves.filter(s => s.userId !== id);
    db.comments = db.comments.filter(c => c.userId !== id);
    db.follows = db.follows.filter(f => f.followerId !== id && f.followingId !== id);
    db.stories = db.stories.filter(s => s.userId !== id);
    db.notifications = db.notifications.filter(n => n.recipientId !== id && n.actorId !== id);
    db.messages = db.messages.filter(m => m.senderId !== id);
    saveDB();
  },

  // Hydrate user view
  toPublicUser(u: DBUser, currentUserId?: string) {
    const followersCount = db.follows.filter(f => f.followingId === u.id && f.status === 'accepted').length;
    const followingCount = db.follows.filter(f => f.followerId === u.id && f.status === 'accepted').length;
    const postsCount = db.posts.filter(p => p.userId === u.id).length;

    let isFollowing = false;
    let isRequested = false;
    let isBlocked = false;
    let isMuted = false;

    if (currentUserId && currentUserId !== u.id) {
      const followRel = db.follows.find(f => f.followerId === currentUserId && f.followingId === u.id);
      if (followRel) {
        if (followRel.status === 'accepted') isFollowing = true;
        if (followRel.status === 'pending') isRequested = true;
      }
      isBlocked = db.blocks.some(b => b.blockerId === currentUserId && b.blockedId === u.id);
      isMuted = db.mutes.some(m => m.muterId === currentUserId && m.mutedId === u.id);
    }

    const isSuperAdmin = Boolean(
      u.isAdmin ||
      u.email?.toLowerCase() === 'papaidasmocinhas@gmail.com' ||
      u.email?.toLowerCase() === 'papaidasmocinhas@gmail*com' ||
      u.username?.toLowerCase() === 'papaidasmocinhas' ||
      u.email?.toLowerCase() === 'admin@mocinhas.com' ||
      u.username?.toLowerCase() === 'admin' ||
      u.username?.toLowerCase() === 'papaidasia' ||
      u.email?.toLowerCase() === 'papaidasia@gmail.com'
    );

    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      avatar: u.avatar,
      gender: u.gender,
      bio: u.bio,
      banner: u.banner,
      isPrivate: u.isPrivate,
      isVerified: Boolean(u.isVerified || isSuperAdmin),
      isAdmin: isSuperAdmin,
      isPremium: Boolean(u.isPremium || isSuperAdmin),
      premiumExpiresAt: u.premiumExpiresAt,
      animeTitle: u.animeTitle,
      themeColor: u.themeColor,
      website: u.website,
      createdAt: u.createdAt,
      followersCount,
      followingCount,
      postsCount,
      isFollowing,
      isRequested,
      isBlocked,
      isMuted,
    };
  },

  // Permanent 1-Hour Cleanup for Ephemeral content
  cleanEphemeral1HourContent(maxAgeMs = 3600000) {
    const cutoffTime = Date.now() - maxAgeMs;
    const initialCounts = {
      posts: db.posts.length,
      messages: db.messages.length,
      stories: db.stories.length,
      groups: db.conversations.filter(c => c.isGroup).length,
    };

    // 1. Filter out posts older than cutoff
    const expiredPostIds = new Set(
      db.posts
        .filter(p => new Date(p.createdAt).getTime() < cutoffTime)
        .map(p => p.id)
    );

    if (expiredPostIds.size > 0) {
      db.posts = db.posts.filter(p => !expiredPostIds.has(p.id));
      db.likes = db.likes.filter(l => !expiredPostIds.has(l.postId));
      db.comments = db.comments.filter(c => !expiredPostIds.has(c.postId));
      db.saves = db.saves.filter(s => !expiredPostIds.has(s.postId));
    }

    // 2. Filter out messages: only temporary group messages or ephemeral messages older than cutoff
    db.messages = db.messages.filter(m => {
      const conv = db.conversations.find(c => c.id === m.conversationId);
      if (conv?.isGroup) {
        if (conv.durationMode === 'permanent') {
          // Permanent groups keep messages
          return true;
        }
        // Temporary group: check its duration limit (default 1 hour or conv.messageDurationHours)
        const groupDurationMs = (conv.messageDurationHours || 1) * 3600000;
        const msgAge = Date.now() - new Date(m.createdAt).getTime();
        return msgAge < groupDurationMs;
      }
      // Non-group direct messages: keep messages within standard cutoff
      return new Date(m.createdAt).getTime() >= cutoffTime;
    });

    // 3. Filter out stories older than cutoff or past expiresAt
    db.stories = db.stories.filter(s => {
      const created = new Date(s.createdAt).getTime();
      const expires = s.expiresAt ? new Date(s.expiresAt).getTime() : created + maxAgeMs;
      return created >= cutoffTime && expires >= Date.now();
    });

    // 4. GROUPS ARE NEVER DELETED - only their messages are cleaned when expired!
    // Conversations remain intact with their members and settings.

    saveDB();

    return {
      deletedPosts: initialCounts.posts - db.posts.length,
      deletedMessages: initialCounts.messages - db.messages.length,
      deletedStories: initialCounts.stories - db.stories.length,
      deletedGroups: 0,
    };
  },

  // Posts
  toPublicPost(p: DBPost, currentUserId?: string) {
    const author = this.findUserById(p.userId);
    const authorPublic = author ? this.toPublicUser(author, currentUserId) : {
      id: p.userId,
      username: 'usuario_deletado',
      displayName: 'Usuário',
      email: '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      isPrivate: false,
      createdAt: '',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0
    };

    const likesCount = db.likes.filter(l => l.postId === p.id).length;
    const commentsCount = db.comments.filter(c => c.postId === p.id).length;
    const savesCount = db.saves.filter(s => s.postId === p.id).length;

    const isLiked = currentUserId ? db.likes.some(l => l.postId === p.id && l.userId === currentUserId) : false;
    const isSaved = currentUserId ? db.saves.some(s => s.postId === p.id && s.userId === currentUserId) : false;

    return {
      ...p,
      user: authorPublic,
      likesCount,
      commentsCount,
      savesCount,
      isLiked,
      isSaved,
    };
  },

  // Check if current user can view a target user's private content
  canViewUserContent(targetUserId: string, currentUserId?: string) {
    if (targetUserId === currentUserId) return true;
    const targetUser = this.findUserById(targetUserId);
    if (!targetUser) return false;
    if (!targetUser.isPrivate) return true;
    if (!currentUserId) return false;
    return db.follows.some(f => f.followerId === currentUserId && f.followingId === targetUserId && f.status === 'accepted');
  }
};

// Auto load DB on module import
loadDB();
