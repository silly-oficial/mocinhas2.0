import {socialVideo,type PersonProfile} from '../../shared/people';

export function profileFeed(profiles:PersonProfile[]){
 const visible=profiles.filter(person=>person.published&&!person.hidden);
 const photos=visible.flatMap(person=>person.photos.map(url=>({person,url})));
 const posts=visible.flatMap(person=>person.videos.map((video,index)=>({person,video,index})));
 const isPhoto=(item:typeof posts[number])=>{try{return socialVideo(item.video.url).postType==='photo';}catch{return false;}};
 return {photos,carousels:posts.filter(isPhoto),videos:posts.filter(item=>!isPhoto(item))};
}
