import { supabase } from './supabase';

export interface GalleryPost {
  id: string;
  image_url: string;
  ss: string;
  f: string;
  iso: string;
  created_at: string;
}

export interface ExposureSettings {
  ss: string;
  f: string;
  iso: string;
}

/**
 * 1. ギャラリー投稿一覧を取得 (最新順)
 */
export const fetchGalleryPosts = async (): Promise<GalleryPost[]> => {
  const { data, error } = await supabase
    .from('gallery_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
  return data || [];
};

/**
 * 2. 画像をアップロードし、投稿レコードを作成
 * @param base64Image Data URL形式の文字列 (data:image/jpeg;base64,...)
 * @param settings 撮影時の露出設定 (ss, f, iso)
 */
export const uploadGalleryPost = async (
  base64Image: string,
  settings: ExposureSettings
): Promise<GalleryPost> => {
  try {
    // 1. Base64をBlobに変換
    const response = await fetch(base64Image);
    const blob = await response.blob();
    
    // ユニークなファイル名を生成 (timestamp + random)
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
    const filePath = `${fileName}`;

    // 2. Storageにアップロード
    const { error: uploadError } = await supabase.storage
      .from('gallery_images')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 3. 公開URLの取得
    const { data: { publicUrl } } = supabase.storage
      .from('gallery_images')
      .getPublicUrl(filePath);

    // 4. DBにレコードを挿入
    const { data, error: insertError } = await supabase
      .from('gallery_posts')
      .insert([
        {
          image_url: publicUrl,
          ss: settings.ss,
          f: settings.f,
          iso: settings.iso,
        }
      ])
      .select()
      .single();

    if (insertError) throw insertError;
    return data;
    } catch (error) {
    console.error('Upload failed:', error);
    throw error;
    }
    };

