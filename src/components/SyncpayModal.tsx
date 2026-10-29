import React from 'react';
import {ModalFrame} from './ModalFrame';
export function SyncpayModal({onClose}:{onClose:()=>void;onSuccess?:()=>void}){
 return <ModalFrame onClose={onClose} label="Pagamentos desativados" className="people-dialog"><section className="people-admin"><h2>Pagamentos desativados</h2><p>O diretório não recebe novas cobranças nesta versão. </p><button type="button" className="people-primary" onClick={onClose}>Fechar</button></section></ModalFrame>;
}
