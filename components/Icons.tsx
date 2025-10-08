import React from 'react';

export const LogoIcon: React.FC = () => (
    <svg width="44" height="44" viewBox="0 0 100 100" className="shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="22" y="22" width="56" height="56" rx="8" ry="8" fill="#38bdf8" fillOpacity="0.1" stroke="#38bdf8" strokeWidth="4"/>
        <path d="M10 30H22 M10 40H22 M10 50H22 M10 60H22 M10 70H22" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round"/>
        <path d="M78 30H90 M78 40H90 M78 50H90 M78 60H90 M78 70H90" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round"/>
        <path d="M30 10V22 M40 10V22 M50 10V22 M60 10V22 M70 10V22" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round"/>
        <path d="M30 78V90 M40 78V90 M50 78V90 M60 78V90 M70 78V90" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round"/>
        <text x="50" y="62" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" fontSize="32" fontWeight="bold" fill="white" textAnchor="middle">AI</text>
    </svg>
);

export const OnlineStatusIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-300" viewBox="0 0 24 24" aria-hidden="true">
      <title>Online</title>
      <path fill="currentColor" d="M12 4.5C7.03 4.5 2.73 7.61 0 12h2.22c2.09-3.23 5.42-5.25 9.78-5.25s7.69 2.02 9.78 5.25H24c-2.73-4.39-7.03-7.5-12-7.5zm0 4.5c-3.31 0-6.22 1.66-8.07 4.25h2.12c1.32-1.94 3.55-3.09 6.01-3.09s4.69 1.15 6.01 3.09h2.12C18.22 10.66 15.31 9 12 9zm0 4.5c-1.66 0-3.12.84-4.04 2.25h8.08C15.12 14.34 13.66 13.5 12 13.5zm0 4.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z"/>
    </svg>
);

export const OfflineStatusIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" viewBox="0 0 24 24" aria-hidden="true">
        <title>Offline</title>
        <path fill="currentColor" d="M12 4.5C7.03 4.5 2.73 7.61 0 12h2.22c2.09-3.23 5.42-5.25 9.78-5.25s7.69 2.02 9.78 5.25H24c-2.73-4.39-7.03-7.5-12-7.5zm0 4.5c-3.31 0-6.22 1.66-8.07 4.25h2.12c1.32-1.94 3.55-3.09 6.01-3.09s4.69 1.15 6.01 3.09h2.12C18.22 10.66 15.31 9 12 9zm0 4.5c-1.66 0-3.12.84-4.04 2.25h8.08C15.12 14.34 13.66 13.5 12 13.5zm0 4.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z"/>
        <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2" stroke="currentColor" />
    </svg>
);

export const SignOutIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
);

export const DashboardIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
);

export const UsersIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
);

export const ClientMgmtIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

export const ClientReportsIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
);

export const ActivityIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

export const RecordsIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75c0-.231-.035-.454-.1-.664M6.75 7.5h10.5a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25-2.25H6.75a2.25 2.25 0 01-2.25-2.25v-7.5a2.25 2.25 0 012.25-2.25z" /></svg>
);

export const CaptureIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.414-1.414A1 1 0 009.586 3H6.414a1 1 0 00-.707.293L4.293 4.707A1 1 0 013.586 5H4zm10 6a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
);

export const UploadIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
);

export const HomeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

export const CloseIcon: React.FC = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
);

export const GoToReportsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m14 0v-2a4 4 0 00-4-4h-2a4 4 0 00-4 4v2m14 0H5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

export const ExcelExportIcon: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

// New Icons for Redesign
export const ClientIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8 text-sky-600 dark:text-sky-400" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h1.5m-1.5 3h1.5m-1.5 3h1.5M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
);

export const LocationIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8 text-sky-600 dark:text-sky-400" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
);

export const EquipmentIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8 text-sky-600 dark:text-sky-400" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.11-1.226.55-.22 1.156-.22 1.706 0 .55.22 1.02.684 1.11 1.226l.094.542c.063.372.368.65.753.65h.542c.421 0 .79.259.962.634.172.375.102.81-.182 1.103l-.398.434c-.245.268-.384.62-.384.991v.542c0 .421.259.79.634.962.375.172.81.102 1.103-.182l.434-.398c.268-.245.62-.384.991-.384h.542c.421 0 .79.259.962.634.172.375.102.81-.182 1.103l-.398.434c-.245.268-.384.62-.384.991v.542c0 .421.259.79.634.962.375.172.81.102 1.103-.182l.434-.398c.268-.245.62-.384.991-.384h.542c.421 0 .79.259.962.634.172.375.102.81-.182 1.103l-.398.434c-.245.268-.384.62-.384.991v.542c0 .421.259.79.634.962.375.172.81.102 1.103-.182l.434-.398c.292-.292.656-.434 1.022-.434h.542c.55 0 1.02.458 1.11.962.09.504-.22.98-.634 1.103-.375.172-.81.102-1.103-.182l-1.022-1.11-3.938-3.938c-.245-.268-.384-.62-.384-.991v-1.086c0-.421-.259-.79-.634-.962-.375-.172-.81-.102-1.103.182l-4.022 4.022c-.292.292-.656.434-1.022.434H9.406c-.55 0-1.02-.458-1.11-.962-.09-.504.22-.98.634-1.103.375-.172.81.102 1.103.182l1.022 1.11 1.456-1.456c.245-.268.384-.62.384-.991v-1.086c0-.421-.259-.79-.634-.962-.375-.172-.81-.102-1.103.182l-1.456 1.456-1.546-1.546c-.245-.268-.384-.62-.384-.991v-1.086c0-.421-.259-.79-.634-.962-.375-.172-.81-.102-1.103.182l-1.546 1.546-1.546-1.546c-.292-.292-.656-.434-1.022-.434H5.656c-.55 0-1.02-.458-1.11-.962-.09-.504.22-.98.634-1.103.375-.172.81-.102 1.103.182l1.546 1.546 1.456-1.456c.245-.268.384-.62.384-.991v-1.086c0-.421-.259-.79-.634-.962-.375-.172-.81-.102-1.103.182l-4.022 4.022c-.292-.292-.656-.434-1.022.434H3.406c-.55 0-1.02-.458-1.11-.962C2.206 13.98 2.516 13.5 3 13.328c.375-.172.81-.102 1.103.182l.398.434c.245.268.384.62.384.991v.542c0 .421.259.79.634.962.375.172.81.102 1.103-.182l.398-.434c.245-.268.384-.62.384-.991v.542c0 .421.259.79.634.962.375.172.81.102 1.103-.182l.398-.434c.245-.268.384-.62.384-.991v.542c0 .421.259.79.634.962.375.172.81.102 1.103-.182l.398-.434c.292-.292.656-.434 1.022-.434h.542c.55 0 1.02-.458 1.11-.962.09-.504-.22-.98-.634-1.103-.375-.172-.81-.102-1.103.182l-.398.434c-.245-.268-.384-.62-.384-.991v-.542c0-.421-.259-.79-.634-.962-.375-.172-.81-.102-1.103.182l-.398.434c-.245-.268-.384-.62-.384-.991v-.542c0-.421-.259-.79-.634-.962-.375-.172-.81-.102-1.103.182l-.398.434c-.245-.268-.384-.62-.384-.991v-.542c0-.421-.259-.79-.634-.962-.375-.172-.81-.102-1.103.182l-1.022 1.11-1.456-1.456c-.245-.268-.384-.62-.384-.991v-1.086c0-.421-.259-.79-.634-.962-.375-.172-.81-.102-1.103.182L9.49 9.856c-.292.292-.656.434-1.022.434H7.926c-.55 0-1.02-.458-1.11-.962-.09-.504.22-.98.634-1.103.375-.172.81-.102 1.103.182l1.022 1.11 3.938-3.938c.245-.268.384-.62.384-.991v-1.086c0-.421.259-.79.634-.962C8.434 2.98 8.844 2.98 9.394 3.2l.094.542z" /></svg>
);

export const IRScannerIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6 text-brand-orange" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.5 16s-1.5-2-3.5-2-3.5 2-3.5 2" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 9.5a.5.5 0 11-1 0 .5.5 0 011 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M10 9.5a.5.5 0 11-1 0 .5.5 0 011 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M7 19.5c.34-.33 1.25-1.5 2.5-1.5s2.16 1.17 2.5 1.5M12 19.5c.34-.33 1.25-1.5 2.5-1.5s2.16 1.17 2.5 1.5" /></svg>
);

export const DSScannerIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6 text-slate-500 dark:text-gray-400" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008v-.008z" /></svg>
);

export const NameplateScannerIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6 text-slate-500 dark:text-gray-400" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h13.5m-13.5 4.5h13.5m-13.5 4.5h13.5m-13.5-12h13.5m-13.5 15h13.5m-15.75-18v18m18-18v18" /></svg>
);

export const MeterScannerIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6 text-slate-500 dark:text-gray-400" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h8.25a2.25 2.25 0 012.25 2.25v3a2.25 2.25 0 01-2.25 2.25H8.25a2.25 2.25 0 01-2.25-2.25v-3a2.25 2.25 0 012.25-2.25z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 14.25l.402.201a1.5 1.5 0 01.895 1.253v.998c0 .828-.672 1.5-1.5 1.5H8.25a1.5 1.5 0 01-1.5-1.5v-.998a1.5 1.5 0 01.895-1.253l.402-.201M12 11.25v3" /></svg>
);

export const NewInspectionIcon: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3h-6" />
    </svg>
);

export const BackIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);