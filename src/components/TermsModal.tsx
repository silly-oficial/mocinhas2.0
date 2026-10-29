import React from 'react';
import {ModalFrame} from './ModalFrame';
export function TermsModal({onClose,onAccept,showAcceptButton=false}:{onClose:()=>void;onAccept?:()=>void;showAcceptButton?:boolean}){
 return <ModalFrame onClose={onClose} label="Sobre o Mocinhas" className="people-dialog"><section className="people-admin"><h2>Sobre o Mocinhas</h2><p>Explore perfis e suas galerias de fotos e vídeos.</p><a href="/pais">Contato</a><button type="button" onClick={()=>{if(showAcceptButton)onAccept?.();onClose();}}>Fechar</button></section></ModalFrame>;
}
