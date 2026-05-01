import { api } from "@/api/client";
import type { Association, NewsPost, NewsPostRequest } from "@/api/types";

export interface NewsFeedResponse {
  total: number;
  page: number;
  pageSize: number;
  items: NewsPost[];
}

export interface NewsFeedFilter {
  /** Specific association id to filter by, or "global" for posts without an association. */
  associationId?: string | "global" | null;
  page?: number;
  pageSize?: number;
}

function buildFeedQuery(filter: NewsFeedFilter | undefined): string {
  if (!filter) return "";
  const params = new URLSearchParams();
  if (filter.associationId === "global") params.set("global", "true");
  else if (filter.associationId) params.set("associationId", filter.associationId);
  if (filter.page) params.set("page", String(filter.page));
  if (filter.pageSize) params.set("pageSize", String(filter.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const newsApi = {
  listFeed: (filter?: NewsFeedFilter) =>
    api.get<NewsFeedResponse>(`/news${buildFeedQuery(filter)}`),
  listAdmin: () => api.get<NewsPost[]>("/news/admin"),
  create: (data: NewsPostRequest) => api.post<NewsPost>("/news", data),
  update: (id: string, data: Partial<NewsPostRequest>) =>
    api.patch<NewsPost>(`/news/${id}`, data),
  publish: (id: string) => api.post<NewsPost>(`/news/${id}/publish`),
  unpublish: (id: string) => api.post<NewsPost>(`/news/${id}/unpublish`),
  remove: (id: string) => api.delete<void>(`/news/${id}`),
  listAssociations: () => api.get<Association[]>("/associations"),
};
