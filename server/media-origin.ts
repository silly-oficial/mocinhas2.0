import type {MediaOrigin} from '../shared/people';
export function uploadedMediaOrigin(url:string,handle:unknown,at=new Date().toISOString()):MediaOrigin {
  if(typeof handle!=='string' || !/^[a-zA-Z0-9_.]{1,60}$/.test(handle.replace(/^@/,'')))throw Error('Informe o @ original do TikTok para a mídia.');
  const clean=handle.replace(/^@/,'');
  return {url,source_platform:'tiktok',source_url:'https://www.tiktok.com/@'+encodeURIComponent(clean),source_handle:'@'+clean,captured_at:at,display_mode:'reupload',last_check_at:null,is_still_available:null};
}
