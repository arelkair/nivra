import { useEffect, useMemo, useRef } from 'react'
import { useStored } from './store'
import { GALICIA_2026, loadFeed, type CalendarFeed } from './calendarFeeds'

export function useExternalCalendars() {
  const [feeds, setFeeds] = useStored<CalendarFeed[]>('nivra-calendar-feeds', [])
  const [galicia] = useStored('nivra-calendar-galicia', false)
  const checked = useRef(new Set<string>())
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    for (const feed of feeds) {
      if (!feed.enabled || !feed.url || checked.current.has(feed.id) || (feed.updatedAt && Date.now() - new Date(feed.updatedAt).getTime() < 3600000)) continue
      checked.current.add(feed.id)
      void loadFeed(feed).then(next => { if (alive.current) setFeeds(rows => rows.map(row => row.id === feed.id ? { ...row, items: next.items, updatedAt: next.updatedAt, error: undefined } : row)) }).catch(cause => { if (alive.current) setFeeds(rows => rows.map(row => row.id === feed.id ? { ...row, error: (cause as Error).message } : row)) })
    }
  }, [feeds, setFeeds])
  return useMemo(() => [...(galicia ? GALICIA_2026 : []), ...feeds.filter(feed => feed.enabled).flatMap(feed => feed.items)], [feeds, galicia])
}
