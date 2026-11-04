import type { Metadata } from 'next';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';
import './globals.css';
export const metadata:Metadata={title:'MM Lab Hub | 组会协同',description:'多发性骨髓瘤课题组文献研读、排班与知识记录平台'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN" data-theme="system"><body>{children}</body></html>}
