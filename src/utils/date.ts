import { format, formatDistanceToNow } from 'date-fns'

// yyyy-MM-dd
export const formatDate = (date: Date) => format(date, 'yyyy-MM-dd')

export const humanize = (date: Date) => formatDistanceToNow(date, { addSuffix: true })
