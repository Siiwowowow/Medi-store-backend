import { prisma } from "../../lib/prisma";

const saveSearch = async (userId: string, query: string) => {
  if (!query || query.trim().length < 2) return;
  
  await prisma.searchHistory.create({
    data: {
      userId,
      query: query.trim().toLowerCase(),
    }
  });
  
  // Keep only last 50 searches
  const count = await prisma.searchHistory.count({ where: { userId } });
  if (count > 50) {
    const oldest = await prisma.searchHistory.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });
    if (oldest) {
      await prisma.searchHistory.delete({ where: { id: oldest.id } });
    }
  }
};

const getSearchHistory = async (userId: string, limit: number = 20) => {
  const history = await prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      query: true,
      createdAt: true,
    }
  });
  
  return history;
};

const clearSearchHistory = async (userId: string) => {
  await prisma.searchHistory.deleteMany({
    where: { userId }
  });
  return { message: "Search history cleared" };
};

const getPopularSearches = async (limit: number = 10) => {
  const popular = await prisma.$queryRaw`
    SELECT query, COUNT(*) as count
    FROM search_history
    GROUP BY query
    ORDER BY count DESC
    LIMIT ${limit}
  `;
  
  return popular;
};

export const SearchService = {
  saveSearch,
  getSearchHistory,
  clearSearchHistory,
  getPopularSearches,
};