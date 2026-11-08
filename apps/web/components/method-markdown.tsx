'use client';
import {memo,useMemo} from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {documentHeadings} from '@/lib/method-docs';

// Outline highlighting must not remount figures or restart their lazy loads.
export const MethodMarkdown=memo(function MethodMarkdown({content,documentId}:{content:string;documentId:number|string}){
 const headings=useMemo(()=>documentHeadings(content,documentId),[content,documentId]);
 return <div className="method-prose"><Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
  h1:({node,children})=><h2 id={headings.find(h=>h.offset===node?.position?.start.offset)?.id}>{children}</h2>,
  h2:({node,children})=><h2 id={headings.find(h=>h.offset===node?.position?.start.offset)?.id}>{children}</h2>,
  h3:({node,children})=><h3 id={headings.find(h=>h.offset===node?.position?.start.offset)?.id}>{children}</h3>,
  h4:({node,children})=><h4 id={headings.find(h=>h.offset===node?.position?.start.offset)?.id}>{children}</h4>,
  h5:({node,children})=><h5 id={headings.find(h=>h.offset===node?.position?.start.offset)?.id}>{children}</h5>,
  h6:({node,children})=><h6 id={headings.find(h=>h.offset===node?.position?.start.offset)?.id}>{children}</h6>,
  table:({children})=><div className="method-table-scroll" tabIndex={0} aria-label="可横向滚动的数据表"><table>{children}</table></div>,
  a:({href,children})=><a href={href} {...(/^https?:\/\//i.test(href||'')?{target:'_blank',rel:'noopener noreferrer'}:{})}>{children}</a>,
  img:({src,alt})=><img src={src} alt={alt||''} loading="lazy"/>
 }}>{content}</Markdown></div>;
});
