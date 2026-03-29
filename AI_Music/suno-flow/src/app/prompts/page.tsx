import { prisma } from "@/lib/db";
import Link from "next/link";
import { GENRE_CONFIG, type GenreKey } from "@/lib/constants";

export default async function PromptsPage() {
  const prompts = await prisma.prompt.findMany({
    orderBy: { createdAt: "desc" },
  });

  const templates = prompts.filter((p) => p.isTemplate);
  const userPrompts = prompts.filter((p) => !p.isTemplate);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Prompt Library</h1>
        <Link
          href="/prompts/generator"
          className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm transition-colors"
        >
          + New Prompt
        </Link>
      </div>

      {userPrompts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">My Prompts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userPrompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4">Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>
      </section>
    </div>
  );
}

function PromptCard({
  prompt,
}: {
  prompt: {
    id: string;
    name: string;
    genre: string;
    template: string;
    usageCount: number;
    favorite: boolean;
  };
}) {
  const genreConfig = GENRE_CONFIG[prompt.genre as GenreKey];
  return (
    <Link
      href={`/prompts/generator?from=${prompt.id}`}
      className="block bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--primary)] transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{genreConfig?.icon ?? "🎨"}</span>
          <h3 className="font-medium text-sm">{prompt.name}</h3>
        </div>
        {prompt.favorite && <span className="text-yellow-400 text-sm">★</span>}
      </div>
      <p className="text-xs text-[var(--muted)] mb-3 line-clamp-3 font-mono">
        {prompt.template}
      </p>
      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <span className="px-2 py-0.5 bg-[var(--background)] rounded">
          {genreConfig?.label ?? prompt.genre}
        </span>
        <span>Used {prompt.usageCount}x</span>
      </div>
    </Link>
  );
}
