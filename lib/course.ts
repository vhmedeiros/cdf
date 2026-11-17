export function getDeterministicGradient(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }

  const gradients = [
    "from-[#1b1b1e] via-[#2a2a2e] to-[#0b0b0c]",
    "from-[#24211a] via-[#1b1b1e] to-[#0b0b0c]",
    "from-[#1f1a14] via-[#2a2216] to-[#0b0b0c]",
    "from-[#181d18] via-[#152016] to-[#0b0b0c]",
    "from-[#261f2d] via-[#1d1724] to-[#0b0b0c]",
  ];

  return gradients[Math.abs(hash) % gradients.length];
}
