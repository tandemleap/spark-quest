import { redirect } from 'next/navigation'

// /leaderboard has been renamed to /progress-station
export default function LeaderboardRedirect() {
  redirect('/progress-station')
}
