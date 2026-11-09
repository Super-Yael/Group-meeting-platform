import type { Metadata } from 'next';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';
import './globals.css';
export const metadata:Metadata={title:'陈海生血液学实验室 | 组会协同',description:'陈海生血液学实验室文献研读、排班与知识记录平台'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN" data-theme="system"><body>{children}</body></html>}
