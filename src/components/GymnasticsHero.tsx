import {ArrowUpRight, MoveUpRight} from 'lucide-react';

/** Editorial reference photos; these are not invented person/profile records. */
export function GymnasticsHero({onExplore}:{onExplore:()=>void}) {
  return <section className="gym-hero" aria-labelledby="gym-title">
    <div className="gym-intro"><span className="gym-eyebrow"><span aria-hidden="true"/> UM NOVO OLHAR PARA A GINÁSTICA</span>
      <h1 id="gym-title">Talento que<br/>inspira. <em>Movimento</em><br/>que conecta.</h1>
      <p>Conheça ginastas, acompanhe suas jornadas e encontre sua próxima inspiração para seguir.</p>
      <button className="gym-explore" onClick={onExplore}>Explorar ginastas <ArrowUpRight size={22}/></button>
      <div className="gym-footnote"><MoveUpRight size={16}/><span>Novas histórias. A mesma paixão pelo esporte.</span></div>
    </div>
    <div className="gym-editorial">
      <div className="gym-photo-stage"><img src="/themes/movimento/9073.webp" width="736" height="920" alt="Atleta praticando uma postura de flexibilidade no tapete" fetchPriority="high"/><span className="gym-photo-caption">A beleza de ir além.</span></div>
      <div className="gym-photo-strip" aria-label="Inspirações visuais do tema">
        {[{id:9074,alt:'Jovem atleta demonstrando equilíbrio e flexibilidade'},{id:9075,alt:'Jovem atleta em uma pose de equilíbrio'},{id:9076,alt:'Três crianças juntas em um momento de lazer'},{id:9077,alt:'Duas crianças sorrindo na escada'}].map(photo=><img key={photo.id} src={`/themes/movimento/${photo.id}.webp`} width="736" height="920" loading="lazy" alt={photo.alt}/>)}
      </div>
      <span className="gym-editorial-label">MOVIMENTO / INSPIRAÇÃO / CONEXÃO</span>
    </div>
  </section>;
}
