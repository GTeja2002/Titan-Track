/* ---------------- components/CommunityPage.jsx ----------------
 * Challenges, feed and leaderboard. Behind the `competitions` feature flag
 * (see lib/features.js) — App renders a LockedFeature instead while it is off.
 *
 * This used to be hardcoded: invented users ("Sarah Connor", "Alex Mercer"),
 * fake like counts, a "Teja (You)" leaderboard row with made-up points and a
 * "Join Challenge" button with no handler. Every list here now comes from
 * props, and an empty list shows an honest empty state. When the backend for
 * challenges exists, pass its rows in; nothing in this file needs to change.
 */
import { Trophy, Users, MessageSquare } from 'lucide-react';

function EmptyPanel({ icon: Icon, title, body }) {
  return (
    <div className="panel-card rounded-[20px] p-6 text-center">
      <Icon size={22} className="mx-auto" style={{ color: 'var(--text-faint)' }} />
      <p className="mt-2 text-[13px] font-bold" style={{ color: 'var(--text)' }}>{title}</p>
      <p className="mt-1 text-[12px]" style={{ color: 'var(--text-dim)' }}>{body}</p>
    </div>
  );
}

export function CommunityPage({ challenges = [], feed = [], leaderboard = [], currentUserId = null }) {
  return (
    <div className="grid grid-cols-12 gap-5 animate-scale-in text-left">
      <div className="col-span-12 lg:col-span-8 space-y-5">
        <h3 className="text-lg font-black tracking-tight text-[var(--text)] mb-2">Community challenges & feed</h3>

        {challenges.length === 0 ? (
          <EmptyPanel icon={Trophy} title="No active challenges" body="New challenges will show up here." />
        ) : (
          challenges.map((c) => (
            <div key={c.id} className="panel-card rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary-soft px-2 py-0.5 rounded-full inline-block">Active Challenge</span>
                <h4 className="text-sm font-black text-[var(--text)]">{c.title}</h4>
                <p className="text-xs text-[var(--text-dim)] font-medium max-w-md">{c.description}</p>
              </div>
              {c.onJoin && (
                <button onClick={c.onJoin} className="py-2.5 px-4 rounded-xl bg-primary text-white font-bold text-xs hover:scale-105 transition">
                  {c.joined ? 'Joined' : 'Join Challenge'}
                </button>
              )}
            </div>
          ))
        )}

        {feed.length === 0 ? (
          <EmptyPanel icon={MessageSquare} title="Your feed is quiet" body="Posts from people you follow will appear here." />
        ) : (
          feed.map((post) => (
            <div key={post.id} className="glass rounded-3xl p-5 border border-white/5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
                  {(post.authorName || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-black text-[var(--text)]">{post.authorName}</p>
                  <p className="text-[9px] text-[var(--text-dim)] font-bold">{post.timeLabel}</p>
                </div>
              </div>
              <p className="text-xs text-[var(--text-dim)] font-semibold">{post.body}</p>
            </div>
          ))
        )}
      </div>

      <div className="col-span-12 lg:col-span-4 space-y-5">
        <h3 className="text-lg font-black tracking-tight text-[var(--text)] mb-2">Weekly Leaderboard</h3>
        {leaderboard.length === 0 ? (
          <EmptyPanel icon={Users} title="No rankings yet" body="Rankings appear once a challenge has participants." />
        ) : (
          <div className="glass rounded-3xl p-5 border border-white/5 shadow-sm space-y-3">
            {leaderboard.map((row, i) => {
              const isYou = currentUserId && row.userId === currentUserId;
              return (
                <div
                  key={row.userId}
                  className={`flex items-center justify-between p-3 rounded-2xl border ${isYou ? 'bg-primary-soft border-primary/20' : 'border-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black bg-white/10 text-[var(--text-dim)]">{i + 1}</span>
                    <span className="text-xs font-extrabold text-[var(--text)]">{row.name}{isYou ? ' (You)' : ''}</span>
                  </div>
                  <span className="text-[10px] font-black text-primary">{row.points.toLocaleString()} pts</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
