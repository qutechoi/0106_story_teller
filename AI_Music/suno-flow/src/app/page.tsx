export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Tracks" value="0" icon="🎵" />
        <StatCard label="Videos Created" value="0" icon="🎬" />
        <StatCard label="Published" value="0" icon="🚀" />
        <StatCard label="Est. Revenue" value="$0" icon="💰" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickAction
              href="/prompts/generator"
              label="Generate New Prompt"
              description="AI 음악 프롬프트 빌더로 새 트랙 생성"
            />
            <QuickAction
              href="/tracks/upload"
              label="Upload Tracks"
              description="Suno에서 만든 트랙을 업로드"
            />
            <QuickAction
              href="/videos/create"
              label="Create Video"
              description="트랙으로 YouTube 플레이리스트 영상 제작"
            />
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <p className="text-[var(--muted)] text-sm">
            아직 활동이 없습니다. 첫 번째 프롬프트를 생성해보세요!
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[var(--muted)] text-sm">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="block p-3 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--card-hover)] transition-colors"
    >
      <p className="font-medium text-sm">{label}</p>
      <p className="text-xs text-[var(--muted)] mt-1">{description}</p>
    </a>
  );
}
