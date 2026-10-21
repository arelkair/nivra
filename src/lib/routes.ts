export const isStandalone = () => location.pathname === '/shared' || location.pathname.startsWith('/shared/')
export const isPublicPage = () => location.pathname === '/changelog' || location.pathname.startsWith('/shared')
