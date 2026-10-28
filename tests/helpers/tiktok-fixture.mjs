// Imported only by integration-test child processes. Never used by the application.
const realFetch=globalThis.fetch;
globalThis.fetch=async(input,options)=>{
 const endpoint=String(input);
 if(endpoint.startsWith('https://www.tiktok.com/oembed?url=')){
  const post=new URL(new URL(endpoint).searchParams.get('url'));
  return new Response(JSON.stringify({thumbnail_url:'https://cdn.example.invalid/tiktok-preview.jpg',author_url:'https://www.tiktok.com/'+post.pathname.split('/')[1],author_name:'Fixture Creator'}));
 }
 return realFetch(input,options);
};
