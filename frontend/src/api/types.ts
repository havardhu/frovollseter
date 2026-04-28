export interface Association {
  id: string;
  name: string;
  type: "Hytteeierlag" | "Veglag" | "Grunneier";
}

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  role: "Member" | "Admin" | "SystemAdmin";
  status: "Pending" | "Active" | "Suspended";
  association: Association;
}

export type RoadStatus =
  | "Unknown"
  | "RecentlyPlowed"
  | "SummerTiresOk"
  | "FourWheelDriveRecommended"
  | "FloodDamage"
  | "UnsafeDangerous"
  | "Closed";

export interface RoadReport {
  id: string;
  status: RoadStatus;
  description: string | null;
  roadSegment: string | null;
  validUntil: string | null;
  createdAt: string;
  confirmedAt: string | null;
  isStale: boolean;
  reportedBy: { id: string; displayName: string };
  confirmedBy: { id: string; displayName: string } | null;
}

export interface NewsPost {
  id: string;
  title: string;
  body: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  author: { id: string; displayName: string };
  association: Association;
}

export type WebcamAccessLevel = "Public" | "Members" | "Private";
export type WebcamFeedType = "StaticImage" | "VideoFeed";

export interface WebcamStream {
  id: string;
  title: string;
  description: string | null;
  locationHint: string | null;
  accessLevel: WebcamAccessLevel;
  feedType: WebcamFeedType;
  sourceUrl: string;
  lastImageUrl: string | null;
  lastImageAt: string | null;
  createdAt: string;
  owner: { id: string; displayName: string };
}

export interface WebcamRequest {
  title: string;
  description: string | null;
  locationHint: string | null;
  accessLevel: WebcamAccessLevel;
  feedType: WebcamFeedType;
  sourceUrl: string;
}

export interface UsefulLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string | null;
  sortOrder: number;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  role: "Member" | "Admin" | "SystemAdmin";
  status: "Pending" | "Active" | "Suspended";
  createdAt: string;
  lastLoginAt: string | null;
  association: { id: string; name: string } | null;
}

export interface AdminAssociation {
  id: string;
  name: string;
  type: "Hytteeierlag" | "Veglag" | "Grunneier";
  memberCount: number;
}

export interface MassInvite {
  id: string;
  expiresAt: string;
  createdAt: string;
  redemptionCount: number;
  note: string | null;
  isExpired: boolean;
  association: { id: string; name: string };
  createdBy: { id: string; displayName: string };
}

export interface MassInviteCreated extends MassInvite {
  token: string;
  url: string;
}

export interface MassInviteLookup {
  expiresAt: string;
  association: {
    id: string;
    name: string;
    type: "Hytteeierlag" | "Veglag" | "Grunneier";
  };
}
