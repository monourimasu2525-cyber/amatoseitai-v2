import { redirect } from 'next/navigation'

// LP実装はPhase 1後半。現在はloginへリダイレクト
export default function MarketingRootPage() {
  redirect('/login')
}
