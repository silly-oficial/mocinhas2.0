import {randomUUID} from 'node:crypto';
import type {DB} from './db';
export interface LegalAuditEntry {id:string;actor:string;at:string;entity:string;field:string;before:unknown;after:unknown;reason:string}
export function appendLegalAudit(db:typeof DB,entry:Omit<LegalAuditEntry,'id'|'at'>){
 db.get().legalAudit=[...(db.get().legalAudit||[]),{...entry,id:randomUUID(),at:new Date().toISOString()}];
}
