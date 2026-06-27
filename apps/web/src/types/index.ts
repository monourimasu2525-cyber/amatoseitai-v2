export interface Sale {
  id: number
  date: string
  time: string
  type: string
  amount: number
}

export interface MasterItem {
  id: number
  user_id: number
  type: string
  amount: number
  description: string
  is_active: boolean
}

export interface MonthStats {
  totalSales: number
  totalCount: number
  shinkiSales: number
  shinkiCount: number
  jorenSales: number
  jorenCount: number
  otherSales: number
  otherCount: number
}

export interface TodayStats extends MonthStats {
  date: string
}

export interface DayBreakdown {
  day: number
  total: number
  shinki: number
  joren: number
  other: number
  count: number
}

export interface InitData {
  todayStats: TodayStats
  thisMonth: MonthStats
  prevMonth: MonthStats
  master: MasterItem[]
  history: { records: Sale[] }
}

export interface ApiResponse {
  success: boolean
  message: string
}
