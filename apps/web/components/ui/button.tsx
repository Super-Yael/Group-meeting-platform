'use client';
import {forwardRef,type ButtonHTMLAttributes} from 'react';
import {cn} from '@/lib/utils';
type Props=ButtonHTMLAttributes<HTMLButtonElement>&{kind?:'primary'|'ghost'|'danger'|''};
export const Button=forwardRef<HTMLButtonElement,Props>(function Button({className,kind='',type='button',...props},ref){return <button ref={ref} type={type} className={cn('button',kind,className)} {...props}/>});
