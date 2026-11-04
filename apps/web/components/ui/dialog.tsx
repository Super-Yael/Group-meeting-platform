'use client';
import * as Dialog from '@radix-ui/react-dialog';
export function Modal({open,onOpenChange,title,children}:{open:boolean;onOpenChange:(v:boolean)=>void;title:string;children:React.ReactNode}){return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"><Dialog.Content className="dialog"><Dialog.Title asChild><h2>{title}</h2></Dialog.Title>{children}</Dialog.Content></Dialog.Overlay></Dialog.Portal></Dialog.Root>}
