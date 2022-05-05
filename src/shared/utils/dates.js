import { format, formatDistanceToNow, fromUnixTime, parseISO } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import { useMemo } from 'react'

export function useDateFormatted(date, formatDescription = 'MMMM do yyyy') {
  return useMemo(() => {
    if (!date) return null
    const parser = typeof date === 'string' ? parseISO : fromUnixTime
    return format(parser(date), formatDescription)
  }, [date, formatDescription])
}

export function formatTimeToNow(date) {
  if (!date) return null

  const parser = typeof date === 'number' ? fromUnixTime : parseISO

  return formatDistanceToNow(utcToZonedTime(parser(date), 'UTC'), {
    addSuffix: true,
  })
}
