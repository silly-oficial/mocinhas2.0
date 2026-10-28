export function avatarPlayerError(type:string,value:any,kind:'photo'|'video',hasImage:boolean):string{
 // Deprecated generic media errors also describe aborted music in a visible photo post.
 if(type!=='onPlayerError')return '';
 const code=value?.errorCode??value;
 if(code===3002)return 'Toque em Reproduzir trecho para iniciar o vídeo.';
 if(kind==='photo'&&hasImage&&code===3001)return '';
 return 'O TikTok não conseguiu carregar a publicação (código '+String(code??'indisponível')+').';
}
