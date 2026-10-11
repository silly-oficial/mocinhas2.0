import { getSupabase } from './supabase';

export interface SupabasePost {
  id: string;
  user_id: string;
  caption: string;
  category: string;
  hashtags: string[];
  mentions: string[];
  location?: string;
  allow_comments: boolean;
  is_temporary?: boolean;
  expires_at?: string;
  is_pinned?: boolean;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string;
    avatar: string;
    is_verified?: boolean;
    is_admin?: boolean;
  };
  post_media?: {
    id: string;
    url: string;
    type: string;
    filter?: string;
    aspect_ratio?: string;
    thumbnail?: string;
  }[];
}

export const supabaseService = {
  /**
   * Faz upload de arquivo diretamente para o bucket 'mocinhas-media' no Supabase Storage
   */
  async uploadMedia(file: File, folder: string = 'posts'): Promise<string> {
    const client = getSupabase();
    if (!client) throw new Error('Supabase não está configurado.');

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    const { error: uploadError } = await client.storage
      .from('mocinhas-media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = client.storage
      .from('mocinhas-media')
      .getPublicUrl(fileName);

    return data.publicUrl;
  },

  /**
   * Busca todas as categorias salvas no Supabase
   */
  async getCategories() {
    const client = getSupabase();
    if (!client) return [];

    const { data, error } = await client
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Erro ao buscar categorias do Supabase:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Cria uma nova categoria no Supabase
   */
  async createCategory(category: { name: string; slug: string; description?: string; icon?: string }) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase não está configurado.');

    const { data, error } = await client
      .from('categories')
      .insert([category])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deleta uma categoria no Supabase
   */
  async deleteCategory(id: string) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase não está configurado.');

    const { error } = await client
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Busca posts com perfis e mídias associadas
   */
  async getPosts(category?: string) {
    const client = getSupabase();
    if (!client) return [];

    let query = client
      .from('posts')
      .select(`
        *,
        profiles:user_id (id, username, display_name, avatar, is_verified, is_admin),
        post_media (*)
      `)
      .order('created_at', { ascending: false });

    if (category && category !== 'Todas') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Erro ao buscar posts no Supabase:', error);
      return [];
    }
    return data || [];
  },

  /**
   * Cria um novo post e suas mídias diretamente no Supabase
   */
  async createPost(userId: string, postData: {
    caption: string;
    category?: string;
    location?: string;
    allowComments?: boolean;
    isTemporary?: boolean;
    expiresAt?: string;
    media: { url: string; type: 'image' | 'video'; filter?: string; aspectRatio?: string; thumbnail?: string }[];
  }) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase não está configurado.');

    // 1. Inserir o post
    const { data: post, error: postError } = await client
      .from('posts')
      .insert([{
        user_id: userId,
        caption: postData.caption,
        category: postData.category || 'Geral',
        location: postData.location || '',
        allow_comments: postData.allowComments ?? true,
        is_temporary: postData.isTemporary ?? false,
        expires_at: postData.expiresAt || null,
      }])
      .select()
      .single();

    if (postError) throw postError;

    // 2. Inserir as mídias associadas
    if (postData.media && postData.media.length > 0) {
      const mediaItems = postData.media.map((m, idx) => ({
        post_id: post.id,
        url: m.url,
        type: m.type,
        filter: m.filter || 'normal',
        aspect_ratio: m.aspectRatio || 'square',
        thumbnail: m.thumbnail || null,
        order_index: idx,
      }));

      const { error: mediaError } = await client
        .from('post_media')
        .insert(mediaItems);

      if (mediaError) throw mediaError;
    }

    return post;
  },

  /**
   * Inscreve-se em atualizações Realtime de mensagens de uma conversa
   */
  subscribeToConversation(conversationId: string, onMessage: (message: any) => void) {
    const client = getSupabase();
    if (!client) return () => {};

    const channel = client
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onMessage(payload.new);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },
};
