import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {validateProfileAvatar} from '../shared/profile-avatar';
import {validatePerson} from '../server/people';
import {ProfileAvatar} from '../src/components/ProfileAvatar';
import {ProfileAvatarEditor} from '../src/components/ProfileAvatarEditor';
const photo='/uploads/12345678-1234-4123-8123-123456789abc.png',video=photo.replace('.png','.mp4');
for(const kind of ['photo','video'] as const){
 const value:any={source:'upload',kind,url:kind==='photo'?photo:video,...(kind==='photo'?{imageIndex:0}:{start:2,end:5}),zoom:1.6,offsetX:-15,offsetY:20};
 const clean=validateProfileAvatar(value)!;assert.deepEqual(clean,value);
 const profile=validatePerson({name:'Perfil',username:'perfil',avatar:'',photos:[],videos:[],tags:[],socials:{},hidden:false,featured:false,order:0,avatarSelection:value});assert.deepEqual(profile.avatarSelection,value);assert.equal(profile.socials.tiktok,'','uploads do not invent a TikTok handle');
 const html=renderToStaticMarkup(React.createElement(ProfileAvatar,{selection:clean,alt:'Avatar'}));
 assert.ok(!html.includes('<iframe'));assert.match(html,kind==='photo'?/<img/:/<video/);assert.ok(html.includes(value.url));assert.match(html,/left:35%/);assert.match(html,/top:70%/);assert.match(html,/scale\(1.6\)/);
 if(kind==='video'){assert.match(html,/muted/);assert.match(html,/playsInline/i);}
 const editor=renderToStaticMarkup(React.createElement(ProfileAvatarEditor,{value:clean,onChange(){}}));for(const label of ['Adicionar foto','Adicionar vídeo','Mover para a esquerda','Mover para cima','Mover para baixo','Mover para a direita','Posição horizontal','Posição vertical','No perfil','Centralizar'])assert.ok(editor.includes(label),label);
}
for(const bad of [{source:'upload',kind:'photo',url:video},{source:'upload',kind:'video',url:photo,start:0,end:2},{source:'upload',kind:'photo',url:'https://example.invalid/p.png'},{source:'upload',kind:'photo',url:'/uploads/../private.png'},{source:'upload',kind:'video',url:video,start:0,end:16},{source:'upload',kind:'photo',url:photo,offsetX:51},{source:'upload',kind:'photo',url:photo,offsetY:NaN},{source:'upload',kind:'photo',url:photo,zoom:4}])assert.throws(()=>validateProfileAvatar(bad));
const linked=validateProfileAvatar({url:'https://www.tiktok.com/@creator/photo/7421111111111111111',kind:'photo',imageIndex:2,zoom:1.5,offsetX:5,offsetY:-5});assert.equal(linked?.offsetY,-5);
console.log('Uploaded photo/video avatars: safe sources, crop validation, rendered transforms, upload controls and live preview structure passed.');
